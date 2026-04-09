const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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

    const cfToken = Deno.env.get("CLOUDFLARE_API_TOKEN");
    const cfZoneId = Deno.env.get("CLOUDFLARE_ZONE_ID");

    if (!cfToken || !cfZoneId) {
      return new Response(
        JSON.stringify({ error: "Credenciais do Cloudflare não configuradas" }),
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
