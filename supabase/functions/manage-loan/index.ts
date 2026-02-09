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

    const { loanId, action, rejectionReason } = await req.json();
    if (!loanId || !["approved", "rejected"].includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid params" }), { status: 400, headers: corsHeaders });
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

    if (action === "rejected") {
      await admin.from("loans").update({ status: "rejected" }).eq("id", loanId);

      // Release collateral back to borrower if any was locked
      if (loan.collateral_amount > 0) {
        const { data: borrowerProfile } = await admin.from("profiles")
          .select("vault_balance, frozen_balance")
          .eq("user_id", loan.borrower_id)
          .single();

        if (borrowerProfile) {
          await admin.from("profiles").update({
            vault_balance: borrowerProfile.vault_balance + loan.collateral_amount,
            frozen_balance: Math.max(0, borrowerProfile.frozen_balance - loan.collateral_amount),
          }).eq("user_id", loan.borrower_id);

          await admin.from("ledger").insert({
            user_id: loan.borrower_id,
            type: "collateral_release",
            amount: loan.collateral_amount,
            description: `Collateral released - loan rejected${rejectionReason ? ': ' + rejectionReason : ''}`,
            reference_id: loanId,
          });
        }
      }

      return new Response(JSON.stringify({ success: true, action: "rejected" }), { headers: corsHeaders });
    }

    // Approved: loan goes to marketplace for lenders to fund
    // The loan stays in "pending" state in the marketplace until a lender funds it via fund-loan
    // Governor approval just validates the loan request is legitimate
    await admin.from("loans").update({ status: "pending" }).eq("id", loanId);

    return new Response(JSON.stringify({ success: true, action: "approved" }), { headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
