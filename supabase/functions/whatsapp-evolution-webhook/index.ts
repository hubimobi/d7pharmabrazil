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

    // Webhook secret validation — REQUIRED
    const authHeader = req.headers.get("apikey");
    const webhookSecret = Deno.env.get("WHATSAPP_WEBHOOK_SECRET");

    if (!webhookSecret) {
      console.error("[webhook] WHATSAPP_WEBHOOK_SECRET is not configured");
      return new Response(JSON.stringify({ error: "Webhook secret not configured on server" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    if (authHeader !== webhookSecret) {
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
        .select("id, tenant_id, instance_name, api_url, api_key")
        .eq("instance_name", instanceName)
        .maybeSingle();
      instanceRecord = data;
    }
    if (!instanceRecord && apiInstanceId) {
      const { data } = await supabase
        .from("whatsapp_instances")
        .select("id, tenant_id, instance_name, api_url, api_key")
        .eq("instance_name", apiInstanceId)
        .maybeSingle();
      instanceRecord = data;
    }
    // Fallback: partial match (last resort)
    if (!instanceRecord && instanceName) {
      const { data } = await supabase
        .from("whatsapp_instances")
        .select("id, tenant_id, instance_name, api_url, api_key")
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

    // ── QRCODE_UPDATED ─────────────────────────────────────────────────────────
    if (event === "qrcode.updated" || rawEvent === "QRCODE_UPDATED") {
      const qrCode = payload.data?.qrcode?.base64 || payload.data?.base64 || payload.qrcode || null;
      if (qrCode && instanceId) {
        await supabase
          .from("whatsapp_instances")
          .update({ qr_code: qrCode, status: "qr_ready" })
          .eq("id", instanceId);
        console.log(`[webhook] QRCODE_UPDATED for instance ${instanceId}`);
      }
      return new Response(JSON.stringify({ ok: true, event: "qrcode_updated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── CONNECTION_UPDATE ──────────────────────────────────────────────────────
    if (event === "connection.update" || rawEvent === "CONNECTION_UPDATE") {
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
          const updatePayload: Record<string, any> = {
            status: mappedStatus,
            last_state_at: new Date().toISOString(),
          };

          // When connected, try to fetch profile info (owner name/phone)
          if (mappedStatus === "connected" && instanceRecord.api_url && instanceRecord.api_key) {
            try {
              const profileRes = await fetch(
                `${instanceRecord.api_url}/instance/fetchInstances/${instanceRecord.instance_name}`,
                { headers: { apikey: instanceRecord.api_key } }
              );
              if (profileRes.ok) {
                const profileData = await profileRes.json();
                const profile = Array.isArray(profileData) ? profileData[0] : profileData;
                const ownerJid = profile?.instance?.ownerJid || profile?.ownerJid || null;
                const profileName = profile?.instance?.profileName || profile?.profileName || null;
                if (ownerJid) {
                  updatePayload.owner_jid = ownerJid;
                  updatePayload.owner_name = profileName || null;
                  // Extract phone from JID (format: 5547XXXXXXXX@s.whatsapp.net)
                  const phoneFromJid = ownerJid.replace("@s.whatsapp.net", "").replace("@c.us", "");
                  if (phoneFromJid) updatePayload.phone_number = phoneFromJid;
                  console.log(`[webhook] profile fetched: ownerJid=${ownerJid} name=${profileName}`);
                }
              }
            } catch (e) {
              console.warn("[webhook] profile fetch failed:", e);
            }
          }

          await supabase
            .from("whatsapp_instances")
            .update(updatePayload)
            .eq("id", instanceRecord.id);
        }
      }

      return new Response(JSON.stringify({ ok: true, status: mappedStatus ?? "ignored", state }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── MESSAGES_UPSERT ────────────────────────────────────────────────────────
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
          // FIX: also extract interactive response messages (WhatsApp Business interactive lists/buttons)
          msgBody.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson ||
          msgBody.reactionMessage?.text ||
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

        // FIX: only log inbound messages here — outbound are logged by process-queue to avoid duplicates
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
          if (phone) {
            try {
              const userText = typeof content === "string" ? content : "";

              // FIX: handle null tenantId — fall back to instance-based lookup
              let sessionId: string | null = null;

              if (tenantId) {
                const { data } = await supabase.rpc("advance_flow_session_with_input", {
                  _contact_phone: phone,
                  _tenant_id: tenantId,
                  _user_input: userText,
                });
                sessionId = data;
              } else {
                // No tenantId available — use old instance-based signature if it exists
                const { data } = await supabase.rpc("advance_flow_session_with_input", {
                  _instance_id: instanceId,
                  _contact_phone: phone,
                  _user_input: userText,
                });
                sessionId = data;
              }

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

    // ── MESSAGES_UPDATE (delivery / read receipts) ─────────────────────────────
    if (event === "messages.update" || rawEvent === "MESSAGES_UPDATE") {
      const updates = payload.data || [];
      const updateList = Array.isArray(updates) ? updates : [updates];

      let updatedCount = 0;
      for (const upd of updateList) {
        const messageId = upd.key?.id;
        const status = upd.update?.status ?? upd.status;

        if (!messageId || status === undefined || status === null) continue;

        // Evolution status codes: 3=delivered, 4=read, 5=played (audio)
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

    // ── CONTACTS_UPSERT — sync contact names ─────────────────────────────────
    if (event === "contacts.upsert" || rawEvent === "CONTACTS_UPSERT") {
      const contacts = Array.isArray(payload.data) ? payload.data : [];
      let synced = 0;
      for (const contact of contacts) {
        const jid = contact.id || "";
        const phone = jid.replace("@s.whatsapp.net", "").replace("@c.us", "");
        const name = contact.pushName || contact.verifiedBizName || contact.name || null;
        if (!phone || !name) continue;
        await supabase
          .from("whatsapp_conversations")
          .update({ contact_name: name })
          .eq("contact_phone", phone)
          .eq("instance_id", instanceId);
        synced++;
      }
      console.log(`[webhook] contacts.upsert: synced ${synced} names`);
      return new Response(JSON.stringify({ ok: true, synced }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Other events — acknowledge silently
    console.log(`[webhook] ignored event: ${event} (raw: ${rawEvent})`);
    return new Response(JSON.stringify({ ok: true, event, ignored: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[whatsapp-evolution-webhook] error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
