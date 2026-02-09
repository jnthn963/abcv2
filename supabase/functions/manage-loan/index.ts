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

    // Check system freeze (governor can still reject, but not approve)
    if (action === "approved") {
      const { data: freezeSetting } = await admin.from("settings").select("value").eq("key", "system_frozen").maybeSingle();
      if (freezeSetting?.value === "true") {
        return new Response(JSON.stringify({ error: "System is currently frozen. Cannot approve loans." }), { status: 403, headers: corsHeaders });
      }
    }

    if (action === "rejected") {
      // Atomic reject loan (releases collateral) via RPC
      const { data: result, error: rpcErr } = await admin.rpc("atomic_reject_loan", {
        p_loan_id: loanId,
        p_rejection_reason: rejectionReason || null,
      });

      if (rpcErr) throw rpcErr;
      if (result?.error) {
        return new Response(JSON.stringify({ error: result.error }), { status: 400, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ success: true, action: "rejected" }), { headers: corsHeaders });
    }

    // Approved: loan stays pending in marketplace for lenders to fund
    await admin.from("loans").update({ status: "pending" }).eq("id", loanId);

    return new Response(JSON.stringify({ success: true, action: "approved" }), { headers: corsHeaders });
  } catch (e: any) {
    console.error('manage-loan error:', { error: e?.message, stack: e?.stack, timestamp: new Date().toISOString() });
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
