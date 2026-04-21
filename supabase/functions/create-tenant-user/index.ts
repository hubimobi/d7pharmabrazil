import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Use anon client with user's auth header to validate the token
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Token inválido" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const caller = { id: claimsData.claims.sub as string };

    // Check caller has admin-level role
    const { data: callerRoles } = await supabase.from("user_roles").select("role").eq("user_id", caller.id);
    const adminRoles = ["super_admin", "admin", "administrador"];
    const isCallerAdmin = callerRoles?.some((r: any) => adminRoles.includes(r.role));
    if (!isCallerAdmin) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { action } = body;

    // LIST USERS with emails (admin only)
    if (action === "list_users") {
      const { data: { users: authUsers }, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      if (listError) {
        return new Response(JSON.stringify({ error: listError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const userMap: Record<string, { email: string; banned: boolean }> = {};
      authUsers?.forEach((u: any) => {
        userMap[u.id] = { email: u.email || "", banned: !!u.banned_until && new Date(u.banned_until) > new Date() };
      });
      return new Response(JSON.stringify({ success: true, users: userMap }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    // TOGGLE ACTIVE (ban/unban user)
    if (action === "toggle_active") {
      const { user_id, active } = body;
      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id é obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { error: banError } = await supabase.auth.admin.updateUserById(user_id, {
        ban_duration: active ? "none" : "876000h",
      });
      if (banError) {
        return new Response(JSON.stringify({ error: banError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ success: true, active }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // UPDATE existing user
    if (action === "update") {
      const { user_id, full_name, role, representative_id, phone, email } = body;
      if (!user_id || !role) {
        return new Response(JSON.stringify({ error: "user_id e role são obrigatórios" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Update profile name and phone
      const profileUpdate: Record<string, string> = {};
      if (full_name) profileUpdate.full_name = full_name;
      if (phone !== undefined) profileUpdate.phone = phone;
      if (Object.keys(profileUpdate).length > 0) {
        await supabase.from("profiles").update(profileUpdate).eq("user_id", user_id);
      }

      // Update email in auth if provided
      if (email) {
        const { error: emailError } = await supabase.auth.admin.updateUserById(user_id, { email });
        if (emailError) {
          return new Response(JSON.stringify({ error: emailError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }

      // Update role: delete old roles, insert new one
      await supabase.from("user_roles").delete().eq("user_id", user_id);
      await supabase.from("user_roles").insert({ user_id, role });

      // If prescriber, link to representative via doctors table
      if (role === "prescriber" && representative_id) {
        const { data: existingDoc } = await supabase.from("doctors").select("id").eq("user_id", user_id).limit(1);
        if (existingDoc && existingDoc.length > 0) {
          await supabase.from("doctors").update({ representative_id }).eq("user_id", user_id);
        } else {
          await supabase.from("doctors").insert({
            user_id,
            name: full_name || "Prescritor",
            representative_id,
          });
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CREATE new user (default action)
    const { email, password, full_name, role, representative_id, doctor_id } = body;

    if (!email || !password || !role) {
      return new Response(JSON.stringify({ error: "Email, senha e role são obrigatórios" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create auth user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || email },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = newUser.user.id;

    // Assign role
    await supabase.from("user_roles").insert({ user_id: userId, role });

    // If prescriber, link to existing doctor record or create new one
    if (role === "prescriber") {
      if (doctor_id) {
        await supabase.from("doctors").update({ user_id: userId }).eq("id", doctor_id);
      } else if (representative_id) {
        await supabase.from("doctors").insert({
          user_id: userId,
          name: full_name || email,
          representative_id,
        });
      }
    }

    // If representative, link to existing representative record
    if (role === "representative") {
      const repId = body.representative_record_id;
      if (repId) {
        await supabase.from("representatives").update({ user_id: userId }).eq("id", repId);
      }
    }

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("create-tenant-user error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
