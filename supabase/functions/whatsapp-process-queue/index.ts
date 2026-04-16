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

interface SendingConfig {
  messages_per_batch: number;
  batch_interval_seconds: number;
  batch_interval_variance: number;
  daily_global_limit: number;
  validate_numbers: boolean;
  warmup_mode: boolean;
  warmup_daily_increase: number;
}

const DEFAULT_CONFIG: SendingConfig = {
  messages_per_batch: 10,
  batch_interval_seconds: 30,
  batch_interval_variance: 15,
  daily_global_limit: 500,
  validate_numbers: true,
  warmup_mode: false,
  warmup_daily_increase: 20,
};

async function loadSendingConfig(supabase: any, tenantId: string | null): Promise<SendingConfig> {
  if (!tenantId) return DEFAULT_CONFIG;
  const { data } = await supabase
    .from("whatsapp_sending_config")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!data) return DEFAULT_CONFIG;
  return {
    messages_per_batch: data.messages_per_batch ?? DEFAULT_CONFIG.messages_per_batch,
    batch_interval_seconds: data.batch_interval_seconds ?? DEFAULT_CONFIG.batch_interval_seconds,
    batch_interval_variance: data.batch_interval_variance ?? DEFAULT_CONFIG.batch_interval_variance,
    daily_global_limit: data.daily_global_limit ?? DEFAULT_CONFIG.daily_global_limit,
    validate_numbers: data.validate_numbers ?? DEFAULT_CONFIG.validate_numbers,
    warmup_mode: data.warmup_mode ?? DEFAULT_CONFIG.warmup_mode,
    warmup_daily_increase: data.warmup_daily_increase ?? DEFAULT_CONFIG.warmup_daily_increase,
  };
}

async function validateWhatsAppNumber(
  phone: string,
  instance: any,
  supabase: any,
  tenantId: string | null,
): Promise<boolean> {
  // Check cache first (7 day TTL)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: cached } = await supabase
    .from("whatsapp_number_validation")
    .select("exists_on_whatsapp")
    .eq("phone", phone)
    .gte("validated_at", sevenDaysAgo)
    .maybeSingle();

  if (cached !== null && cached !== undefined) {
    return cached.exists_on_whatsapp;
  }

  // Call Evolution API
  try {
    const res = await fetch(`${instance.api_url}/chat/whatsappNumbers/${instance.instance_name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: instance.api_key },
      body: JSON.stringify({ numbers: [phone] }),
    });
    const data = await res.json();
    // Evolution API returns array of { exists, jid, number }
    const results = Array.isArray(data) ? data : [data];
    const exists = results.some((r: any) => r.exists === true);

    // Cache result
    await supabase.from("whatsapp_number_validation").upsert({
      phone,
      exists_on_whatsapp: exists,
      validated_at: new Date().toISOString(),
      tenant_id: tenantId,
    }, { onConflict: "phone,tenant_id" });

    return exists;
  } catch (err) {
    console.error("Number validation error:", err);
    // On error, allow sending (don't block)
    return true;
  }
}

async function cancelAllPendingForPhone(supabase: any, contactPhone: string, tenantId: string | null) {
  const query = supabase
    .from("whatsapp_message_queue")
    .update({ status: "failed", error_message: "Número não existe no WhatsApp (cancelamento em cascata)" })
    .eq("contact_phone", contactPhone)
    .eq("status", "pending");
  if (tenantId) query.eq("tenant_id", tenantId);
  await query;

  // Log
  await supabase.from("whatsapp_message_log").insert({
    contact_phone: contactPhone,
    contact_name: contactPhone,
    message_content: "Número inválido — todas as mensagens pendentes canceladas",
    direction: "outbound",
    status: "number_invalid",
    tenant_id: tenantId,
  });
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

function computeDelay(config: SendingConfig): number {
  const base = config.batch_interval_seconds * 1000;
  const variance = config.batch_interval_variance * 1000;
  const randomOffset = (Math.random() * 2 - 1) * variance;
  return Math.max(2000, base + randomOffset); // minimum 2s
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

    const connectedInstances = (allInstances || []).filter(i => i.status === "connected");

    // Determine tenant from first connected instance
    const tenantId = connectedInstances[0]?.tenant_id || null;

    // Load sending config
    const config = await loadSendingConfig(supabase, tenantId);

    // Check global daily limit
    const totalSentToday = (allInstances || []).reduce((sum, i) => sum + (i.messages_sent_today || 0), 0);
    let effectiveDailyLimit = config.daily_global_limit;

    if (config.warmup_mode) {
      // In warmup, limit grows based on oldest instance age
      const oldestCreated = (allInstances || []).reduce((oldest, i) => {
        const d = new Date(i.created_at).getTime();
        return d < oldest ? d : oldest;
      }, Date.now());
      const daysActive = Math.floor((Date.now() - oldestCreated) / (24 * 60 * 60 * 1000));
      effectiveDailyLimit = Math.min(config.daily_global_limit, config.warmup_daily_increase * (daysActive + 1));
    }

    if (totalSentToday >= effectiveDailyLimit) {
      return new Response(JSON.stringify({
        processed: 0,
        total: 0,
        diagnostic: `Limite diário global atingido (${totalSentToday}/${effectiveDailyLimit}). Envios pausados até amanhã.`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const remainingCapacity = effectiveDailyLimit - totalSentToday;
    const batchLimit = Math.min(config.messages_per_batch, remainingCapacity);

    // Fetch pending messages
    const { data: messages } = await supabase
      .from("whatsapp_message_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .order("priority", { ascending: true })
      .order("scheduled_at", { ascending: true })
      .limit(batchLimit);

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({
        processed: 0,
        total: 0,
        connected_instances: connectedInstances.length,
        total_instances: (allInstances || []).length,
        daily_sent: totalSentToday,
        daily_limit: effectiveDailyLimit,
        diagnostic: connectedInstances.length === 0
          ? "Nenhuma instância conectada."
          : "Nenhuma mensagem pendente na fila."
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (connectedInstances.length === 0) {
      const postponedAt = new Date(Date.now() + 600000).toISOString();
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
        diagnostic: `${messages.length} mensagem(ns) adiada(s): nenhuma instância conectada.`,
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
    let invalidNumbers = 0;

    for (const msg of messages) {
      // Check if this is a special step type
      let parsedContent: any = null;
      try { parsedContent = JSON.parse(msg.message_content); } catch { /* normal text */ }

      // Handle condition steps
      if (parsedContent?.step_type === "condition") {
        const cfg = parsedContent.config || {};
        let conditionMet = false;

        if (cfg.condition_type === "replied") {
          const { count } = await supabase
            .from("whatsapp_message_log")
            .select("*", { count: "exact", head: true })
            .eq("contact_phone", msg.contact_phone)
            .eq("direction", "inbound");
          conditionMet = (count || 0) > 0;
        } else if (cfg.condition_type === "tag_added") {
          const { count } = await supabase
            .from("customer_tags")
            .select("*", { count: "exact", head: true })
            .eq("customer_email", msg.contact_phone)
            .eq("tag", cfg.tag_name || "");
          conditionMet = (count || 0) > 0;
        } else if (cfg.condition_type === "clicked_link" || cfg.condition_type === "accessed_link") {
          conditionMet = false;
        }

        if (cfg.expected === false) conditionMet = !conditionMet;

        await supabase.from("whatsapp_message_queue").update({
          status: "sent",
          sent_at: new Date().toISOString(),
          message_content: `Condition: ${cfg.condition_type} = ${conditionMet}`,
        }).eq("id", msg.id);

        processed++;
        continue;
      }

      // Handle transfer steps
      if (parsedContent?.step_type === "transfer") {
        const cfg = parsedContent.config || {};
        if (cfg.transfer_to && cfg.target_id) {
          await supabase
            .from("whatsapp_conversations")
            .update({ assigned_to: cfg.target_id, assigned_type: cfg.transfer_to })
            .eq("contact_phone", msg.contact_phone);
        }

        await supabase.from("whatsapp_message_queue").update({
          status: "sent",
          sent_at: new Date().toISOString(),
          message_content: `Transfer: ${cfg.transfer_to} → ${cfg.target_id || "auto"}`,
        }).eq("id", msg.id);

        processed++;
        continue;
      }

      // Smart delay based on config
      const delay = computeDelay(config);
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

      // Number validation (before sending)
      const formattedPhone = ensureBrazilCountryCode(msg.contact_phone);

      if (config.validate_numbers) {
        const exists = await validateWhatsAppNumber(formattedPhone, instance, supabase, msg.tenant_id || tenantId);
        if (!exists) {
          await supabase.from("whatsapp_message_queue").update({
            status: "failed",
            error_message: "Número não existe no WhatsApp",
          }).eq("id", msg.id);
          // Cascade cancel all pending messages for this phone
          await cancelAllPendingForPhone(supabase, msg.contact_phone, msg.tenant_id || tenantId);
          invalidNumbers++;
          errors++;
          continue;
        }
      }

      // Handle send_file step type
      if (parsedContent?.step_type === "send_file") {
        const cfg = parsedContent.config || {};
        try {
          let endpoint = "sendText";
          let body: any = { number: formattedPhone, text: cfg.caption || cfg.url || "" };

          if (cfg.file_type === "file" || cfg.file_type === "audio") {
            endpoint = "sendMedia";
            body = {
              number: formattedPhone,
              mediatype: cfg.file_type === "audio" ? "audio" : "document",
              media: cfg.url,
              caption: cfg.caption || "",
            };
          } else if (cfg.file_type === "link") {
            let finalUrl = cfg.url;
            if (cfg.use_shortener) {
              const code = Math.random().toString(36).substring(2, 8).toUpperCase();
              await supabase.from("short_links").insert({
                code,
                destination_url: cfg.url,
                title: `Funil ${msg.funnel_id || "auto"}`,
              });
              finalUrl = `${Deno.env.get("SUPABASE_URL")?.replace("supabase.co", "lovable.app")}/l/${code}`;
            }
            body = { number: formattedPhone, text: `${cfg.caption ? cfg.caption + "\n" : ""}${finalUrl}` };
          }

          const evoRes = await fetch(`${instance.api_url}/message/${endpoint}/${instance.instance_name}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: instance.api_key },
            body: JSON.stringify(body),
          });
          const evo = await safeJson(evoRes);

          if (evo.ok) {
            await supabase.from("whatsapp_message_queue").update({ status: "sent", sent_at: new Date().toISOString(), message_content: `[${cfg.file_type}] ${cfg.url}` }).eq("id", msg.id);
            await supabase.from("whatsapp_message_log").insert({
              contact_phone: msg.contact_phone, contact_name: msg.contact_name, instance_id: instance.id, instance_name: instance.name,
              message_content: `[${cfg.file_type}] ${cfg.url}`, direction: "outbound", status: "sent", funnel_id: msg.funnel_id, step_id: msg.step_id,
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
      processed, errors, postponed, invalid_numbers: invalidNumbers, total: messages.length,
      connected_instances: connectedInstances.length,
      daily_sent: totalSentToday + processed,
      daily_limit: effectiveDailyLimit,
      config_applied: {
        batch_size: batchLimit,
        interval: `${config.batch_interval_seconds}s ±${config.batch_interval_variance}s`,
        validation: config.validate_numbers,
        warmup: config.warmup_mode,
      },
      diagnostic: processed > 0
        ? `${processed} enviada(s), ${errors} erro(s), ${postponed} adiada(s)${invalidNumbers > 0 ? `, ${invalidNumbers} número(s) inválido(s)` : ""}`
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
