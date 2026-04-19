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
    
    // Log full payload for debugging
    console.log(`[webhook] FULL PAYLOAD: ${JSON.stringify(payload).substring(0, 2000)}`);
    
    // Normalize event name (Evolution v1 vs v2 formats)
    const rawEvent = payload.event || payload.type || "";
    const event = rawEvent.toLowerCase().replace(/_/g, ".").replace(/\s+/g, ".");
    
    // Extract instance name from multiple possible fields
    const instanceName = payload.instance || payload.instanceName || payload.sender?.instance || "";
    const apiInstanceId = payload.instanceId || payload.instance_id || "";

    console.log(`[webhook] event="${rawEvent}" normalized="${event}" instance="${instanceName}" apiId="${apiInstanceId}" keys=${Object.keys(payload).join(",")}`);

    // Find our instance record - try multiple strategies
    let instanceRecord: any = null;
    if (instanceName) {
      const { data } = await supabase
        .from("whatsapp_instances")
        .select("id, tenant_id, instance_name")
        .eq("instance_name", instanceName)
        .maybeSingle();
      instanceRecord = data;
    }
    // Fallback: try by api instance id in name field
    if (!instanceRecord && apiInstanceId) {
      const { data } = await supabase
        .from("whatsapp_instances")
        .select("id, tenant_id, instance_name")
        .eq("instance_name", apiInstanceId)
        .maybeSingle();
      instanceRecord = data;
    }
    // Fallback: try partial match on instance_name
    if (!instanceRecord && instanceName) {
      const { data } = await supabase
        .from("whatsapp_instances")
        .select("id, tenant_id, instance_name")
        .ilike("instance_name", `%${instanceName}%`)
        .limit(1)
        .maybeSingle();
      instanceRecord = data;
    }
    // Fallback: if only one instance exists, use it
    if (!instanceRecord) {
      const { data, count } = await supabase
        .from("whatsapp_instances")
        .select("id, tenant_id, instance_name", { count: "exact" })
        .eq("active", true)
        .limit(1);
      if (count === 1 && data?.[0]) {
        instanceRecord = data[0];
        console.log(`[webhook] fallback to single active instance: ${instanceRecord.id}`);
      }
    }

    if (!instanceRecord) {
      console.warn(`[webhook] NO INSTANCE FOUND for name="${instanceName}" apiId="${apiInstanceId}"`);
    }

    const tenantId = instanceRecord?.tenant_id || null;
    const instanceId = instanceRecord?.id || null;

    // ── CONNECTION_UPDATE ──
    if (event === "connection.update") {
      const state = payload.data?.state || payload.state || "";

      // Map Evolution states to our status values:
      //   open       → connected   (pareado e online)
      //   connecting → connecting  (aguardando QR / pareamento — NÃO marcamos disconnected)
      //   close      → disconnected
      // Sempre gravamos `last_state_at` para detectar instâncias travadas.
      let mappedStatus: string | null = null;
      if (state === "open") mappedStatus = "connected";
      else if (state === "close") mappedStatus = "disconnected";
      else if (state === "connecting") mappedStatus = "connecting";

      console.log(`[webhook] connection.update state="${state}" → "${mappedStatus ?? 'IGNORED'}" instanceId=${instanceId}`);

      if (mappedStatus && instanceRecord) {
        // Não rebaixar uma instância já `connected` para `connecting`
        // (Evolution às vezes manda `connecting` mesmo após pareada quando reconecta socket)
        const { data: current } = await supabase
          .from("whatsapp_instances")
          .select("status")
          .eq("id", instanceRecord.id)
          .maybeSingle();

        const shouldUpdate =
          mappedStatus === "connected" ||
          mappedStatus === "disconnected" ||
          (mappedStatus === "connecting" && current?.status !== "connected");

        if (shouldUpdate) {
          await supabase
            .from("whatsapp_instances")
            .update({ status: mappedStatus })
            .eq("id", instanceRecord.id);
        }
      }

      return new Response(JSON.stringify({ ok: true, status: mappedStatus ?? "ignored", state }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── MESSAGES_UPSERT ──
    // Handle various event name formats: messages.upsert, messages.upsert, MESSAGES_UPSERT
    if (event === "messages.upsert" || event === "messages.upsert" || rawEvent === "MESSAGES_UPSERT" || rawEvent === "messages.upsert") {
      // Extract messages from various payload structures
      let messages: any[] = [];
      if (Array.isArray(payload.data?.messages)) {
        messages = payload.data.messages;
      } else if (Array.isArray(payload.data)) {
        messages = payload.data;
      } else if (payload.data?.message) {
        messages = [payload.data];
      } else if (payload.data?.key) {
        // Single message at data level
        messages = [payload.data];
      } else if (payload.message) {
        messages = [payload];
      }

      console.log(`[webhook] messages.upsert: ${messages.length} message(s) to process`);

      let processed = 0;
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
        
        // Extract message content from various message types
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

        console.log(`[webhook] msg: phone=${phone} name=${contactName} dir=${direction} content="${typeof content === 'string' ? content.substring(0, 50) : '[obj]'}"`);

        // Upsert conversation
        const { data: existing } = await supabase
          .from("whatsapp_conversations")
          .select("id, unread_count")
          .eq("contact_phone", phone)
          .eq("instance_id", instanceId)
          .maybeSingle();

        const safeContent = typeof content === "string" ? content.substring(0, 500) : "[mídia]";

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

        // Log message
        await supabase.from("whatsapp_message_log").insert({
          contact_phone: phone,
          contact_name: contactName,
          instance_name: instanceRecord?.instance_name || instanceName || null,
          instance_id: instanceId,
          message_content: typeof content === "string" ? content.substring(0, 2000) : "[mídia]",
          direction,
          status: "delivered",
          tenant_id: tenantId,
        });

        // Avança Flow Session se houver uma esperando input deste contato
        if (direction === "inbound" && instanceId && phone) {
          try {
            const userText = typeof content === "string" ? content : "";
            const { data: sessionId } = await supabase.rpc("advance_flow_session_with_input", {
              _instance_id: instanceId,
              _contact_phone: phone,
              _user_input: userText,
            });
            if (sessionId) {
              console.log(`[webhook] flow session ${sessionId} reactivated by inbound input`);
            }
          } catch (e) {
            console.error("[webhook] advance_flow_session_with_input error:", e);
          }
        }

        processed++;
      }

      console.log(`[webhook] messages.upsert: processed=${processed}/${messages.length}`);
      return new Response(JSON.stringify({ ok: true, processed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── MESSAGES_UPDATE (status updates like delivered, read) ──
    if (event === "messages.update" || rawEvent === "MESSAGES_UPDATE") {
      console.log(`[webhook] messages.update received, acknowledging`);
      return new Response(JSON.stringify({ ok: true, event: "messages.update" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Other events — acknowledge
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
