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

    // Get loan
    const { data: loan, error: loanErr } = await admin.from("loans")
      .select("*")
      .eq("id", loanId)
      .eq("status", "pending")
      .single();

    if (loanErr || !loan) {
      return new Response(JSON.stringify({ error: "Loan not found or not pending" }), { status: 404, headers: corsHeaders });
    }

    // Cannot fund own loan
    if (loan.borrower_id === user.id) {
      return new Response(JSON.stringify({ error: "Cannot fund your own loan" }), { status: 400, headers: corsHeaders });
    }

    // Get lender profile
    const { data: lenderProfile } = await admin.from("profiles")
      .select("vault_balance, lending_balance")
      .eq("user_id", user.id)
      .single();

    if (!lenderProfile || lenderProfile.vault_balance < loan.principal) {
      return new Response(JSON.stringify({ error: "Insufficient vault balance to fund this loan" }), { status: 400, headers: corsHeaders });
    }

    // Deduct from lender vault, add to lending balance
    await admin.from("profiles").update({
      vault_balance: lenderProfile.vault_balance - loan.principal,
      lending_balance: lenderProfile.lending_balance + loan.principal,
    }).eq("user_id", user.id);

    // Credit borrower vault balance with principal
    const { data: borrowerProfile } = await admin.from("profiles")
      .select("vault_balance")
      .eq("user_id", loan.borrower_id)
      .single();

    if (borrowerProfile) {
      await admin.from("profiles").update({
        vault_balance: borrowerProfile.vault_balance + loan.principal,
      }).eq("user_id", loan.borrower_id);
    }

    // Update loan status to approved with lender
    await admin.from("loans").update({
      status: "approved",
      lender_id: user.id,
    }).eq("id", loanId);

    // Ledger entries
    await admin.from("ledger").insert({
      user_id: user.id,
      type: "loan_funding",
      amount: -loan.principal,
      description: `Funded loan for M-${loan.borrower_id.substring(0, 4).toUpperCase()}`,
      reference_id: loanId,
    });

    await admin.from("ledger").insert({
      user_id: loan.borrower_id,
      type: "loan_received",
      amount: loan.principal,
      description: `Loan funded by lender`,
      reference_id: loanId,
    });

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
