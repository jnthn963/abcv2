import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Verify governor role
    const { data: roleData } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "governor").maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    // Rate limit: 60 requests per 60 seconds for governors
    const { data: allowed } = await admin.rpc("check_rate_limit", {
      p_user_id: user.id,
      p_endpoint: "governor-distribute-profits",
      p_max_requests: 60,
      p_window_seconds: 60,
    });
    if (allowed === false) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), { status: 429, headers: corsHeaders });
    }

    // Check system freeze
    const { data: freezeSetting } = await admin.from("settings").select("value").eq("key", "system_frozen").maybeSingle();
    if (freezeSetting?.value === "true") {
      return new Response(JSON.stringify({ error: "System is currently frozen. Cannot distribute profits." }), { status: 403, headers: corsHeaders });
    }

    const { year } = await req.json();

    if (!year || typeof year !== "number" || year < 2020 || year > 2100) {
      return new Response(JSON.stringify({ error: "Invalid year" }), { status: 400, headers: corsHeaders });
    }

    // Calculate total system profit from admin_income_ledger
    const { data: income, error: incomeErr } = await admin.from("admin_income_ledger").select("amount");
    if (incomeErr) throw incomeErr;

    const totalProfit = (income || []).reduce((sum: number, r: { amount: number }) => sum + r.amount, 0);

    if (totalProfit <= 0) {
      return new Response(JSON.stringify({ error: "No profit available to distribute" }), { status: 400, headers: corsHeaders });
    }

    // Atomic distribution via RPC
    const { data: result, error: rpcErr } = await admin.rpc("atomic_distribute_profits", {
      p_year: year,
      p_total_profit: totalProfit,
    });

    if (rpcErr) throw rpcErr;
    if (result?.error) {
      return new Response(JSON.stringify({ error: result.error }), { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify({
      success: true,
      totalProfit,
      distributed: result.distributed,
      members: result.members,
    }), { headers: corsHeaders });
  } catch (e: any) {
    console.error('governor-distribute-profits error:', { error: e?.message, stack: e?.stack, timestamp: new Date().toISOString() });
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
