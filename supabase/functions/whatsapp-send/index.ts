import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function safeJson(res: Response): Promise<{ ok: boolean; status: number; data: any }> {
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: res.status, data: { error: "Non-JSON response", body_preview: text.substring(0, 200) } };
  }
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

const SendSchema = z.object({
  phone: z.string().min(10).max(20),
  message: z.string().min(1).max(5000).optional(),
  template_id: z.string().uuid().optional(),
  variables: z.record(z.string()).optional(),
  instance_id: z.string().uuid().optional(),
  funnel_id: z.string().uuid().optional(),
  step_id: z.string().uuid().optional(),
  contact_name: z.string().max(200).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- Auth check: require a valid JWT ---
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller's JWT
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    // Use service role for DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const parsed = SendSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), { status: 400, headers: corsHeaders });
    }

    const { phone, message, template_id, variables = {}, instance_id, funnel_id, step_id, contact_name } = parsed.data;

    // Resolve message content
    let finalMessage = message || "";
    if (template_id) {
      const { data: tpl } = await supabase.from("whatsapp_templates").select("content").eq("id", template_id).single();
      if (tpl) finalMessage = tpl.content;
    }

    const { data: storeSettings } = await supabase.from("store_settings").select("display_name, attendant_name, store_name").limit(1).single();
    const mergedVars = {
      ...variables,
      Nome_da_Empresa: storeSettings?.display_name || storeSettings?.store_name || "",
      Atendente: storeSettings?.attendant_name || "",
    };

    finalMessage = replaceVariables(finalMessage, mergedVars);
    finalMessage = parseSpintax(finalMessage);

    if (!finalMessage) {
      return new Response(JSON.stringify({ error: "No message content" }), { status: 400, headers: corsHeaders });
    }

    // Pick instance
    let instance: any = null;
    if (instance_id) {
      const { data } = await supabase.from("whatsapp_instances").select("*").eq("id", instance_id).eq("active", true).single();
      instance = data;
    } else {
      const { data: instances } = await supabase
        .from("whatsapp_instances")
        .select("*")
        .eq("active", true)
        .eq("status", "connected")
        .order("messages_sent_today", { ascending: true })
        .limit(1);
      instance = instances?.[0];
    }

    // Resolve tenant
    const { data: tenantRow } = await supabase.from("tenant_users").select("tenant_id").eq("user_id", user.id).limit(1).maybeSingle();
    const callerTenantId = tenantRow?.tenant_id || null;

    if (!instance) {
      await supabase.from("whatsapp_message_queue").insert({
        contact_phone: phone, contact_name: contact_name || "",
        message_content: finalMessage, template_id, funnel_id, step_id, instance_id,
        variables, status: "pending", scheduled_at: new Date().toISOString(),
        tenant_id: callerTenantId,
      });
      return new Response(JSON.stringify({ queued: true, reason: "No active instance" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check daily limit
    if (instance.messages_sent_today >= instance.daily_limit) {
      const { data: altInstances } = await supabase
        .from("whatsapp_instances").select("*")
        .eq("active", true).eq("status", "connected")
        .neq("id", instance.id)
        .lt("messages_sent_today", instance.daily_limit)
        .order("messages_sent_today", { ascending: true }).limit(1);
      
      if (altInstances?.[0]) {
        instance = altInstances[0];
      } else {
      await supabase.from("whatsapp_message_queue").insert({
          contact_phone: phone, contact_name: contact_name || "",
          message_content: finalMessage, template_id, funnel_id, step_id, instance_id: instance.id,
          variables, status: "pending", scheduled_at: new Date(Date.now() + 3600000).toISOString(),
          tenant_id: callerTenantId,
        });
        return new Response(JSON.stringify({ queued: true, reason: "Daily limit reached" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Send via Evolution API
    const formattedPhone = phone.replace(/\D/g, "");
    const evoRes = await fetch(`${instance.api_url}/message/sendText/${instance.instance_name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: instance.api_key },
      body: JSON.stringify({ number: formattedPhone, text: finalMessage }),
    });

    const evo = await safeJson(evoRes);
    const success = evo.ok;

    const tenantId = instance.tenant_id || null;

    // Log message
    await supabase.from("whatsapp_message_log").insert({
      contact_phone: phone,
      contact_name: contact_name || "",
      instance_id: instance.id,
      instance_name: instance.name,
      message_content: finalMessage,
      direction: "outbound",
      status: success ? "sent" : "error",
      funnel_id, step_id,
      error_message: success ? null : JSON.stringify(evo.data),
      tenant_id: tenantId,
    });

    // Upsert conversation so outbound messages appear in Conversas
    if (success) {
      const { data: existingConv } = await supabase
        .from("whatsapp_conversations")
        .select("id")
        .eq("contact_phone", phone)
        .eq("instance_id", instance.id)
        .maybeSingle();

      if (existingConv) {
        await supabase.from("whatsapp_conversations").update({
          last_message: finalMessage.substring(0, 500),
          last_message_at: new Date().toISOString(),
          contact_name: contact_name || phone,
        }).eq("id", existingConv.id);
      } else {
        await supabase.from("whatsapp_conversations").insert({
          contact_phone: phone,
          contact_name: contact_name || phone,
          last_message: finalMessage.substring(0, 500),
          last_message_at: new Date().toISOString(),
          unread_count: 0,
          status: "open",
          instance_id: instance.id,
          tenant_id: tenantId,
        });
      }

      // Update instance counters
      await supabase.from("whatsapp_instances").update({
        messages_sent_today: instance.messages_sent_today + 1,
        last_message_at: new Date().toISOString(),
      }).eq("id", instance.id);
    }

    return new Response(JSON.stringify({ success, instance_used: instance.name, evo_response: evo.data }), {
      status: success ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("whatsapp-send error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
