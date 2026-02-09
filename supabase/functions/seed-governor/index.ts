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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Require CRON_SECRET for security
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const cronSecret = Deno.env.get("CRON_SECRET");

    if (!cronSecret || token !== cronSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const email = "governor@jnthn.com";
    const password = "Governor123!";

    // Check if user already exists
    const { data: existingUsers } = await admin.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u: any) => u.email === email);

    if (existing) {
      // Ensure governor role exists
      const { data: roleCheck } = await admin.from("user_roles")
        .select("id")
        .eq("user_id", existing.id)
        .eq("role", "governor")
        .maybeSingle();

      if (!roleCheck) {
        await admin.from("user_roles").insert({ user_id: existing.id, role: "governor" });
      }

      return new Response(JSON.stringify({ message: "Governor account already exists", userId: existing.id }), { headers: corsHeaders });
    }

    // Create user with email confirmed
    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: "Governor", last_name: "Admin" },
    });

    if (createErr) throw createErr;

    // The handle_new_user trigger will create the profile and assign 'member' role
    // Now upgrade to governor
    await admin.from("user_roles").insert({ user_id: newUser.user.id, role: "governor" });

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Governor account created",
      email,
      userId: newUser.user.id,
    }), { headers: corsHeaders });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
