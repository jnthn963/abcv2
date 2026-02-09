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

    // Get settings
    const { data: settings } = await admin.from("settings").select("key, value");
    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: any) => { settingsMap[s.key] = s.value; });

    // Check system freeze
    if (settingsMap["system_frozen"] === "true") {
      return new Response(JSON.stringify({ message: "System is frozen, skipping interest distribution" }), { headers: corsHeaders });
    }

    const baseRate = parseFloat(settingsMap["base_interest_rate"] || "12") / 100;
    const lenderSharePct = parseFloat(settingsMap["lender_share_pct"] || "70") / 100;
    const dailyRate = baseRate / 365;

    const { data: activeLoans } = await admin.from("loans").select("*").eq("status", "approved").not("lender_id", "is", null);

    if (!activeLoans || activeLoans.length === 0) {
      return new Response(JSON.stringify({ message: "No active loans to process", processed: 0 }), { headers: corsHeaders });
    }

    let processed = 0;

    for (const loan of activeLoans) {
      const dailyInterest = loan.principal * dailyRate;
      const lenderShare = dailyInterest * lenderSharePct;
      const systemShare = dailyInterest - lenderShare;

      // Atomic daily interest via RPC
      const { error: rpcErr } = await admin.rpc("atomic_daily_interest", {
        p_loan_id: loan.id,
        p_lender_share: lenderShare,
        p_system_share: systemShare,
      });

      if (!rpcErr) processed++;
    }

    return new Response(JSON.stringify({ message: "Interest distributed", processed }), { headers: corsHeaders });
  } catch (e: any) {
    console.error('daily-interest error:', { error: e?.message, stack: e?.stack, timestamp: new Date().toISOString() });
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
