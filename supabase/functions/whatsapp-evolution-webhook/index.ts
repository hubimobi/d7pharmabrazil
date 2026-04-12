import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Webhook endpoint for Evolution API events.
 * Handles incoming messages and status updates, creating/updating conversations.
 * 
 * Evolution API sends events like:
 * - messages.upsert: new incoming/outgoing message
 * - connection.update: instance connection status changes
 * - messages.update: message delivery status updates
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const event = body.event || body.action || "";
    const instanceName = body.instance || body.instanceName || "";

    console.log(`[evolution-webhook] event=${event} instance=${instanceName}`);

    // Resolve instance
    let instance: any = null;
    if (instanceName) {
      const { data } = await supabase
        .from("whatsapp_instances")
        .select("id, tenant_id, name")
        .eq("instance_name", instanceName)
        .limit(1)
        .maybeSingle();
      instance = data;
    }

    // ── Handle connection updates ──
    if (event === "connection.update") {
      const state = body.data?.state || body.state || "";
      if (instance && state) {
        const statusMap: Record<string, string> = {
          open: "connected",
          close: "disconnected",
          connecting: "connecting",
        };
        const mappedStatus = statusMap[state] || state;
        await supabase
          .from("whatsapp_instances")
          .update({ status: mappedStatus })
          .eq("id", instance.id);
        console.log(`[evolution-webhook] instance ${instance.name} status → ${mappedStatus}`);
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Handle incoming messages ──
    if (event === "messages.upsert") {
      const data = body.data || {};
      const key = data.key || {};
      const fromMe = key.fromMe === true;
      const remoteJid = key.remoteJid || "";
      const messageContent = data.message?.conversation
        || data.message?.extendedTextMessage?.text
        || data.message?.imageMessage?.caption
        || data.message?.videoMessage?.caption
        || data.message?.documentMessage?.fileName
        || "[mídia]";
      const pushName = data.pushName || "";

      // Extract phone from JID (e.g., "5511999999999@s.whatsapp.net")
      const phone = remoteJid.split("@")[0];
      if (!phone || phone.includes("-")) {
        // Skip group messages
        return new Response(JSON.stringify({ ok: true, skipped: "group" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const tenantId = instance?.tenant_id || null;
      const instanceId = instance?.id || null;

      // Log the message
      await supabase.from("whatsapp_message_log").insert({
        contact_phone: phone,
        contact_name: pushName || "",
        instance_id: instanceId,
        instance_name: instance?.name || instanceName,
        message_content: messageContent.substring(0, 5000),
        direction: fromMe ? "outbound" : "inbound",
        status: "sent",
        tenant_id: tenantId,
      });

      // Upsert conversation
      const { data: existingConv } = await supabase
        .from("whatsapp_conversations")
        .select("id, unread_count")
        .eq("contact_phone", phone)
        .eq("tenant_id", tenantId)
        .limit(1)
        .maybeSingle();

      if (existingConv) {
        await supabase
          .from("whatsapp_conversations")
          .update({
            last_message: messageContent.substring(0, 200),
            last_message_at: new Date().toISOString(),
            unread_count: fromMe ? existingConv.unread_count : existingConv.unread_count + 1,
            contact_name: pushName || undefined,
            instance_id: instanceId,
            status: "open",
          })
          .eq("id", existingConv.id);
      } else {
        await supabase.from("whatsapp_conversations").insert({
          contact_phone: phone,
          contact_name: pushName || phone,
          last_message: messageContent.substring(0, 200),
          last_message_at: new Date().toISOString(),
          unread_count: fromMe ? 0 : 1,
          status: "open",
          instance_id: instanceId,
          tenant_id: tenantId,
          tags: [],
        });
      }

      console.log(`[evolution-webhook] message ${fromMe ? "out" : "in"} from ${phone}: ${messageContent.substring(0, 50)}`);

      return new Response(JSON.stringify({ ok: true, phone, direction: fromMe ? "outbound" : "inbound" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Handle message status updates ──
    if (event === "messages.update") {
      // Could update delivery status (delivered, read) — future enhancement
      return new Response(JSON.stringify({ ok: true, event: "status_update" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Unknown event — just acknowledge
    return new Response(JSON.stringify({ ok: true, event, ignored: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[evolution-webhook] error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
