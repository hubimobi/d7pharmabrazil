import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

interface SignupBody {
  store_name: string;
  store_slug: string;
  owner_name: string;
  owner_email: string;
  owner_password: string;
  plan?: "trial" | "basic" | "pro" | "enterprise";
}

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;
const RESERVED_SLUGS = new Set([
  "www", "admin", "api", "app", "superboss", "auth", "checkout",
  "produtos", "produto", "login", "criar-loja", "static", "assets",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: jsonHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  let body: SignupBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: jsonHeaders });
  }

  // ── Validation ──
  const errors: Record<string, string> = {};
  const storeName = String(body.store_name ?? "").trim();
  const storeSlug = String(body.store_slug ?? "").trim().toLowerCase();
  const ownerName = String(body.owner_name ?? "").trim();
  const ownerEmail = String(body.owner_email ?? "").trim().toLowerCase();
  const ownerPassword = String(body.owner_password ?? "");
  const plan = body.plan ?? "trial";

  if (storeName.length < 2 || storeName.length > 60) errors.store_name = "Nome entre 2 e 60 caracteres";
  if (!SLUG_RE.test(storeSlug)) errors.store_slug = "Use letras minúsculas, números e hífen (3-40 chars)";
  if (RESERVED_SLUGS.has(storeSlug)) errors.store_slug = "Identificador reservado";
  if (ownerName.length < 2) errors.owner_name = "Nome obrigatório";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ownerEmail)) errors.owner_email = "E-mail inválido";
  if (ownerPassword.length < 8) errors.owner_password = "Senha mínima de 8 caracteres";

  if (Object.keys(errors).length) {
    return new Response(JSON.stringify({ error: "validation_error", fields: errors }), { status: 400, headers: jsonHeaders });
  }

  // ── Slug uniqueness ──
  const { data: existingTenant } = await supabase
    .from("tenants").select("id").eq("slug", storeSlug).maybeSingle();
  if (existingTenant) {
    return new Response(JSON.stringify({ error: "slug_taken" }), { status: 409, headers: jsonHeaders });
  }

  // ── Find template tenant ──
  const { data: template } = await supabase
    .from("tenants").select("id").eq("is_template", true).eq("active", true)
    .order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (!template) {
    return new Response(JSON.stringify({ error: "no_template_available" }), { status: 500, headers: jsonHeaders });
  }

  // ── Create auth user (auto-confirm so they can login immediately) ──
  const { data: created, error: userErr } = await supabase.auth.admin.createUser({
    email: ownerEmail,
    password: ownerPassword,
    email_confirm: true,
    user_metadata: { full_name: ownerName },
  });
  if (userErr || !created?.user) {
    const msg = userErr?.message?.includes("already registered") ? "email_taken" : (userErr?.message ?? "user_create_failed");
    return new Response(JSON.stringify({ error: msg }), { status: 409, headers: jsonHeaders });
  }
  const userId = created.user.id;

  // ── Create tenant (status=pending while cloning) ──
  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + 14);

  const { data: tenant, error: tenantErr } = await supabase.from("tenants").insert({
    name: storeName,
    slug: storeSlug,
    active: true,
    plan,
    status: plan === "trial" ? "trial" : "active",
    is_template: false,
    template_id: template.id,
    owner_user_id: userId,
    trial_ends_at: plan === "trial" ? trialEnds.toISOString() : null,
    cloning_status: "pending",
    allowed_modules: {},
  }).select("id").single();

  if (tenantErr || !tenant) {
    await supabase.auth.admin.deleteUser(userId).catch(() => {});
    return new Response(JSON.stringify({ error: "tenant_create_failed", details: tenantErr?.message }), { status: 500, headers: jsonHeaders });
  }
  const tenantId = tenant.id;

  // ── Bind user as admin of the new tenant ──
  await supabase.from("tenant_users").insert({
    tenant_id: tenantId, user_id: userId, role: "admin",
  });
  await supabase.from("user_roles").insert({
    user_id: userId, role: "admin",
  }).select(); // ignore conflicts silently

  // ── Trigger clone-tenant in background (fire & forget, but await initial response) ──
  try {
    await fetch(`${supabaseUrl}/functions/v1/clone-tenant`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ source_tenant_id: template.id, target_tenant_id: tenantId }),
    });
  } catch (e) {
    console.error("clone-tenant invoke failed (non-fatal):", e);
  }

  return new Response(JSON.stringify({
    success: true,
    tenant_id: tenantId,
    slug: storeSlug,
    user_id: userId,
    trial_ends_at: plan === "trial" ? trialEnds.toISOString() : null,
  }), { headers: jsonHeaders });
});
