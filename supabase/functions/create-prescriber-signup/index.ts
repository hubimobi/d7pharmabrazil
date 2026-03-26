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

    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "E-mail e senha são obrigatórios" }), { status: 400, headers: corsHeaders });
    }

    // Check if this email exists in doctors table
    const { data: doctor, error: docErr } = await supabase
      .from("doctors")
      .select("id, name, user_id")
      .eq("email", email)
      .single();

    if (docErr || !doctor) {
      return new Response(JSON.stringify({ error: "Este e-mail não está cadastrado como prescritor. Entre em contato com o suporte." }), { status: 404, headers: corsHeaders });
    }

    if (doctor.user_id) {
      return new Response(JSON.stringify({ error: "Este prescritor já possui um usuário. Faça login normalmente." }), { status: 400, headers: corsHeaders });
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
    await supabase.from("doctors").update({ user_id: userId }).eq("id", doctor.id);

    // Add prescriber role
    await supabase.from("user_roles").insert({ user_id: userId, role: "prescriber" });

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
