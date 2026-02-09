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

    // Get settings
    const { data: settings } = await admin.from("settings").select("key, value");
    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: any) => { settingsMap[s.key] = s.value; });

    const baseRate = parseFloat(settingsMap["base_interest_rate"] || "12") / 100;
    const lenderSharePct = parseFloat(settingsMap["lender_share_pct"] || "70") / 100;
    const dailyRate = baseRate / 365;

    // Get all active (approved) loans with lenders
    const { data: activeLoans } = await admin.from("loans").select("*").eq("status", "approved").not("lender_id", "is", null);

    if (!activeLoans || activeLoans.length === 0) {
      return new Response(JSON.stringify({ message: "No active loans to process", processed: 0 }), { headers: corsHeaders });
    }

    let processed = 0;

    for (const loan of activeLoans) {
      const dailyInterest = loan.principal * dailyRate;
      const lenderShare = dailyInterest * lenderSharePct;
      const systemShare = dailyInterest - lenderShare;

      // Credit lender
      if (loan.lender_id) {
        const { data: lenderProfile } = await admin.from("profiles").select("lending_balance").eq("user_id", loan.lender_id).single();
        if (lenderProfile) {
          await admin.from("profiles").update({
            lending_balance: lenderProfile.lending_balance + lenderShare,
          }).eq("user_id", loan.lender_id);

          await admin.from("ledger").insert({
            user_id: loan.lender_id,
            type: "interest",
            amount: lenderShare,
            description: `Daily lending interest`,
            reference_id: loan.id,
          });
        }
      }

      // Record system income
      if (systemShare > 0) {
        await admin.from("admin_income_ledger").insert({
          type: "interest_spread",
          amount: systemShare,
          description: `Interest spread from loan ${loan.id.substring(0, 8)}`,
        });
      }

      processed++;
    }

    return new Response(JSON.stringify({ message: "Interest distributed", processed }), { headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
