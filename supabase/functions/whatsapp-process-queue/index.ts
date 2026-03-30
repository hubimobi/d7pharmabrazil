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

    // Reset daily counters if needed
    const { data: instances } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("active", true);

    for (const inst of instances || []) {
      const lastReset = new Date(inst.last_reset_at || 0);
      const now = new Date();
      if (lastReset.toDateString() !== now.toDateString()) {
        await supabase.from("whatsapp_instances").update({
          messages_sent_today: 0,
          last_reset_at: now.toISOString(),
        }).eq("id", inst.id);
      }
    }

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
      return new Response(JSON.stringify({ processed: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const funnelIds = Array.from(new Set(messages.map((msg) => msg.funnel_id).filter(Boolean)));
    const funnelTypeById = new Map<string, string>();

    if (funnelIds.length > 0) {
      const { data: funnelData } = await supabase
        .from("whatsapp_funnels")
        .select("id, type")
        .in("id", funnelIds);

      for (const funnel of funnelData || []) {
        funnelTypeById.set(funnel.id, funnel.type);
      }
    }

    const normalizeRoles = (roles: unknown): string[] => {
      if (!Array.isArray(roles) || roles.length === 0) return ["all"];
      const values = roles.filter((role): role is string => typeof role === "string");
      return values.includes("all") ? ["all"] : values;
    };

    let processed = 0;
    let errors = 0;

    for (const msg of messages) {
      // Random delay between 5-20 seconds
      const delay = 5000 + Math.random() * 15000;
      await new Promise(r => setTimeout(r, delay));

      // Pick instance
      let instance;
      if (msg.instance_id) {
        const { data } = await supabase.from("whatsapp_instances").select("*").eq("id", msg.instance_id).eq("active", true).eq("status", "connected").single();
        instance = data;
      }
      if (!instance) {
        const funnelType = msg.funnel_id ? funnelTypeById.get(msg.funnel_id) : null;
        const { data: avail } = await supabase
          .from("whatsapp_instances")
          .select("*")
          .eq("active", true)
          .eq("status", "connected")
          .order("messages_sent_today", { ascending: true })
          .limit(20);

        instance = (avail || []).find((candidate) => {
          const roles = normalizeRoles(candidate.funnel_roles);
          return roles.includes("all") || (!!funnelType && roles.includes(funnelType));
        });
      }

      if (!instance || instance.messages_sent_today >= instance.daily_limit) {
        // Reschedule
        await supabase.from("whatsapp_message_queue").update({
          scheduled_at: new Date(Date.now() + 1800000).toISOString(),
        }).eq("id", msg.id);
        continue;
      }

      // Send
      const formattedPhone = msg.contact_phone.replace(/\D/g, "");
      try {
        const evoRes = await fetch(`${instance.api_url}/message/sendText/${instance.instance_name}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: instance.api_key },
          body: JSON.stringify({ number: formattedPhone, text: msg.message_content }),
        });
        const evoData = await evoRes.json();

        if (evoRes.ok) {
          await supabase.from("whatsapp_message_queue").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", msg.id);
          await supabase.from("whatsapp_message_log").insert({
            contact_phone: msg.contact_phone,
            contact_name: msg.contact_name,
            instance_id: instance.id,
            instance_name: instance.name,
            message_content: msg.message_content,
            direction: "outbound",
            status: "sent",
            funnel_id: msg.funnel_id,
            step_id: msg.step_id,
          });
          await supabase.from("whatsapp_instances").update({
            messages_sent_today: instance.messages_sent_today + 1,
            last_message_at: new Date().toISOString(),
          }).eq("id", instance.id);
          processed++;
        } else {
          const retryCount = (msg.retry_count || 0) + 1;
          if (retryCount >= msg.max_retries) {
            await supabase.from("whatsapp_message_queue").update({
              status: "failed",
              error_message: JSON.stringify(evoData),
              retry_count: retryCount,
            }).eq("id", msg.id);
            await supabase.from("whatsapp_message_log").insert({
              contact_phone: msg.contact_phone,
              contact_name: msg.contact_name,
              instance_id: instance.id,
              instance_name: instance.name,
              message_content: msg.message_content,
              direction: "outbound",
              status: "error",
              funnel_id: msg.funnel_id,
              step_id: msg.step_id,
              error_message: JSON.stringify(evoData),
            });
          } else {
            await supabase.from("whatsapp_message_queue").update({
              retry_count: retryCount,
              scheduled_at: new Date(Date.now() + 300000 * retryCount).toISOString(),
              error_message: JSON.stringify(evoData),
            }).eq("id", msg.id);
          }
          errors++;
        }
      } catch (sendErr) {
        const retryCount = (msg.retry_count || 0) + 1;
        await supabase.from("whatsapp_message_queue").update({
          retry_count: retryCount,
          error_message: sendErr.message,
          status: retryCount >= msg.max_retries ? "failed" : "pending",
          scheduled_at: new Date(Date.now() + 300000 * retryCount).toISOString(),
        }).eq("id", msg.id);
        errors++;
      }
    }

    return new Response(JSON.stringify({ processed, errors, total: messages.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("whatsapp-process-queue error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
