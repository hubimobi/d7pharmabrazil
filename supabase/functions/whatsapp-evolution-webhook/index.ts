import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const payload = await req.json();
    
    // Normalize event name (Evolution v1 vs v2 formats)
    const event = (payload.event || payload.type || "").toLowerCase().replace(/_/g, ".");
    
    // Extract instance name from multiple possible fields
    const instanceName = payload.instance || payload.instanceName || payload.sender?.instance || "";
    const apiInstanceId = payload.instanceId || payload.instance_id || "";

    console.log(`[webhook] event=${event} instance=${instanceName} apiId=${apiInstanceId} keys=${Object.keys(payload).join(",")}`);

    // Find our instance record - try multiple strategies
    let instanceRecord: any = null;
    if (instanceName) {
      const { data } = await supabase
        .from("whatsapp_instances")
        .select("id, tenant_id")
        .eq("instance_name", instanceName)
        .maybeSingle();
      instanceRecord = data;
    }
    // Fallback: try by api instance id in name field
    if (!instanceRecord && apiInstanceId) {
      const { data } = await supabase
        .from("whatsapp_instances")
        .select("id, tenant_id")
        .eq("instance_name", apiInstanceId)
        .maybeSingle();
      instanceRecord = data;
    }
    // Fallback: if only one instance exists, use it
    if (!instanceRecord) {
      const { data, count } = await supabase
        .from("whatsapp_instances")
        .select("id, tenant_id", { count: "exact" })
        .eq("active", true)
        .limit(1);
      if (count === 1 && data?.[0]) {
        instanceRecord = data[0];
        console.log(`[webhook] fallback to single active instance: ${instanceRecord.id}`);
      }
    }

    if (!instanceRecord) {
      console.warn(`[webhook] NO INSTANCE FOUND for name=${instanceName} apiId=${apiInstanceId}`);
    }

    const tenantId = instanceRecord?.tenant_id || null;
    const instanceId = instanceRecord?.id || null;

    // ── CONNECTION_UPDATE ──
    if (event === "connection.update") {
      const state = payload.data?.state || payload.state || "";
      const mappedStatus = state === "open" ? "connected" : state === "close" ? "disconnected" : "qr_ready";

      if (instanceRecord) {
        await supabase
          .from("whatsapp_instances")
          .update({ status: mappedStatus })
          .eq("id", instanceRecord.id);
      }

      return new Response(JSON.stringify({ ok: true, status: mappedStatus }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── MESSAGES_UPSERT ──
    if (event === "messages.upsert") {
      const messages = payload.data?.messages || payload.data || [];
      const msgList = Array.isArray(messages) ? messages : [messages];

      for (const msg of msgList) {
        const key = msg.key || {};
        const isFromMe = key.fromMe === true;
        const remoteJid = key.remoteJid || "";
        // Skip status@broadcast and groups
        if (!remoteJid || remoteJid === "status@broadcast" || remoteJid.includes("@g.us")) continue;

        const phone = remoteJid.replace("@s.whatsapp.net", "").replace("@c.us", "");
        const contactName = msg.pushName || msg.verifiedBizName || phone;
        const content =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          msg.message?.videoMessage?.caption ||
          msg.message?.documentMessage?.caption ||
          msg.message?.buttonsResponseMessage?.selectedDisplayText ||
          msg.message?.listResponseMessage?.title ||
          "[mídia]";
        const direction = isFromMe ? "outbound" : "inbound";

        // Upsert conversation
        const { data: existing } = await supabase
          .from("whatsapp_conversations")
          .select("id, unread_count")
          .eq("contact_phone", phone)
          .eq("instance_id", instanceId)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("whatsapp_conversations")
            .update({
              contact_name: contactName,
              last_message: typeof content === "string" ? content.substring(0, 500) : "[mídia]",
              last_message_at: new Date().toISOString(),
              unread_count: direction === "inbound" ? (existing.unread_count || 0) + 1 : existing.unread_count,
              status: "open",
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("whatsapp_conversations").insert({
            contact_phone: phone,
            contact_name: contactName,
            last_message: typeof content === "string" ? content.substring(0, 500) : "[mídia]",
            last_message_at: new Date().toISOString(),
            unread_count: direction === "inbound" ? 1 : 0,
            status: "open",
            instance_id: instanceId,
            tenant_id: tenantId,
          });
        }

        // Log message
        await supabase.from("whatsapp_message_log").insert({
          contact_phone: phone,
          contact_name: contactName,
          instance_name: instanceName || null,
          instance_id: instanceId,
          message_content: typeof content === "string" ? content.substring(0, 2000) : "[mídia]",
          direction,
          status: "delivered",
          tenant_id: tenantId,
        });
      }

      return new Response(JSON.stringify({ ok: true, processed: msgList.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Other events — acknowledge
    console.log(`[webhook] ignored event: ${event}`);
    return new Response(JSON.stringify({ ok: true, event, ignored: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[whatsapp-evolution-webhook] error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
