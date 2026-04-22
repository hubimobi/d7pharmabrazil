import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function ensureBrazilCountryCode(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 12 && digits.startsWith("55")) return digits;
  if (digits.length === 10 || digits.length === 11) return "55" + digits;
  return digits;
}

function parseSpintax(text: string): string {
  const regex = /\{([^{}]+)\}/;
  let result = text;
  let match;
  while ((match = regex.exec(result)) !== null) {
    const options = match[1].split("|");
    const chosen = options[Math.floor(Math.random() * options.length)];
    result = result.substring(0, match.index) + chosen + result.substring(match.index + match[0].length);
  }
  return result;
}

function replaceVariables(text: string, vars: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

function configDelayToMinutes(config: any): number {
  const value = Number(config?.delay_value || 0);
  const unit = config?.delay_unit || "m";
  if (unit === "h") return value * 60;
  if (unit === "d") return value * 1440;
  return value;
}

const WebhookSchema = z.object({
  evento: z.string().min(1).max(100),
  nome: z.string().max(200).optional(),
  telefone: z.string().min(10).max(20),
  produto: z.string().max(500).optional(),
  link: z.string().max(2000).optional(),
  cidade: z.string().max(200).optional(),
  extra: z.record(z.string()).optional(),
  funnel_id: z.string().uuid().optional(),
  force: z.boolean().optional(),
  instance_id: z.string().uuid().optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Security: require WHATSAPP_WEBHOOK_SECRET when set.
    // Callers must pass it as Bearer token OR as x-webhook-secret header.
    const webhookSecret = Deno.env.get("WHATSAPP_WEBHOOK_SECRET");
    if (webhookSecret) {
      const authHeader = req.headers.get("authorization") || "";
      const secretHeader = req.headers.get("x-webhook-secret") || "";
      const token = authHeader.replace("Bearer ", "").trim();
      if (token !== webhookSecret && secretHeader !== webhookSecret) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json();
    const parsed = WebhookSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), { status: 400, headers: corsHeaders });
    }

    const { evento, nome, telefone: rawTelefone, produto, link, cidade, extra, funnel_id, force, instance_id: overrideInstanceId } = parsed.data;
    const telefone = ensureBrazilCountryCode(rawTelefone);

    const baseVariables: Record<string, string> = {
      Nome: nome || "", Produto: produto || "", Link: link || "", Cidade: cidade || "", ...extra,
    };

    // ── 1) Trigger new Flows (state machine) ──
    let flowsTriggered = 0;
    try {
      let flowQuery = supabase
        .from("whatsapp_flows")
        .select("id, nodes, tenant_id")
        .eq("trigger_event", evento);
      if (force && funnel_id) flowQuery = flowQuery.eq("id", funnel_id);
      else flowQuery = flowQuery.eq("active", true);

      const { data: flows } = await flowQuery;
      for (const flow of flows ?? []) {
        const firstNodeId = (flow.nodes as any[])?.[0]?.id;
        if (!firstNodeId) continue;

        // Dedup: don't start a new session if one is already active for this contact+flow
        const { data: existing } = await supabase
          .from("whatsapp_flow_sessions")
          .select("id")
          .eq("contact_phone", telefone)
          .eq("flow_id", flow.id)
          .in("status", ["active", "waiting_input"])
          .maybeSingle();
        if (existing) continue;

        await supabase.from("whatsapp_flow_sessions").insert({
          tenant_id: flow.tenant_id,
          instance_id: overrideInstanceId || null,
          contact_phone: telefone,
          contact_name: nome || "",
          flow_id: flow.id,
          current_node_id: firstNodeId,
          variables: baseVariables,
          status: "active",
        });
        flowsTriggered++;
      }
    } catch (e) {
      console.error("flow trigger error:", e);
    }

    // ── 2) Legacy funnels (backward compatibility) ──
    let query = supabase
      .from("whatsapp_funnels")
      .select("*, whatsapp_funnel_steps(*, whatsapp_templates(*))")
      .eq("trigger_event", evento);

    if (force && funnel_id) {
      query = query.eq("id", funnel_id);
    } else {
      query = query.eq("active", true);
    }

    const { data: funnels } = await query;

    if ((!funnels || funnels.length === 0) && flowsTriggered === 0) {
      return new Response(JSON.stringify({ message: "No active funnel/flow for event", evento }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const variables: Record<string, string> = baseVariables;
    let queued = 0;

    for (const funnel of funnels ?? []) {
      const funnelTenantId = funnel.tenant_id || null;

      // FIX: deduplication — skip if there are already pending messages for this phone+funnel.
      // This prevents duplicate queuing when the same webhook fires multiple times (e-commerce retries).
      // Allow re-trigger only in force/test mode.
      if (!force) {
        const { count } = await supabase
          .from("whatsapp_message_queue")
          .select("*", { count: "exact", head: true })
          .eq("contact_phone", telefone)
          .eq("funnel_id", funnel.id)
          .eq("status", "pending");
        if ((count || 0) > 0) {
          console.log(`[webhook] dedup: funnel ${funnel.id} already has ${count} pending msgs for ${telefone}, skipping`);
          continue;
        }
      }

      const steps = (funnel.whatsapp_funnel_steps || []).sort((a: any, b: any) => a.step_order - b.step_order);

      let cumulativeDelay = 0;
      for (const step of steps) {
        if (!step.active) continue;

        const stepType = step.step_type || "message_template";
        const config = step.config || {};

        if (stepType === "pause") {
          cumulativeDelay += configDelayToMinutes(config);
          continue;
        }

        if (stepType === "end") break;

        if (stepType === "condition") {
          const scheduledAt = new Date(Date.now() + cumulativeDelay * 60 * 1000).toISOString();
          await supabase.from("whatsapp_message_queue").insert({
            contact_phone: telefone,
            contact_name: nome || "",
            template_id: null,
            funnel_id: funnel.id,
            step_id: step.id,
            instance_id: null,
            message_content: JSON.stringify({ step_type: "condition", config }),
            variables,
            status: "pending",
            scheduled_at: scheduledAt,
            priority: 1,
            tenant_id: funnelTenantId,
          });
          queued++;
          continue;
        }

        if (stepType === "transfer") {
          const scheduledAt = new Date(Date.now() + cumulativeDelay * 60 * 1000).toISOString();
          await supabase.from("whatsapp_message_queue").insert({
            contact_phone: telefone,
            contact_name: nome || "",
            template_id: null,
            funnel_id: funnel.id,
            step_id: step.id,
            instance_id: null,
            message_content: JSON.stringify({ step_type: "transfer", config }),
            variables,
            status: "pending",
            scheduled_at: scheduledAt,
            priority: 1,
            tenant_id: funnelTenantId,
          });
          queued++;
          continue;
        }

        cumulativeDelay += step.delay_minutes || 0;

        let messageContent = "";

        if (stepType === "message_template") {
          const template = step.whatsapp_templates;
          messageContent = template?.content || "";
        } else if (stepType === "message_custom") {
          messageContent = config.content || "";
        } else if (stepType === "send_file") {
          const scheduledAt = new Date(Date.now() + cumulativeDelay * 60 * 1000).toISOString();
          await supabase.from("whatsapp_message_queue").insert({
            contact_phone: telefone,
            contact_name: nome || "",
            template_id: null,
            funnel_id: funnel.id,
            step_id: step.id,
            instance_id: overrideInstanceId || step.instance_id || null,
            message_content: JSON.stringify({ step_type: "send_file", config }),
            variables,
            status: "pending",
            scheduled_at: scheduledAt,
            priority: evento === "carrinho_abandonado" ? 3 : 5,
            tenant_id: funnelTenantId,
          });
          queued++;
          continue;
        }

        // Replace variables BEFORE spintax so variable values don't accidentally match spintax patterns
        messageContent = replaceVariables(messageContent, variables);
        messageContent = parseSpintax(messageContent);

        const scheduledAt = new Date(Date.now() + cumulativeDelay * 60 * 1000).toISOString();

        await supabase.from("whatsapp_message_queue").insert({
          contact_phone: telefone,
          contact_name: nome || "",
          template_id: step.whatsapp_templates?.id || null,
          funnel_id: funnel.id,
          step_id: step.id,
          instance_id: overrideInstanceId || step.instance_id || null,
          message_content: messageContent,
          variables,
          status: "pending",
          scheduled_at: scheduledAt,
          priority: evento === "carrinho_abandonado" ? 3 : 5,
          tenant_id: funnelTenantId,
        });
        queued++;
      }
    }

    return new Response(JSON.stringify({ success: true, queued, flowsTriggered, evento }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("whatsapp-webhook error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});
