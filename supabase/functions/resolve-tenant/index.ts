import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000000";

const defaultResponse = {
  tenant_id: DEFAULT_TENANT_ID,
  slug: "main",
  plan: "pro",
  status: "active",
  allowed_modules: {},
  store_settings: null,
};

const cacheHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Resolve hostname — NEVER from body ──
    const raw =
      req.headers.get("x-forwarded-host") ||
      req.headers.get("host") ||
      "";
    const hostname = raw.split(":")[0].toLowerCase().trim();

    // ── Fast paths — no DB query needed ──
    if (!hostname || hostname === "localhost") {
      return new Response(JSON.stringify(defaultResponse), {
        status: 200,
        headers: cacheHeaders,
      });
    }

    // ── Service-role client (bypass RLS) ──
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let tenantId: string | null = null;

    // ── 1. Look up by custom domain ──
    const { data: domainRow } = await supabase
      .from("tenant_domains")
      .select("tenant_id")
      .eq("domain", hostname)
      .limit(1)
      .maybeSingle();

    if (domainRow?.tenant_id) {
      tenantId = domainRow.tenant_id;
    }

    // ── 2. Fallback: extract subdomain and look up by slug ──
    if (!tenantId) {
      const parts = hostname.split(".");
      // Only treat as subdomain if there are 3+ parts
      // e.g. loja1.d7pharma.com.br → slug = 'loja1'
      // d7pharma.com.br → no subdomain → already tried domain lookup
      if (parts.length >= 3) {
        const slug = parts[0];
        const { data: tenantRow } = await supabase
          .from("tenants")
          .select("id")
          .eq("slug", slug)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();

        if (tenantRow?.id) {
          tenantId = tenantRow.id;
        }
      }
    }

    // ── 3. Fallback to default tenant ──
    if (!tenantId) {
      return new Response(JSON.stringify(defaultResponse), {
        status: 200,
        headers: cacheHeaders,
      });
    }

    // ── Fetch tenant details ──
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, slug, plan, status, allowed_modules")
      .eq("id", tenantId)
      .maybeSingle();

    if (!tenant || tenant.status !== "active") {
      return new Response(JSON.stringify(defaultResponse), {
        status: 200,
        headers: cacheHeaders,
      });
    }

    // ── Fetch store_settings for this tenant ──
    const { data: storeSettings } = await supabase
      .from("store_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .limit(1)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        tenant_id: tenant.id,
        slug: tenant.slug,
        plan: tenant.plan ?? "free",
        status: tenant.status,
        allowed_modules: tenant.allowed_modules ?? {},
        store_settings: storeSettings ?? null,
      }),
      { status: 200, headers: cacheHeaders },
    );
  } catch (err) {
    console.error("resolve-tenant error:", err);
    // Never break the storefront — return default
    return new Response(JSON.stringify(defaultResponse), {
      status: 200,
      headers: cacheHeaders,
    });
  }
});
