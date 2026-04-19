import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Ensure URL has https:// prefix */
function normalizeUrl(url: string): string {
  let u = url.trim();
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  return u.replace(/\/+$/, "");
}

const ActionSchema = z.object({
  action: z.enum(["create", "qrcode", "status", "disconnect", "restart", "set_webhook"]),
  instance_id: z.string().uuid().optional(),
  name: z.string().min(1).max(100).optional(),
  api_url: z.string().min(1).transform(normalizeUrl).pipe(z.string().url()).optional(),
  api_key: z.string().min(1).optional(),
  funnel_roles: z.array(z.enum(["all", "recuperacao", "recompra", "upsell", "novidades"])).optional(),
});

/** Safely parse a fetch response as JSON, returning an error object if HTML/non-JSON */
async function safeJson(res: Response): Promise<{ ok: boolean; status: number; data: any; isInfraError: boolean }> {
  const text = await res.text();
  const isInfraError = res.status >= 500 || text.trimStart().startsWith("<!doctype") || text.trimStart().startsWith("<html");
  try {
    const data = JSON.parse(text);
    return { ok: res.ok, status: res.status, data, isInfraError };
  } catch {
    return {
      ok: false,
      status: res.status,
      isInfraError,
      data: { error: "Evolution API retornou resposta inválida (não-JSON)", status: res.status, body_preview: text.substring(0, 200) },
    };
  }
}

/** Auto-configure webhook on Evolution API */
async function configureWebhook(apiUrl: string, apiKey: string, instanceName: string): Promise<boolean> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const webhookUrl = `${SUPABASE_URL}/functions/v1/whatsapp-evolution-webhook`;

  try {
    // Try v2 format first, fallback to v1
    let res = await fetch(`${apiUrl}/webhook/set/${instanceName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: apiKey },
      body: JSON.stringify({
        webhook: {
          url: webhookUrl,
          webhookByEvents: false,
          webhookBase64: false,
          events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "MESSAGES_UPDATE"],
          enabled: true,
        },
      }),
    });

    // If v2 format fails, try v1 flat format
    if (!res.ok) {
      console.log(`[webhook-config] v2 format failed for ${instanceName}, trying v1...`);
      res = await fetch(`${apiUrl}/webhook/set/${instanceName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: apiKey },
        body: JSON.stringify({
          url: webhookUrl,
          webhook_by_events: false,
          webhook_base64: false,
          events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "MESSAGES_UPDATE"],
        }),
      });
    }
    const result = await safeJson(res);
    console.log(`[webhook-config] ${instanceName}:`, result.ok, JSON.stringify(result.data).substring(0, 200));
    return result.ok;
  } catch (err) {
    console.error(`[webhook-config] failed for ${instanceName}:`, err);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles || []).some((r: any) => ["admin","super_admin","administrador","suporte","gestor"].includes(r.role));
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });

    // Resolve tenant_id from the user
    const { data: tenantUser } = await supabase.from("tenant_users").select("tenant_id").eq("user_id", user.id).limit(1).maybeSingle();
    const tenantId = tenantUser?.tenant_id || null;

    const body = await req.json();
    const parsed = ActionSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), { status: 400, headers: corsHeaders });
    }

    const { action, instance_id, name, api_url, api_key, funnel_roles } = parsed.data;

    // ── CREATE ──
    if (action === "create") {
      if (!api_url || !api_key || !name) {
        return new Response(JSON.stringify({ error: "name, api_url, api_key required" }), { status: 400, headers: corsHeaders });
      }

      const instanceName = `d7pharma_${Date.now()}`;
      
      const evoRes = await fetch(`${api_url}/instance/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: api_key },
        body: JSON.stringify({
          instanceName,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
        }),
      });

      const evo = await safeJson(evoRes);
      if (!evo.ok) {
        const msg = evo.isInfraError ? "Evolution API temporariamente indisponível. Tente novamente em alguns minutos." : "Evolution API error";
        return new Response(JSON.stringify({ error: msg, details: evo.data, retryable: evo.isInfraError }), { status: evo.isInfraError ? 503 : 502, headers: corsHeaders });
      }

      const qrCode = evo.data?.qrcode?.base64 || evo.data?.qrcode?.pairingCode || null;

      // Auto-configure webhook
      const webhookOk = await configureWebhook(api_url, api_key, instanceName);

      const { data: inst, error: dbErr } = await supabase.from("whatsapp_instances").insert({
        name,
        instance_name: instanceName,
        api_url,
        api_key,
        tenant_id: tenantId,
        funnel_roles: funnel_roles && funnel_roles.length > 0 ? (funnel_roles.includes("all") ? ["all"] : funnel_roles) : ["all"],
        status: qrCode ? "qr_ready" : "disconnected",
        qr_code: qrCode,
      }).select().single();

      if (dbErr) return new Response(JSON.stringify({ error: dbErr.message }), { status: 500, headers: corsHeaders });

      return new Response(JSON.stringify({ instance: inst, qrcode: qrCode, webhook_configured: webhookOk }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── QRCODE ──
    if (action === "qrcode" && instance_id) {
      const { data: inst } = await supabase.from("whatsapp_instances").select("*").eq("id", instance_id).single();
      if (!inst) return new Response(JSON.stringify({ error: "Instance not found" }), { status: 404, headers: corsHeaders });

      const evoRes = await fetch(`${inst.api_url}/instance/connect/${inst.instance_name}`, {
        method: "GET",
        headers: { apikey: inst.api_key },
      });
      const evo = await safeJson(evoRes);
      if (!evo.ok) {
        return new Response(JSON.stringify({ error: "Evolution API temporariamente indisponível. Tente novamente em alguns minutos.", details: evo.data, retryable: evo.isInfraError }), { status: evo.isInfraError ? 503 : 502, headers: corsHeaders });
      }

      const qrCode = evo.data?.base64 || evo.data?.qrcode?.base64 || null;

      if (qrCode) {
        await supabase.from("whatsapp_instances").update({ qr_code: qrCode, status: "qr_ready" }).eq("id", instance_id);
      }

      return new Response(JSON.stringify({ qrcode: qrCode, raw: evo.data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── STATUS ──
    if (action === "status" && instance_id) {
      const { data: inst } = await supabase.from("whatsapp_instances").select("*").eq("id", instance_id).single();
      if (!inst) return new Response(JSON.stringify({ error: "Instance not found" }), { status: 404, headers: corsHeaders });

      const evoRes = await fetch(`${inst.api_url}/instance/connectionState/${inst.instance_name}`, {
        method: "GET",
        headers: { apikey: inst.api_key },
      });
      const evo = await safeJson(evoRes);
      if (!evo.ok) {
        if (evo.isInfraError) {
          return new Response(JSON.stringify({ status: "unknown", raw_state: null, error: "Evolution API temporariamente indisponível", retryable: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify({ error: "Evolution API indisponível", details: evo.data }), { status: 502, headers: corsHeaders });
      }

      // Evolution real states: open | connecting | close
      const rawState = evo.data?.state || evo.data?.instance?.state || "unknown";

      let mappedStatus: string | null = null;
      if (rawState === "open") mappedStatus = "connected";
      else if (rawState === "close") mappedStatus = "disconnected";
      else if (rawState === "connecting") mappedStatus = "connecting";

      if (mappedStatus) {
        await supabase.from("whatsapp_instances").update({ status: mappedStatus }).eq("id", instance_id);
      }

      // Auto-configure webhook when connected
      if (mappedStatus === "connected") {
        await configureWebhook(inst.api_url, inst.api_key, inst.instance_name);
      }

      const finalStatus = mappedStatus || inst.status || "unknown";
      return new Response(JSON.stringify({ status: finalStatus, raw_state: rawState, raw: evo.data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── DISCONNECT ──
    if (action === "disconnect" && instance_id) {
      const { data: inst } = await supabase.from("whatsapp_instances").select("*").eq("id", instance_id).single();
      if (!inst) return new Response(JSON.stringify({ error: "Instance not found" }), { status: 404, headers: corsHeaders });

      await fetch(`${inst.api_url}/instance/logout/${inst.instance_name}`, {
        method: "DELETE",
        headers: { apikey: inst.api_key },
      });

      await supabase.from("whatsapp_instances").update({ status: "disconnected", qr_code: null }).eq("id", instance_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── RESTART ──
    if (action === "restart" && instance_id) {
      const { data: inst } = await supabase.from("whatsapp_instances").select("*").eq("id", instance_id).single();
      if (!inst) return new Response(JSON.stringify({ error: "Instance not found" }), { status: 404, headers: corsHeaders });

      await fetch(`${inst.api_url}/instance/restart/${inst.instance_name}`, {
        method: "PUT",
        headers: { apikey: inst.api_key },
      });

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── SET_WEBHOOK (manual re-configure) ──
    if (action === "set_webhook" && instance_id) {
      const { data: inst } = await supabase.from("whatsapp_instances").select("*").eq("id", instance_id).single();
      if (!inst) return new Response(JSON.stringify({ error: "Instance not found" }), { status: 404, headers: corsHeaders });

      const ok = await configureWebhook(inst.api_url, inst.api_key, inst.instance_name);
      return new Response(JSON.stringify({ success: ok, webhook_configured: ok }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: corsHeaders });
  } catch (err) {
    console.error("whatsapp-instance error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
