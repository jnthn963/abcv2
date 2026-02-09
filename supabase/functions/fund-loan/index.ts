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

    // Check system freeze
    const { data: freezeSetting } = await admin.from("settings").select("value").eq("key", "system_frozen").maybeSingle();
    if (freezeSetting?.value === "true") {
      return new Response(JSON.stringify({ error: "System is currently frozen. All financial operations are paused." }), { status: 403, headers: corsHeaders });
    }

    const { loanId } = await req.json();

    if (!loanId) {
      return new Response(JSON.stringify({ error: "Missing loanId" }), { status: 400, headers: corsHeaders });
    }

    // Atomic fund loan via RPC
    const { data: result, error: rpcErr } = await admin.rpc("atomic_fund_loan", {
      p_loan_id: loanId,
      p_lender_id: user.id,
    });

    if (rpcErr) throw rpcErr;
    if (result?.error) {
      return new Response(JSON.stringify({ error: result.error }), { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (e: any) {
    console.error('fund-loan error:', { error: e?.message, stack: e?.stack, timestamp: new Date().toISOString() });
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
