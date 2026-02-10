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

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
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

    // Rate limit: 60 requests per 60 seconds for governors
    const { data: allowed } = await admin.rpc("check_rate_limit", {
      p_user_id: user.id,
      p_endpoint: "governor-update-setting",
      p_max_requests: 60,
      p_window_seconds: 60,
    });
    if (allowed === false) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), { status: 429, headers: corsHeaders });
    }

    const { settings } = await req.json();

    if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
      return new Response(JSON.stringify({ error: "Invalid settings payload" }), { status: 400, headers: corsHeaders });
    }

    // Allowed setting keys
    const allowedKeys = [
      "base_interest_rate", "lender_share_pct", "deposit_fee_pct",
      "max_loan_ratio", "capital_lock_days", "min_account_age_days",
      "referral_l1_pct", "referral_l2_pct", "referral_l3_pct",
      "system_frozen", "deposit_qr_code_url",
    ];

    const updates: { key: string; value: string }[] = [];
    for (const [key, value] of Object.entries(settings)) {
      if (!allowedKeys.includes(key)) {
        return new Response(JSON.stringify({ error: `Invalid setting key: ${key}` }), { status: 400, headers: corsHeaders });
      }
      if (typeof value !== "string") {
        return new Response(JSON.stringify({ error: `Value for ${key} must be a string` }), { status: 400, headers: corsHeaders });
      }
      // Validate numeric settings
      if (key !== "system_frozen" && key !== "deposit_qr_code_url") {
        const num = parseFloat(value);
        if (isNaN(num) || num < 0 || num > 999999) {
          return new Response(JSON.stringify({ error: `Invalid value for ${key}` }), { status: 400, headers: corsHeaders });
        }
      }
      if (key === "system_frozen" && value !== "true" && value !== "false") {
        return new Response(JSON.stringify({ error: "system_frozen must be 'true' or 'false'" }), { status: 400, headers: corsHeaders });
      }
      updates.push({ key, value });
    }

    // Upsert all settings atomically
    for (const { key, value } of updates) {
      const { data: existing } = await admin.from("settings").select("id").eq("key", key).maybeSingle();
      if (existing) {
        const { error } = await admin.from("settings").update({ value, updated_at: new Date().toISOString() }).eq("key", key);
        if (error) throw error;
      } else {
        const { error } = await admin.from("settings").insert({ key, value });
        if (error) throw error;
      }
    }

    return new Response(JSON.stringify({ success: true, updated: updates.map(u => u.key) }), { headers: corsHeaders });
  } catch (e: any) {
    console.error('governor-update-setting error:', { error: e?.message, stack: e?.stack, timestamp: new Date().toISOString() });
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
