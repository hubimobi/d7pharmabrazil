import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Spintax parser
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

const WebhookSchema = z.object({
  evento: z.string().min(1).max(100),
  nome: z.string().max(200).optional(),
  telefone: z.string().min(10).max(20),
  produto: z.string().max(500).optional(),
  link: z.string().max(2000).optional(),
  cidade: z.string().max(200).optional(),
  extra: z.record(z.string()).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const parsed = WebhookSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), { status: 400, headers: corsHeaders });
    }

    const { evento, nome, telefone, produto, link, cidade, extra } = parsed.data;

    // Find active funnel matching trigger event
    const { data: funnels } = await supabase
      .from("whatsapp_funnels")
      .select("*, whatsapp_funnel_steps(*, whatsapp_templates(*))")
      .eq("trigger_event", evento)
      .eq("active", true);

    if (!funnels || funnels.length === 0) {
      return new Response(JSON.stringify({ message: "No active funnel for event", evento }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const variables: Record<string, string> = {
      Nome: nome || "",
      Produto: produto || "",
      Link: link || "",
      Cidade: cidade || "",
      ...extra,
    };

    let queued = 0;

    for (const funnel of funnels) {
      const steps = (funnel.whatsapp_funnel_steps || []).sort((a: any, b: any) => a.step_order - b.step_order);

      let cumulativeDelay = 0;
      for (const step of steps) {
        if (!step.active) continue;
        cumulativeDelay += step.delay_minutes;

        const template = step.whatsapp_templates;
        let messageContent = template?.content || "";
        messageContent = replaceVariables(messageContent, variables);
        messageContent = parseSpintax(messageContent);

        const scheduledAt = new Date(Date.now() + cumulativeDelay * 60 * 1000).toISOString();

        await supabase.from("whatsapp_message_queue").insert({
          contact_phone: telefone,
          contact_name: nome || "",
          template_id: template?.id || null,
          funnel_id: funnel.id,
          step_id: step.id,
          instance_id: step.instance_id || null,
          message_content: messageContent,
          variables,
          status: "pending",
          scheduled_at: scheduledAt,
          priority: evento === "carrinho_abandonado" ? 3 : 5,
        });
        queued++;
      }
    }

    return new Response(JSON.stringify({ success: true, queued, evento }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("whatsapp-webhook error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
