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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Auth check: require CRON_SECRET only — no manual triggering allowed
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), { status: 401, headers: corsHeaders });
    }

    const token = authHeader.replace("Bearer ", "");
    const cronSecret = Deno.env.get("CRON_SECRET");

    if (!cronSecret) {
      console.error("CRON_SECRET not configured");
      return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500, headers: corsHeaders });
    }

    if (token !== cronSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    // Check system freeze
    const { data: freezeSetting } = await admin.from("settings").select("value").eq("key", "system_frozen").maybeSingle();
    if (freezeSetting?.value === "true") {
      return new Response(JSON.stringify({ message: "System is frozen, skipping collateral release" }), { headers: corsHeaders });
    }

    const { data: loans } = await admin.from("loans").select("*").eq("status", "approved");

    if (!loans || loans.length === 0) {
      return new Response(JSON.stringify({ message: "No loans to check", released: 0 }), { headers: corsHeaders });
    }

    const now = new Date();
    let released = 0;

    for (const loan of loans) {
      const loanStart = new Date(loan.created_at);
      const loanEnd = new Date(loanStart.getTime() + loan.duration_days * 86400000);

      if (now < loanEnd) continue;
      if (loan.collateral_amount <= 0) continue;

      // Atomic collateral release via RPC
      const { error: rpcErr } = await admin.rpc("atomic_release_collateral", {
        p_loan_id: loan.id,
      });

      if (!rpcErr) released++;
    }

    return new Response(JSON.stringify({ message: "Collateral check complete", released }), { headers: corsHeaders });
  } catch (e: any) {
    console.error('release-collateral error:', { error: e?.message, stack: e?.stack, timestamp: new Date().toISOString() });
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
