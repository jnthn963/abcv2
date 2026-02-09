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

    const { principal, collateral_amount, duration_days, interest_rate } = await req.json();

    // Validate inputs
    if (!principal || principal <= 0) {
      return new Response(JSON.stringify({ error: "Invalid principal amount" }), { status: 400, headers: corsHeaders });
    }
    if (!collateral_amount || collateral_amount < 0) {
      return new Response(JSON.stringify({ error: "Invalid collateral amount" }), { status: 400, headers: corsHeaders });
    }
    if (!duration_days || duration_days < 7 || duration_days > 365) {
      return new Response(JSON.stringify({ error: "Duration must be between 7 and 365 days" }), { status: 400, headers: corsHeaders });
    }

    // Get user profile
    const { data: profile, error: profErr } = await admin.from("profiles")
      .select("vault_balance, frozen_balance, created_at")
      .eq("user_id", user.id)
      .single();

    if (profErr || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), { status: 404, headers: corsHeaders });
    }

    // Check account age (min 6 days)
    const accountAge = (Date.now() - new Date(profile.created_at).getTime()) / 86400000;
    const { data: minAgeSetting } = await admin.from("settings").select("value").eq("key", "min_account_age_days").maybeSingle();
    const minAge = minAgeSetting ? parseFloat(minAgeSetting.value) : 6;
    if (accountAge < minAge) {
      return new Response(JSON.stringify({ error: `Account must be at least ${minAge} days old` }), { status: 400, headers: corsHeaders });
    }

    // Check max loan ratio (50% of vault balance)
    const { data: ratioSetting } = await admin.from("settings").select("value").eq("key", "max_loan_ratio").maybeSingle();
    const maxRatio = ratioSetting ? parseFloat(ratioSetting.value) / 100 : 0.5;
    if (principal > profile.vault_balance * maxRatio) {
      return new Response(JSON.stringify({ error: `Loan cannot exceed ${maxRatio * 100}% of vault balance` }), { status: 400, headers: corsHeaders });
    }

    // Check collateral availability
    const availableForCollateral = profile.vault_balance - profile.frozen_balance;
    if (collateral_amount > availableForCollateral) {
      return new Response(JSON.stringify({ error: "Insufficient available balance for collateral" }), { status: 400, headers: corsHeaders });
    }

    // Use configured interest rate or provided one
    const { data: rateSetting } = await admin.from("settings").select("value").eq("key", "base_interest_rate").maybeSingle();
    const finalRate = interest_rate || (rateSetting ? parseFloat(rateSetting.value) : 12);

    // Lock collateral
    if (collateral_amount > 0) {
      await admin.from("profiles").update({
        vault_balance: profile.vault_balance - collateral_amount,
        frozen_balance: profile.frozen_balance + collateral_amount,
      }).eq("user_id", user.id);

      // Ledger entry for collateral lock
      await admin.from("ledger").insert({
        user_id: user.id,
        type: "collateral_lock",
        amount: -collateral_amount,
        description: `Collateral locked for loan request`,
      });
    }

    // Create loan
    const { data: loan, error: loanErr } = await admin.from("loans").insert({
      borrower_id: user.id,
      principal,
      interest_rate: finalRate,
      duration_days,
      collateral_amount: collateral_amount || 0,
      status: "pending",
    }).select("id").single();

    if (loanErr) throw loanErr;

    return new Response(JSON.stringify({ success: true, loanId: loan.id }), { headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
