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
    const { loanId } = await req.json();

    if (!loanId) {
      return new Response(JSON.stringify({ error: "Missing loanId" }), { status: 400, headers: corsHeaders });
    }

    // Get lender share setting
    const { data: shareSetting } = await admin.from("settings").select("value").eq("key", "lender_share_pct").maybeSingle();
    const lenderSharePct = shareSetting ? parseFloat(shareSetting.value) : 70;

    // Atomic repay loan via RPC
    const { data: result, error: rpcErr } = await admin.rpc("atomic_repay_loan", {
      p_loan_id: loanId,
      p_borrower_id: user.id,
      p_lender_share_pct: lenderSharePct,
    });

    if (rpcErr) throw rpcErr;
    if (result?.error) {
      return new Response(JSON.stringify({ error: result.error, totalOwed: result.total_owed }), { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      interest: result.interest,
      totalOwed: result.total_owed,
      daysElapsed: result.days_elapsed,
    }), { headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
