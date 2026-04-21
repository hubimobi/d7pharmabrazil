const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getTenantCredentials, DEFAULT_TENANT_ID } from "../_shared/tenant-credentials.ts";

interface CloudflareCreds { api_token: string; zone_id: string; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Role check: only admins can purge cache ---
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roles } = await serviceClient.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles || []).some((r: any) => ["admin", "super_admin", "administrador", "suporte"].includes(r.role));
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve tenant + credentials
    const { data: tenantUser } = await serviceClient
      .from("tenant_users")
      .select("tenant_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    const tenantId = tenantUser?.tenant_id || DEFAULT_TENANT_ID;

    const tenantCreds = await getTenantCredentials<CloudflareCreds>(serviceClient, tenantId, "cloudflare");
    let cfToken = tenantCreds?.api_token || "";
    let cfZoneId = tenantCreds?.zone_id || "";
    if ((!cfToken || !cfZoneId) && tenantId === DEFAULT_TENANT_ID) {
      cfToken = cfToken || Deno.env.get("CLOUDFLARE_API_TOKEN") || "";
      cfZoneId = cfZoneId || Deno.env.get("CLOUDFLARE_ZONE_ID") || "";
    }

    if (!cfToken || !cfZoneId) {
      return new Response(
        JSON.stringify({ error: "Cloudflare não configurado para este tenant" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const purgeAll = body.purge_all !== false; // default true
    const urls = Array.isArray(body.urls) ? body.urls : [];

    const cfBody: Record<string, unknown> = purgeAll
      ? { purge_everything: true }
      : { files: urls };

    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/purge_cache`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cfBody),
      }
    );

    const cfData = await cfRes.json();

    if (!cfRes.ok || !cfData.success) {
      const errMsg = cfData.errors?.[0]?.message || "Erro desconhecido do Cloudflare";
      return new Response(
        JSON.stringify({ error: errMsg, details: cfData.errors }),
        { status: cfRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: purgeAll ? "Cache completo limpo" : `${urls.length} URL(s) limpas` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("cloudflare-purge error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
