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

    const { depositId, action } = await req.json();
    if (!depositId || !["approved", "rejected"].includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid params" }), { status: 400, headers: corsHeaders });
    }

    if (action === "rejected") {
      await admin.from("deposits").update({ status: "rejected" }).eq("id", depositId);
      return new Response(JSON.stringify({ success: true, action: "rejected" }), { headers: corsHeaders });
    }

    // Get fee setting
    const { data: feeSetting } = await admin.from("settings").select("value").eq("key", "deposit_fee_pct").single();
    const feePct = feeSetting ? parseFloat(feeSetting.value) : 0;

    // Atomic deposit approval via RPC
    const { data: result, error: rpcErr } = await admin.rpc("atomic_approve_deposit", {
      p_deposit_id: depositId,
      p_fee_pct: feePct,
    });

    if (rpcErr) throw rpcErr;
    if (result?.error) {
      return new Response(JSON.stringify({ error: result.error }), { status: 400, headers: corsHeaders });
    }

    // Distribute referral commissions from fee pool (atomic per referrer)
    if (result.fee > 0) {
      await distributeReferralCommissions(admin, result.user_id, result.fee);
    }

    return new Response(JSON.stringify({ success: true, action: "approved", netAmount: result.net_amount, fee: result.fee }), { headers: corsHeaders });
  } catch (e: any) {
    console.error('approve-deposit error:', { error: e?.message, stack: e?.stack, timestamp: new Date().toISOString() });
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: corsHeaders });
  }
});

async function distributeReferralCommissions(admin: any, userId: string, feePool: number) {
  const { data: referrals } = await admin.from("referrals").select("user_id, level").eq("referred_user_id", userId).order("level");
  if (!referrals || referrals.length === 0) return;

  const commissionRates = [0.05, 0.03, 0.01];

  for (const ref of referrals) {
    if (ref.level < 1 || ref.level > 3) continue;
    const rate = commissionRates[ref.level - 1];
    const commission = feePool * rate;
    if (commission <= 0) continue;

    // Atomic referral commission via RPC
    await admin.rpc("atomic_referral_commission", {
      p_user_id: ref.user_id,
      p_amount: commission,
      p_level: ref.level,
    });
  }
}
