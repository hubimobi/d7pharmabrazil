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
    const { name, email, cpf, pix, crm, specialty, state, city, representative_id, rep_code } = body;
    let tenantId: string | null = body.tenant_id ?? null;

    if (!name || !email || !representative_id) {
      return new Response(JSON.stringify({ error: "Nome, e-mail e representante são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve tenant fallback via origin header
    if (!tenantId) {
      tenantId = await resolveTenantFromOrigin(supabase, req.headers.get("origin"));
    }

    // Validate that representative belongs to same tenant
    const { data: rep } = await supabase
      .from("representatives")
      .select("id, short_code, tenant_id")
      .eq("id", representative_id)
      .maybeSingle();

    if (!rep) {
      return new Response(JSON.stringify({ error: "Representante não encontrado." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (rep.tenant_id && rep.tenant_id !== tenantId) {
      // Trust representative's tenant
      tenantId = rep.tenant_id;
    }

    // Check duplicate email scoped to tenant
    const { data: existing } = await supabase
      .from("doctors")
      .select("id")
      .eq("email", email)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "Este e-mail já está cadastrado como prescritor." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auto-approve if rep_code matches
    let isAutoApproved = false;
    if (rep_code && (rep.short_code?.toUpperCase() === rep_code.toUpperCase() || rep.id === rep_code)) {
      isAutoApproved = true;
    }

    // Insert doctor
    const { data: inserted, error: insertErr } = await supabase
      .from("doctors")
      .insert({
        name,
        email,
        cpf: cpf || null,
        pix: pix || null,
        crm: crm || null,
        specialty: specialty || null,
        state: state || null,
        city: city || null,
        representative_id,
        tenant_id: tenantId,
        approval_status: isAutoApproved ? "approved" : "pending",
        active: isAutoApproved,
      })
      .select()
      .single();

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate coupon code
    const initials = name.split(/\s+/).filter(Boolean).map((w: string) => w[0].toUpperCase()).join("");
    const randomDigit = Math.floor(Math.random() * 10);
    const { count } = await supabase
      .from("doctors")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId);
    const seq = count ?? 1;
    const couponCode = `${initials}${randomDigit}R${seq}`;

    await supabase.from("coupons").insert({
      code: couponCode,
      description: `Cupom do Prescritor ${name}`,
      discount_type: "percent",
      discount_value: 10,
      active: isAutoApproved,
      doctor_id: inserted.id,
      representative_id,
      tenant_id: tenantId,
    });

    return new Response(JSON.stringify({
      success: true,
      doctor_id: inserted.id,
      name: inserted.name,
      coupon_code: couponCode,
      email: inserted.email,
      auto_approved: isAutoApproved,
      tenant_id: tenantId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
