import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabase.auth.getUser(token);
    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: corsHeaders });
    }

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: caller.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Apenas administradores" }), { status: 403, headers: corsHeaders });
    }

    const { email, password, doctor_id } = await req.json();

    if (!email || !password || !doctor_id) {
      return new Response(JSON.stringify({ error: "E-mail, senha e ID do prescritor são obrigatórios" }), { status: 400, headers: corsHeaders });
    }

    // Check doctor exists and has no user_id yet
    const { data: doctor, error: docErr } = await supabase
      .from("doctors")
      .select("id, name, user_id")
      .eq("id", doctor_id)
      .single();

    if (docErr || !doctor) {
      return new Response(JSON.stringify({ error: "Prescritor não encontrado" }), { status: 404, headers: corsHeaders });
    }

    if (doctor.user_id) {
      return new Response(JSON.stringify({ error: "Este prescritor já possui um usuário vinculado" }), { status: 400, headers: corsHeaders });
    }

    // Create auth user
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: doctor.name },
    });

    if (authErr) {
      return new Response(JSON.stringify({ error: authErr.message }), { status: 400, headers: corsHeaders });
    }

    const userId = authData.user.id;

    // Link user to doctor
    await supabase.from("doctors").update({ user_id: userId }).eq("id", doctor_id);

    // Add prescriber role
    await supabase.from("user_roles").insert({ user_id: userId, role: "prescriber" });

    return new Response(JSON.stringify({ success: true, user_id: userId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
