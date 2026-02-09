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

    const { data: roleData } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "governor").maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    const { withdrawalId, action, rejectionReason } = await req.json();
    if (!withdrawalId || !["approved", "rejected"].includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid params" }), { status: 400, headers: corsHeaders });
    }

    const { data: withdrawal, error: wErr } = await admin.from("withdrawals").select("*").eq("id", withdrawalId).eq("status", "pending").single();
    if (wErr || !withdrawal) {
      return new Response(JSON.stringify({ error: "Withdrawal not found or not pending" }), { status: 404, headers: corsHeaders });
    }

    if (action === "rejected") {
      await admin.from("withdrawals").update({ status: "rejected", rejection_reason: rejectionReason || null }).eq("id", withdrawalId);
      return new Response(JSON.stringify({ success: true, action: "rejected" }), { headers: corsHeaders });
    }

    const totalDeduction = withdrawal.amount + withdrawal.fee;

    // Check balance
    const { data: profile } = await admin.from("profiles").select("vault_balance").eq("user_id", withdrawal.user_id).single();
    if (!profile || profile.vault_balance < totalDeduction) {
      return new Response(JSON.stringify({ error: "Insufficient balance" }), { status: 400, headers: corsHeaders });
    }

    // Update withdrawal status
    await admin.from("withdrawals").update({ status: "approved" }).eq("id", withdrawalId);

    // Deduct vault balance
    await admin.from("profiles").update({ vault_balance: profile.vault_balance - totalDeduction }).eq("user_id", withdrawal.user_id);

    // Ledger entry for withdrawal
    await admin.from("ledger").insert({
      user_id: withdrawal.user_id,
      type: "withdrawal",
      amount: -withdrawal.amount,
      description: `Withdrawal to ${withdrawal.bank_name} ****${withdrawal.account_number.slice(-4)}`,
      reference_id: withdrawalId,
    });

    // Ledger entry for fee
    if (withdrawal.fee > 0) {
      await admin.from("ledger").insert({
        user_id: withdrawal.user_id,
        type: "withdrawal_fee",
        amount: -withdrawal.fee,
        description: `Withdrawal processing fee`,
        reference_id: withdrawalId,
      });

      await admin.from("admin_income_ledger").insert({
        type: "withdrawal_fee",
        amount: withdrawal.fee,
        description: `Withdrawal fee from ${withdrawal.user_id.substring(0, 8)}`,
      });
    }

    return new Response(JSON.stringify({ success: true, action: "approved", totalDeduction }), { headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
