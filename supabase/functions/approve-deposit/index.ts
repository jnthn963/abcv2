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

    // User client for auth check
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    // Admin client for privileged operations
    const admin = createClient(supabaseUrl, serviceKey);

    // Verify governor role
    const { data: roleData } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "governor").maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    const { depositId, action, rejectionReason } = await req.json();
    if (!depositId || !["approved", "rejected"].includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid params" }), { status: 400, headers: corsHeaders });
    }

    // Get deposit
    const { data: deposit, error: depErr } = await admin.from("deposits").select("*").eq("id", depositId).eq("status", "pending").single();
    if (depErr || !deposit) {
      return new Response(JSON.stringify({ error: "Deposit not found or not pending" }), { status: 404, headers: corsHeaders });
    }

    if (action === "rejected") {
      await admin.from("deposits").update({ status: "rejected" }).eq("id", depositId);
      return new Response(JSON.stringify({ success: true, action: "rejected" }), { headers: corsHeaders });
    }

    // Approved: get settings for deposit fee
    const { data: feeSetting } = await admin.from("settings").select("value").eq("key", "deposit_fee_pct").single();
    const feePct = feeSetting ? parseFloat(feeSetting.value) : 0;
    const fee = deposit.amount * (feePct / 100);
    const netAmount = deposit.amount - fee;

    // Update deposit status
    await admin.from("deposits").update({ status: "approved" }).eq("id", depositId);

    // Update user vault balance
    const { data: profile } = await admin.from("profiles").select("vault_balance").eq("user_id", deposit.user_id).single();
    const newBalance = (profile?.vault_balance || 0) + netAmount;
    await admin.from("profiles").update({ vault_balance: newBalance }).eq("user_id", deposit.user_id);

    // Record ledger entry
    await admin.from("ledger").insert({
      user_id: deposit.user_id,
      type: "deposit",
      amount: netAmount,
      description: `Deposit approved (₳${deposit.amount} - ${feePct}% fee)`,
      reference_id: depositId,
    });

    // Record admin income from fee
    if (fee > 0) {
      await admin.from("admin_income_ledger").insert({
        type: "deposit_fee",
        amount: fee,
        description: `Deposit fee from ${deposit.user_id.substring(0, 8)}`,
      });

      // Distribute referral commissions from fee pool
      await distributeReferralCommissions(admin, deposit.user_id, fee);
    }

    return new Response(JSON.stringify({ success: true, action: "approved", netAmount, fee }), { headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: corsHeaders });
  }
});

async function distributeReferralCommissions(admin: any, userId: string, feePool: number) {
  // Get referral chain (up to 3 levels)
  const { data: referrals } = await admin.from("referrals").select("user_id, level").eq("referred_user_id", userId).order("level");
  if (!referrals || referrals.length === 0) return;

  const commissionRates = [0.05, 0.03, 0.01]; // Level 1: 5%, Level 2: 3%, Level 3: 1%

  for (const ref of referrals) {
    if (ref.level < 1 || ref.level > 3) continue;
    const rate = commissionRates[ref.level - 1];
    const commission = feePool * rate;
    if (commission <= 0) continue;

    // Update referrer vault balance
    const { data: refProfile } = await admin.from("profiles").select("vault_balance").eq("user_id", ref.user_id).single();
    if (refProfile) {
      await admin.from("profiles").update({ vault_balance: refProfile.vault_balance + commission }).eq("user_id", ref.user_id);
      await admin.from("ledger").insert({
        user_id: ref.user_id,
        type: "referral",
        amount: commission,
        description: `Referral commission (Level ${ref.level})`,
      });
    }
  }
}
