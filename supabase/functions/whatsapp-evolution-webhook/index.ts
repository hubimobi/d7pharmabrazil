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

    // Webhook secret validation
    const authHeader = req.headers.get("apikey");
    const webhookSecret = Deno.env.get("WHATSAPP_WEBHOOK_SECRET");

    if (webhookSecret && authHeader !== webhookSecret) {
      console.error("[webhook] UNAUTHORIZED: invalid apikey header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const payload = await req.json();

    console.log(`[webhook] FULL PAYLOAD: ${JSON.stringify(payload).substring(0, 2000)}`);

    // Normalize event name (Evolution v1 vs v2 formats)
    const rawEvent = payload.event || payload.type || "";
    const event = rawEvent.toLowerCase().replace(/_/g, ".").replace(/\s+/g, ".");

    const instanceName = payload.instance || payload.instanceName || payload.sender?.instance || "";
    const apiInstanceId = payload.instanceId || payload.instance_id || "";

    console.log(`[webhook] event="${rawEvent}" normalized="${event}" instance="${instanceName}" apiId="${apiInstanceId}" keys=${Object.keys(payload).join(",")}`);

    // Find our instance record — try multiple strategies
    let instanceRecord: any = null;
    if (instanceName) {
      const { data } = await supabase
        .from("whatsapp_instances")
        .select("id, tenant_id, instance_name")
        .eq("instance_name", instanceName)
        .maybeSingle();
      instanceRecord = data;
    }
    if (!instanceRecord && apiInstanceId) {
      const { data } = await supabase
        .from("whatsapp_instances")
        .select("id, tenant_id, instance_name")
        .eq("instance_name", apiInstanceId)
        .maybeSingle();
      instanceRecord = data;
    }
    // Fallback: partial match (last resort)
    if (!instanceRecord && instanceName) {
      const { data } = await supabase
        .from("whatsapp_instances")
        .select("id, tenant_id, instance_name")
        .ilike("instance_name", `%${instanceName}%`)
        .limit(1)
        .maybeSingle();
      instanceRecord = data;
    }
    if (!instanceRecord) {
      console.warn(`[webhook] IGNORED: instance not found for name="${instanceName}" apiId="${apiInstanceId}"`);
      return new Response(JSON.stringify({ ok: true, ignored: true, reason: "instance_not_found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tenantId = instanceRecord?.tenant_id || null;
    const instanceId = instanceRecord?.id || null;

    // ── CONNECTION_UPDATE ──
    if (event === "connection.update") {
      const state = payload.data?.state || payload.state || "";

      let mappedStatus: string | null = null;
      if (state === "open") mappedStatus = "connected";
      else if (state === "close") mappedStatus = "disconnected";
      else if (state === "connecting") mappedStatus = "connecting";

      console.log(`[webhook] connection.update state="${state}" → "${mappedStatus ?? "IGNORED"}" instanceId=${instanceId}`);

      if (mappedStatus && instanceRecord) {
        const { data: current } = await supabase
          .from("whatsapp_instances")
          .select("status")
          .eq("id", instanceRecord.id)
          .maybeSingle();

        // Don't downgrade connected → connecting (Evolution sends spurious connecting events)
        const shouldUpdate =
          mappedStatus === "connected" ||
          mappedStatus === "disconnected" ||
          (mappedStatus === "connecting" && current?.status !== "connected");

        if (shouldUpdate) {
          await supabase
            .from("whatsapp_instances")
            .update({ status: mappedStatus, last_state_at: new Date().toISOString() })
            .eq("id", instanceRecord.id);
        }
      }

      return new Response(JSON.stringify({ ok: true, status: mappedStatus ?? "ignored", state }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── MESSAGES_UPSERT ──
    // FIX: removed duplicate condition (was `event === "messages.upsert" || event === "messages.upsert"`)
    if (event === "messages.upsert" || rawEvent === "MESSAGES_UPSERT") {
      let messages: any[] = [];
      if (Array.isArray(payload.data?.messages)) {
        messages = payload.data.messages;
      } else if (Array.isArray(payload.data)) {
        messages = payload.data;
      } else if (payload.data?.message) {
        messages = [payload.data];
      } else if (payload.data?.key) {
        messages = [payload.data];
      } else if (payload.message) {
        messages = [payload];
      }

      console.log(`[webhook] messages.upsert: ${messages.length} message(s) to process`);

      let processedCount = 0;
      for (const msg of messages) {
        const key = msg.key || {};
        const isFromMe = key.fromMe === true;
        const remoteJid = key.remoteJid || msg.remoteJid || "";

        // Skip status@broadcast and groups
        if (!remoteJid || remoteJid === "status@broadcast" || remoteJid.includes("@g.us")) {
          console.log(`[webhook] skipping jid=${remoteJid}`);
          continue;
        }

        const phone = remoteJid.replace("@s.whatsapp.net", "").replace("@c.us", "");
        const contactName = msg.pushName || msg.verifiedBizName || phone;

        const msgBody = msg.message || {};
        const content =
          msgBody.conversation ||
          msgBody.extendedTextMessage?.text ||
          msgBody.imageMessage?.caption ||
          msgBody.videoMessage?.caption ||
          msgBody.documentMessage?.caption ||
          msgBody.buttonsResponseMessage?.selectedDisplayText ||
          msgBody.listResponseMessage?.title ||
          msgBody.templateButtonReplyMessage?.selectedDisplayText ||
          msgBody.contactMessage?.displayName ||
          (msgBody.audioMessage ? "[áudio]" : null) ||
          (msgBody.stickerMessage ? "[figurinha]" : null) ||
          (msgBody.imageMessage ? "[imagem]" : null) ||
          (msgBody.videoMessage ? "[vídeo]" : null) ||
          (msgBody.documentMessage ? "[documento]" : null) ||
          (msgBody.locationMessage ? "[localização]" : null) ||
          "[mídia]";

        const direction = isFromMe ? "outbound" : "inbound";
        const safeContent = typeof content === "string" ? content.substring(0, 500) : "[mídia]";

        console.log(`[webhook] msg: phone=${phone} name=${contactName} dir=${direction} content="${safeContent.substring(0, 50)}"`);

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
              last_message: safeContent,
              last_message_at: new Date().toISOString(),
              unread_count: direction === "inbound" ? (existing.unread_count || 0) + 1 : existing.unread_count,
              status: "open",
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("whatsapp_conversations").insert({
            contact_phone: phone,
            contact_name: contactName,
            last_message: safeContent,
            last_message_at: new Date().toISOString(),
            unread_count: direction === "inbound" ? 1 : 0,
            status: "open",
            instance_id: instanceId,
            tenant_id: tenantId,
          });
        }

        // FIX: outbound messages are already logged by process-queue with api_id.
        // Logging them again here would create duplicate entries in the message log.
        // We skip outbound logging here — status updates come via messages.update.
        // Only log inbound messages from the webhook.
        if (direction === "inbound") {
          await supabase.from("whatsapp_message_log").insert({
            contact_phone: phone,
            contact_name: contactName,
            instance_name: instanceRecord?.instance_name || instanceName || null,
            instance_id: instanceId,
            message_content: typeof content === "string" ? content.substring(0, 2000) : "[mídia]",
            direction: "inbound",
            status: "delivered",
            tenant_id: tenantId,
          });

          // Advance Flow Session if one is waiting for input from this contact
          if (phone && tenantId) {
            try {
              const userText = typeof content === "string" ? content : "";
              const { data: sessionId } = await supabase.rpc("advance_flow_session_with_input", {
                _contact_phone: phone,
                _tenant_id: tenantId,
                _user_input: userText,
              });
              if (sessionId) {
                console.log(`[webhook] flow session ${sessionId} reactivated by inbound input`);
              }
            } catch (e) {
              console.error("[webhook] advance_flow_session_with_input error:", e);
            }
          }
        }

        processedCount++;
      }

      console.log(`[webhook] messages.upsert: processed=${processedCount}/${messages.length}`);
      return new Response(JSON.stringify({ ok: true, processed: processedCount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── MESSAGES_UPDATE (delivery / read receipts) ──
    if (event === "messages.update" || rawEvent === "MESSAGES_UPDATE") {
      const updates = payload.data || [];
      const updateList = Array.isArray(updates) ? updates : [updates];

      let updatedCount = 0;
      for (const upd of updateList) {
        const messageId = upd.key?.id;
        const status = upd.status;

        if (!messageId || !status) continue;

        // Evolution status codes: 3=delivered, 4=read, 5=played
        let mappedStatus = null;
        if (status === 3) mappedStatus = "delivered";
        else if (status === 4 || status === 5) mappedStatus = "read";

        if (mappedStatus) {
          const { error } = await supabase
            .from("whatsapp_message_log")
            .update({ status: mappedStatus })
            .eq("api_id", messageId);

          if (!error) updatedCount++;
        }
      }

      console.log(`[webhook] messages.update: updated ${updatedCount}/${updateList.length} status logs`);
      return new Response(JSON.stringify({ ok: true, updated: updatedCount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Other events — acknowledge silently
    console.log(`[webhook] ignored event: ${event} (raw: ${rawEvent})`);
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
