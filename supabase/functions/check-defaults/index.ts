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

    // Find overdue approved loans (past duration + 7 day grace period)
    const { data: loans } = await admin.from("loans").select("*").eq("status", "approved");

    if (!loans || loans.length === 0) {
      return new Response(JSON.stringify({ message: "No loans to check", defaults: 0 }), { headers: corsHeaders });
    }

    const now = new Date();
    const GRACE_DAYS = 7;
    let defaults = 0;

    for (const loan of loans) {
      const loanStart = new Date(loan.created_at);
      const deadline = new Date(loanStart.getTime() + (loan.duration_days + GRACE_DAYS) * 86400000);

      if (now < deadline) continue;

      // Loan is defaulted
      // Seize collateral: transfer from borrower frozen to lender vault
      if (loan.collateral_amount > 0 && loan.lender_id) {
        const { data: borrowerProfile } = await admin.from("profiles")
          .select("frozen_balance").eq("user_id", loan.borrower_id).single();

        if (borrowerProfile) {
          await admin.from("profiles").update({
            frozen_balance: Math.max(0, borrowerProfile.frozen_balance - loan.collateral_amount),
          }).eq("user_id", loan.borrower_id);
        }

        const { data: lenderProfile } = await admin.from("profiles")
          .select("vault_balance, lending_balance").eq("user_id", loan.lender_id).single();

        if (lenderProfile) {
          await admin.from("profiles").update({
            vault_balance: lenderProfile.vault_balance + loan.collateral_amount,
            lending_balance: Math.max(0, lenderProfile.lending_balance - loan.principal),
          }).eq("user_id", loan.lender_id);

          await admin.from("ledger").insert({
            user_id: loan.lender_id,
            type: "default_recovery",
            amount: loan.collateral_amount,
            description: `Collateral seized from defaulted loan`,
            reference_id: loan.id,
          });
        }

        await admin.from("ledger").insert({
          user_id: loan.borrower_id,
          type: "default",
          amount: -loan.collateral_amount,
          description: `Collateral seized - loan default`,
          reference_id: loan.id,
        });
      }

      await admin.from("loans").update({ status: "defaulted" }).eq("id", loan.id);

      // Record admin alert
      await admin.from("admin_income_ledger").insert({
        type: "default_alert",
        amount: 0,
        description: `Loan ${loan.id.substring(0, 8)} defaulted. Borrower: ${loan.borrower_id.substring(0, 8)}`,
      });

      defaults++;
    }

    return new Response(JSON.stringify({ message: "Default check complete", defaults }), { headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
