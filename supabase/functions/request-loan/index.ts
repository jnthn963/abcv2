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

    // Rate limit: 10 requests per 60 seconds for regular users
    const { data: allowed } = await admin.rpc("check_rate_limit", {
      p_user_id: user.id,
      p_endpoint: "request-loan",
      p_max_requests: 10,
      p_window_seconds: 60,
    });
    if (allowed === false) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), { status: 429, headers: corsHeaders });
    }

    // Check system freeze
    const { data: freezeSetting } = await admin.from("settings").select("value").eq("key", "system_frozen").maybeSingle();
    if (freezeSetting?.value === "true") {
      return new Response(JSON.stringify({ error: "System is currently frozen. All financial operations are paused." }), { status: 403, headers: corsHeaders });
    }

    const { principal, collateral_amount, duration_days, interest_rate } = await req.json();

    // Validate inputs
    if (!principal || principal <= 0) {
      return new Response(JSON.stringify({ error: "Invalid principal amount" }), { status: 400, headers: corsHeaders });
    }
    if (collateral_amount === undefined || collateral_amount < 0) {
      return new Response(JSON.stringify({ error: "Invalid collateral amount" }), { status: 400, headers: corsHeaders });
    }
    if (!duration_days || duration_days < 7 || duration_days > 365) {
      return new Response(JSON.stringify({ error: "Duration must be between 7 and 365 days" }), { status: 400, headers: corsHeaders });
    }

    // Get user profile for validation checks
    const { data: profile, error: profErr } = await admin.from("profiles")
      .select("vault_balance, frozen_balance, created_at")
      .eq("user_id", user.id)
      .single();

    if (profErr || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), { status: 404, headers: corsHeaders });
    }

    // Check account age
    const accountAge = (Date.now() - new Date(profile.created_at).getTime()) / 86400000;
    const { data: minAgeSetting } = await admin.from("settings").select("value").eq("key", "min_account_age_days").maybeSingle();
    const minAge = minAgeSetting ? parseFloat(minAgeSetting.value) : 6;
    if (accountAge < minAge) {
      return new Response(JSON.stringify({ error: `Account must be at least ${minAge} days old` }), { status: 400, headers: corsHeaders });
    }

    // Check max loan ratio
    const { data: ratioSetting } = await admin.from("settings").select("value").eq("key", "max_loan_ratio").maybeSingle();
    const maxRatio = ratioSetting ? parseFloat(ratioSetting.value) / 100 : 0.5;
    if (principal > profile.vault_balance * maxRatio) {
      return new Response(JSON.stringify({ error: `Loan cannot exceed ${maxRatio * 100}% of vault balance` }), { status: 400, headers: corsHeaders });
    }

    // Use configured interest rate
    const { data: rateSetting } = await admin.from("settings").select("value").eq("key", "base_interest_rate").maybeSingle();
    const finalRate = interest_rate || (rateSetting ? parseFloat(rateSetting.value) : 12);

    // Atomic collateral lock via RPC
    if (collateral_amount > 0) {
      const { data: lockResult, error: lockErr } = await admin.rpc("atomic_lock_collateral", {
        p_user_id: user.id,
        p_amount: collateral_amount,
      });

      if (lockErr) throw lockErr;
      if (lockResult?.error) {
        return new Response(JSON.stringify({ error: lockResult.error }), { status: 400, headers: corsHeaders });
      }
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
  } catch (e: any) {
    console.error('request-loan error:', { error: e?.message, stack: e?.stack, timestamp: new Date().toISOString() });
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
