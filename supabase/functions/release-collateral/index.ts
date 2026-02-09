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

    // Find loans that are approved, have collateral, and whose term has ended
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

      // Release collateral: move from frozen to vault
      const { data: profile } = await admin.from("profiles")
        .select("vault_balance, frozen_balance")
        .eq("user_id", loan.borrower_id)
        .single();

      if (profile) {
        await admin.from("profiles").update({
          vault_balance: profile.vault_balance + loan.collateral_amount,
          frozen_balance: Math.max(0, profile.frozen_balance - loan.collateral_amount),
        }).eq("user_id", loan.borrower_id);

        await admin.from("ledger").insert({
          user_id: loan.borrower_id,
          type: "collateral_release",
          amount: loan.collateral_amount,
          description: `Collateral released for completed loan`,
          reference_id: loan.id,
        });
      }

      // Mark loan as completed
      await admin.from("loans").update({ status: "completed" }).eq("id", loan.id);
      released++;
    }

    return new Response(JSON.stringify({ message: "Collateral check complete", released }), { headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
