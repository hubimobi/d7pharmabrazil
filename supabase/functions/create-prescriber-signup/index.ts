import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000000";

async function resolveTenantFromOrigin(supabase: any, origin: string | null): Promise<string> {
  if (!origin) return DEFAULT_TENANT_ID;
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    if (!hostname || hostname === "localhost") return DEFAULT_TENANT_ID;

    const { data: domainRow } = await supabase
      .from("tenant_domains")
      .select("tenant_id")
      .eq("domain", hostname)
      .maybeSingle();
    if (domainRow?.tenant_id) return domainRow.tenant_id;

    const parts = hostname.split(".");
    if (parts.length >= 3) {
      const slug = parts[0];
      const { data: tenantRow } = await supabase
        .from("tenants")
        .select("id")
        .eq("slug", slug)
        .eq("status", "active")
        .maybeSingle();
      if (tenantRow?.id) return tenantRow.id;
    }
  } catch {}
  return DEFAULT_TENANT_ID;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { email, password } = body;
    let tenantId: string | null = body.tenant_id ?? null;

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "E-mail e senha são obrigatórios" }), { status: 400, headers: corsHeaders });
    }

    if (!tenantId) {
      tenantId = await resolveTenantFromOrigin(supabase, req.headers.get("origin"));
    }

    // Find doctor scoped to tenant
    const { data: doctor, error: docErr } = await supabase
      .from("doctors")
      .select("id, name, user_id, tenant_id")
      .eq("email", email)
      .eq("tenant_id", tenantId)
      .maybeSingle();

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

    // Bind user to tenant
    await supabase.from("tenant_users").insert({
      user_id: userId,
      tenant_id: doctor.tenant_id ?? tenantId,
      role: "prescriber",
    });

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
