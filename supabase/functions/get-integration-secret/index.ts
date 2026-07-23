// Reveals integration secret values to super_admin users only.
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Whitelist of secret names that can be revealed via this endpoint.
const ALLOWED_SECRETS = new Set([
  "ASAAS_API_KEY",
  "BLING_CLIENT_ID",
  "BLING_CLIENT_SECRET",
  "GHL_API_KEY",
  "GHL_LOCATION_ID",
  "MELHOR_ENVIO_TOKEN",
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ZONE_ID",
  "XAI_API_KEY",
  "OPENAI_API_KEY",
  "EVOLUTION_API_URL",
  "EVOLUTION_API_KEY",
  "ASAAS_WEBHOOK_TOKEN",
  "WHATSAPP_WEBHOOK_SECRET",
  "CRON_SECRET",
  "GHL_LOCATION_ID",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return json({ error: "unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "unauthorized" }, 401);

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: isSuper } = await service.rpc("is_super_admin", { uid: user.id });
    if (!isSuper) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const names: string[] = Array.isArray(body?.names) ? body.names : [];
    if (!names.length) return json({ error: "names required" }, 400);

    const result: Record<string, string | null> = {};
    for (const name of names) {
      if (!ALLOWED_SECRETS.has(name)) {
        result[name] = null;
        continue;
      }
      result[name] = Deno.env.get(name) ?? null;
    }

    return json({ secrets: result });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
