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

    // Rate limit: 60 requests per 60 seconds for governors
    const { data: allowed } = await admin.rpc("check_rate_limit", {
      p_user_id: user.id,
      p_endpoint: "approve-withdrawal",
      p_max_requests: 60,
      p_window_seconds: 60,
    });
    if (allowed === false) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), { status: 429, headers: corsHeaders });
    }

    const { withdrawalId, action, rejectionReason } = await req.json();
    if (!withdrawalId || !["approved", "rejected"].includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid params" }), { status: 400, headers: corsHeaders });
    }

    // Check system freeze (governor can still reject, but not approve)
    if (action === "approved") {
      const { data: freezeSetting } = await admin.from("settings").select("value").eq("key", "system_frozen").maybeSingle();
      if (freezeSetting?.value === "true") {
        return new Response(JSON.stringify({ error: "System is currently frozen. Cannot approve withdrawals." }), { status: 403, headers: corsHeaders });
      }
    }

    if (action === "rejected") {
      await admin.from("withdrawals").update({ status: "rejected", rejection_reason: rejectionReason || null }).eq("id", withdrawalId);
      return new Response(JSON.stringify({ success: true, action: "rejected" }), { headers: corsHeaders });
    }

    // Atomic withdrawal approval via RPC
    const { data: result, error: rpcErr } = await admin.rpc("atomic_approve_withdrawal", {
      p_withdrawal_id: withdrawalId,
    });

    if (rpcErr) throw rpcErr;
    if (result?.error) {
      return new Response(JSON.stringify({ error: result.error }), { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true, action: "approved", totalDeduction: result.total_deduction }), { headers: corsHeaders });
  } catch (e: any) {
    console.error('approve-withdrawal error:', { error: e?.message, stack: e?.stack, timestamp: new Date().toISOString() });
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
