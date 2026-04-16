import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function ensureBrazilCountryCode(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) {
    return "55" + digits;
  }
  return digits;
}

async function safeJson(res: Response): Promise<{ ok: boolean; status: number; data: any }> {
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    return { ok: res.ok, status: res.status, data };
  } catch {
    return {
      ok: false,
      status: res.status,
      data: { error: "Evolution API retornou resposta inválida (não-JSON)", status: res.status, body_preview: text.substring(0, 200) },
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Reset daily counters if needed
    const { data: allInstances } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("active", true);

    for (const inst of allInstances || []) {
      const lastReset = new Date(inst.last_reset_at || 0);
      const now = new Date();
      if (lastReset.toDateString() !== now.toDateString()) {
        await supabase.from("whatsapp_instances").update({
          messages_sent_today: 0,
          last_reset_at: now.toISOString(),
        }).eq("id", inst.id);
      }
    }

    // Check connected instances
    const connectedInstances = (allInstances || []).filter(i => i.status === "connected");

    // Fetch pending messages due for sending
    const { data: messages } = await supabase
      .from("whatsapp_message_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .order("priority", { ascending: true })
      .order("scheduled_at", { ascending: true })
      .limit(20);

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ 
        processed: 0, 
        total: 0,
        connected_instances: connectedInstances.length,
        total_instances: (allInstances || []).length,
        diagnostic: connectedInstances.length === 0 
          ? "Nenhuma instância conectada. Conecte pelo menos uma instância para enviar mensagens."
          : "Nenhuma mensagem pendente na fila."
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // If no connected instances, mark all as postponed with clear reason
    if (connectedInstances.length === 0) {
      const postponedAt = new Date(Date.now() + 600000).toISOString(); // retry in 10 min
      for (const msg of messages) {
        await supabase.from("whatsapp_message_queue").update({
          scheduled_at: postponedAt,
          error_message: "Aguardando instância conectada",
        }).eq("id", msg.id);
      }
      return new Response(JSON.stringify({
        processed: 0,
        postponed: messages.length,
        total: messages.length,
        connected_instances: 0,
        total_instances: (allInstances || []).length,
        diagnostic: `${messages.length} mensagem(ns) adiada(s): nenhuma instância WhatsApp conectada.`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const funnelIds = Array.from(new Set(messages.map((msg) => msg.funnel_id).filter(Boolean)));
    const funnelTypeById = new Map<string, string>();
    if (funnelIds.length > 0) {
      const { data: funnelData } = await supabase.from("whatsapp_funnels").select("id, type").in("id", funnelIds);
      for (const funnel of funnelData || []) funnelTypeById.set(funnel.id, funnel.type);
    }

    const normalizeRoles = (roles: unknown): string[] => {
      if (!Array.isArray(roles) || roles.length === 0) return ["all"];
      const values = roles.filter((role): role is string => typeof role === "string");
      return values.includes("all") ? ["all"] : values;
    };

    let processed = 0;
    let errors = 0;
    let postponed = 0;

    for (const msg of messages) {
      // Check if this is a special step type (condition, transfer, send_file)
      let parsedContent: any = null;
      try { parsedContent = JSON.parse(msg.message_content); } catch { /* normal text message */ }

      // Handle condition steps
      if (parsedContent?.step_type === "condition") {
        const config = parsedContent.config || {};
        let conditionMet = false;

        if (config.condition_type === "replied") {
          const { count } = await supabase
            .from("whatsapp_message_log")
            .select("*", { count: "exact", head: true })
            .eq("contact_phone", msg.contact_phone)
            .eq("direction", "inbound");
          conditionMet = (count || 0) > 0;
        } else if (config.condition_type === "tag_added") {
          const { count } = await supabase
            .from("customer_tags")
            .select("*", { count: "exact", head: true })
            .eq("customer_email", msg.contact_phone)
            .eq("tag", config.tag_name || "");
          conditionMet = (count || 0) > 0;
        } else if (config.condition_type === "clicked_link" || config.condition_type === "accessed_link") {
          conditionMet = false;
        }

        if (config.expected === false) conditionMet = !conditionMet;

        await supabase.from("whatsapp_message_queue").update({
          status: "sent",
          sent_at: new Date().toISOString(),
          message_content: `Condition: ${config.condition_type} = ${conditionMet}`,
        }).eq("id", msg.id);

        processed++;
        continue;
      }

      // Handle transfer steps
      if (parsedContent?.step_type === "transfer") {
        const config = parsedContent.config || {};
        if (config.transfer_to && config.target_id) {
          await supabase
            .from("whatsapp_conversations")
            .update({ assigned_to: config.target_id, assigned_type: config.transfer_to })
            .eq("contact_phone", msg.contact_phone);
        }

        await supabase.from("whatsapp_message_queue").update({
          status: "sent",
          sent_at: new Date().toISOString(),
          message_content: `Transfer: ${config.transfer_to} → ${config.target_id || "auto"}`,
        }).eq("id", msg.id);

        processed++;
        continue;
      }

      // Random delay between 3-10 seconds (reduced for faster processing)
      const delay = 3000 + Math.random() * 7000;
      await new Promise(r => setTimeout(r, delay));

      // Pick instance
      let instance;
      if (msg.instance_id) {
        const { data } = await supabase.from("whatsapp_instances").select("*").eq("id", msg.instance_id).eq("active", true).eq("status", "connected").single();
        instance = data;
      }
      if (!instance) {
        const funnelType = msg.funnel_id ? funnelTypeById.get(msg.funnel_id) : null;
        instance = connectedInstances.find((candidate) => {
          const roles = normalizeRoles(candidate.funnel_roles);
          if (candidate.messages_sent_today >= candidate.daily_limit) return false;
          return roles.includes("all") || (!!funnelType && roles.includes(funnelType));
        });
        // Fallback: any connected instance with capacity
        if (!instance) {
          instance = connectedInstances.find(i => i.messages_sent_today < i.daily_limit);
        }
      }

      if (!instance) {
        await supabase.from("whatsapp_message_queue").update({
          scheduled_at: new Date(Date.now() + 1800000).toISOString(),
          error_message: "Limite diário atingido em todas as instâncias",
        }).eq("id", msg.id);
        postponed++;
        continue;
      }

      // Handle send_file step type
      if (parsedContent?.step_type === "send_file") {
        const config = parsedContent.config || {};
        const formattedPhone = msg.contact_phone.replace(/\D/g, "");
        try {
          let endpoint = "sendText";
          let body: any = { number: formattedPhone, text: config.caption || config.url || "" };

          if (config.file_type === "file" || config.file_type === "audio") {
            endpoint = "sendMedia";
            body = {
              number: formattedPhone,
              mediatype: config.file_type === "audio" ? "audio" : "document",
              media: config.url,
              caption: config.caption || "",
            };
          } else if (config.file_type === "link") {
            let finalUrl = config.url;
            if (config.use_shortener) {
              const code = Math.random().toString(36).substring(2, 8).toUpperCase();
              await supabase.from("short_links").insert({
                code,
                destination_url: config.url,
                title: `Funil ${msg.funnel_id || "auto"}`,
              });
              finalUrl = `${Deno.env.get("SUPABASE_URL")?.replace("supabase.co", "lovable.app")}/l/${code}`;
            }
            body = { number: formattedPhone, text: `${config.caption ? config.caption + "\n" : ""}${finalUrl}` };
          }

          const evoRes = await fetch(`${instance.api_url}/message/${endpoint}/${instance.instance_name}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: instance.api_key },
            body: JSON.stringify(body),
          });
          const evo = await safeJson(evoRes);

          if (evo.ok) {
            await supabase.from("whatsapp_message_queue").update({ status: "sent", sent_at: new Date().toISOString(), message_content: `[${config.file_type}] ${config.url}` }).eq("id", msg.id);
            await supabase.from("whatsapp_message_log").insert({
              contact_phone: msg.contact_phone, contact_name: msg.contact_name, instance_id: instance.id, instance_name: instance.name,
              message_content: `[${config.file_type}] ${config.url}`, direction: "outbound", status: "sent", funnel_id: msg.funnel_id, step_id: msg.step_id,
              tenant_id: instance.tenant_id || msg.tenant_id || null,
            });
            await supabase.from("whatsapp_instances").update({ messages_sent_today: instance.messages_sent_today + 1, last_message_at: new Date().toISOString() }).eq("id", instance.id);
            processed++;
          } else {
            await handleSendError(supabase, msg, evo.data);
            errors++;
          }
        } catch (sendErr) {
          await handleRetry(supabase, msg, sendErr.message);
          errors++;
        }
        continue;
      }

      // Standard text message send
      const formattedPhone = msg.contact_phone.replace(/\D/g, "");
      try {
        const evoRes = await fetch(`${instance.api_url}/message/sendText/${instance.instance_name}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: instance.api_key },
          body: JSON.stringify({ number: formattedPhone, text: msg.message_content }),
        });
        const evo = await safeJson(evoRes);

        if (evo.ok) {
          await supabase.from("whatsapp_message_queue").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", msg.id);
          await supabase.from("whatsapp_message_log").insert({
            contact_phone: msg.contact_phone, contact_name: msg.contact_name, instance_id: instance.id, instance_name: instance.name,
            message_content: msg.message_content, direction: "outbound", status: "sent", funnel_id: msg.funnel_id, step_id: msg.step_id,
            tenant_id: instance.tenant_id || msg.tenant_id || null,
          });

          // Upsert conversation
          const { data: existingConv } = await supabase
            .from("whatsapp_conversations")
            .select("id")
            .eq("contact_phone", msg.contact_phone)
            .eq("instance_id", instance.id)
            .maybeSingle();

          if (existingConv) {
            await supabase.from("whatsapp_conversations").update({
              last_message: msg.message_content.substring(0, 500),
              last_message_at: new Date().toISOString(),
              contact_name: msg.contact_name || msg.contact_phone,
            }).eq("id", existingConv.id);
          } else {
            await supabase.from("whatsapp_conversations").insert({
              contact_phone: msg.contact_phone,
              contact_name: msg.contact_name || msg.contact_phone,
              last_message: msg.message_content.substring(0, 500),
              last_message_at: new Date().toISOString(),
              unread_count: 0,
              status: "open",
              instance_id: instance.id,
              tenant_id: instance.tenant_id || msg.tenant_id || null,
            });
          }

          await supabase.from("whatsapp_instances").update({ messages_sent_today: instance.messages_sent_today + 1, last_message_at: new Date().toISOString() }).eq("id", instance.id);
          processed++;
        } else {
          await handleSendError(supabase, msg, evo.data);
          errors++;
        }
      } catch (sendErr) {
        await handleRetry(supabase, msg, sendErr.message);
        errors++;
      }
    }

    return new Response(JSON.stringify({ 
      processed, errors, postponed, total: messages.length,
      connected_instances: connectedInstances.length,
      diagnostic: processed > 0 
        ? `${processed} enviada(s), ${errors} erro(s), ${postponed} adiada(s)`
        : errors > 0 
          ? `Todas falharam: ${errors} erro(s)`
          : `${postponed} adiada(s) por falta de capacidade`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("whatsapp-process-queue error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});

async function handleSendError(supabase: any, msg: any, errorData: any) {
  const retryCount = (msg.retry_count || 0) + 1;
  if (retryCount >= msg.max_retries) {
    await supabase.from("whatsapp_message_queue").update({
      status: "failed", error_message: JSON.stringify(errorData), retry_count: retryCount,
    }).eq("id", msg.id);
    await supabase.from("whatsapp_message_log").insert({
      contact_phone: msg.contact_phone, contact_name: msg.contact_name, instance_id: null, instance_name: null,
      message_content: msg.message_content, direction: "outbound", status: "error", funnel_id: msg.funnel_id, step_id: msg.step_id,
      error_message: JSON.stringify(errorData),
      tenant_id: msg.tenant_id || null,
    });
  } else {
    await supabase.from("whatsapp_message_queue").update({
      retry_count: retryCount, scheduled_at: new Date(Date.now() + 300000 * retryCount).toISOString(), error_message: JSON.stringify(errorData),
    }).eq("id", msg.id);
  }
}

async function handleRetry(supabase: any, msg: any, errorMessage: string) {
  const retryCount = (msg.retry_count || 0) + 1;
  await supabase.from("whatsapp_message_queue").update({
    retry_count: retryCount, error_message: errorMessage,
    status: retryCount >= msg.max_retries ? "failed" : "pending",
    scheduled_at: new Date(Date.now() + 300000 * retryCount).toISOString(),
  }).eq("id", msg.id);
}
