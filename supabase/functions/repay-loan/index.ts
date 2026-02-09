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

    // Get loan - must be approved (active) and belong to this borrower
    const { data: loan, error: loanErr } = await admin.from("loans")
      .select("*")
      .eq("id", loanId)
      .eq("status", "approved")
      .eq("borrower_id", user.id)
      .single();

    if (loanErr || !loan) {
      return new Response(JSON.stringify({ error: "Active loan not found or not yours" }), { status: 404, headers: corsHeaders });
    }

    // Calculate interest based on days elapsed
    const loanStart = new Date(loan.created_at).getTime();
    const now = Date.now();
    const daysElapsed = Math.max(1, Math.ceil((now - loanStart) / 86400000));
    const interest = loan.principal * (loan.interest_rate / 100) * (daysElapsed / 365);
    const totalOwed = loan.principal + interest;

    // Get borrower profile
    const { data: borrowerProfile } = await admin.from("profiles")
      .select("vault_balance, frozen_balance")
      .eq("user_id", user.id)
      .single();

    if (!borrowerProfile || borrowerProfile.vault_balance < totalOwed) {
      return new Response(JSON.stringify({ 
        error: "Insufficient vault balance", 
        totalOwed: Math.round(totalOwed * 100) / 100,
        interest: Math.round(interest * 100) / 100,
        daysElapsed 
      }), { status: 400, headers: corsHeaders });
    }

    // Get lender share setting
    const { data: shareSetting } = await admin.from("settings").select("value").eq("key", "lender_share_pct").maybeSingle();
    const lenderSharePct = shareSetting ? parseFloat(shareSetting.value) / 100 : 0.8;
    const lenderInterest = interest * lenderSharePct;
    const systemInterest = interest - lenderInterest;

    // Deduct total from borrower vault
    await admin.from("profiles").update({
      vault_balance: borrowerProfile.vault_balance - totalOwed,
      frozen_balance: Math.max(0, borrowerProfile.frozen_balance - loan.collateral_amount),
    }).eq("user_id", user.id);

    // If there's a lender, credit them
    if (loan.lender_id) {
      const { data: lenderProfile } = await admin.from("profiles")
        .select("vault_balance, lending_balance")
        .eq("user_id", loan.lender_id)
        .single();

      if (lenderProfile) {
        await admin.from("profiles").update({
          vault_balance: lenderProfile.vault_balance + loan.principal + lenderInterest,
          lending_balance: Math.max(0, lenderProfile.lending_balance - loan.principal),
        }).eq("user_id", loan.lender_id);

        // Lender ledger entries
        await admin.from("ledger").insert({
          user_id: loan.lender_id,
          type: "loan_repayment_received",
          amount: loan.principal,
          description: `Loan principal returned`,
          reference_id: loanId,
        });

        if (lenderInterest > 0) {
          await admin.from("ledger").insert({
            user_id: loan.lender_id,
            type: "interest",
            amount: lenderInterest,
            description: `Interest earned (${daysElapsed} days)`,
            reference_id: loanId,
          });
        }
      }
    }

    // Update loan status
    await admin.from("loans").update({ status: "completed" }).eq("id", loanId);

    // Borrower ledger entries
    await admin.from("ledger").insert({
      user_id: user.id,
      type: "loan_repayment",
      amount: -totalOwed,
      description: `Loan repaid (₳${loan.principal.toFixed(2)} + ₳${interest.toFixed(2)} interest, ${daysElapsed}d)`,
      reference_id: loanId,
    });

    // Collateral release ledger
    if (loan.collateral_amount > 0) {
      await admin.from("ledger").insert({
        user_id: user.id,
        type: "collateral_release",
        amount: loan.collateral_amount,
        description: `Collateral released after loan repayment`,
        reference_id: loanId,
      });
    }

    // System income from interest spread
    if (systemInterest > 0) {
      await admin.from("admin_income_ledger").insert({
        type: "interest_spread",
        amount: systemInterest,
        description: `Interest spread from loan repayment ${loanId.substring(0, 8)}`,
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      interest: Math.round(interest * 100) / 100,
      totalOwed: Math.round(totalOwed * 100) / 100,
      daysElapsed,
    }), { headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
