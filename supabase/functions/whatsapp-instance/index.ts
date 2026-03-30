import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ActionSchema = z.object({
  action: z.enum(["create", "qrcode", "status", "disconnect", "restart"]),
  instance_id: z.string().uuid().optional(),
  name: z.string().min(1).max(100).optional(),
  api_url: z.string().url().optional(),
  api_key: z.string().min(1).optional(),
  funnel_roles: z.array(z.enum(["all", "recuperacao", "recompra", "upsell", "novidades"])).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify admin
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });

    const body = await req.json();
    const parsed = ActionSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), { status: 400, headers: corsHeaders });
    }

    const { action, instance_id, name, api_url, api_key, funnel_roles } = parsed.data;

    if (action === "create") {
      if (!api_url || !api_key || !name) {
        return new Response(JSON.stringify({ error: "name, api_url, api_key required" }), { status: 400, headers: corsHeaders });
      }

      const instanceName = `d7pharma_${Date.now()}`;
      
      // Create instance on Evolution API
      const evoRes = await fetch(`${api_url}/instance/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: api_key },
        body: JSON.stringify({
          instanceName,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
        }),
      });

      const evoData = await evoRes.json();
      if (!evoRes.ok) {
        return new Response(JSON.stringify({ error: "Evolution API error", details: evoData }), { status: 502, headers: corsHeaders });
      }

      const qrCode = evoData?.qrcode?.base64 || evoData?.qrcode?.pairingCode || null;

      const { data: inst, error: dbErr } = await supabase.from("whatsapp_instances").insert({
        name,
        instance_name: instanceName,
        api_url,
        api_key,
        funnel_roles: funnel_roles && funnel_roles.length > 0 ? (funnel_roles.includes("all") ? ["all"] : funnel_roles) : ["all"],
        status: qrCode ? "qr_ready" : "disconnected",
        qr_code: qrCode,
      }).select().single();

      if (dbErr) return new Response(JSON.stringify({ error: dbErr.message }), { status: 500, headers: corsHeaders });

      return new Response(JSON.stringify({ instance: inst, qrcode: qrCode }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "qrcode" && instance_id) {
      const { data: inst } = await supabase.from("whatsapp_instances").select("*").eq("id", instance_id).single();
      if (!inst) return new Response(JSON.stringify({ error: "Instance not found" }), { status: 404, headers: corsHeaders });

      const evoRes = await fetch(`${inst.api_url}/instance/connect/${inst.instance_name}`, {
        method: "GET",
        headers: { apikey: inst.api_key },
      });
      const evoData = await evoRes.json();
      const qrCode = evoData?.base64 || evoData?.qrcode?.base64 || null;

      if (qrCode) {
        await supabase.from("whatsapp_instances").update({ qr_code: qrCode, status: "qr_ready" }).eq("id", instance_id);
      }

      return new Response(JSON.stringify({ qrcode: qrCode, raw: evoData }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "status" && instance_id) {
      const { data: inst } = await supabase.from("whatsapp_instances").select("*").eq("id", instance_id).single();
      if (!inst) return new Response(JSON.stringify({ error: "Instance not found" }), { status: 404, headers: corsHeaders });

      const evoRes = await fetch(`${inst.api_url}/instance/connectionState/${inst.instance_name}`, {
        method: "GET",
        headers: { apikey: inst.api_key },
      });
      const evoData = await evoRes.json();
      const state = evoData?.state || evoData?.instance?.state || "disconnected";
      const mappedStatus = state === "open" ? "connected" : state === "close" ? "disconnected" : "qr_ready";

      await supabase.from("whatsapp_instances").update({ status: mappedStatus }).eq("id", instance_id);

      return new Response(JSON.stringify({ status: mappedStatus, raw: evoData }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "disconnect" && instance_id) {
      const { data: inst } = await supabase.from("whatsapp_instances").select("*").eq("id", instance_id).single();
      if (!inst) return new Response(JSON.stringify({ error: "Instance not found" }), { status: 404, headers: corsHeaders });

      await fetch(`${inst.api_url}/instance/logout/${inst.instance_name}`, {
        method: "DELETE",
        headers: { apikey: inst.api_key },
      });

      await supabase.from("whatsapp_instances").update({ status: "disconnected", qr_code: null }).eq("id", instance_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "restart" && instance_id) {
      const { data: inst } = await supabase.from("whatsapp_instances").select("*").eq("id", instance_id).single();
      if (!inst) return new Response(JSON.stringify({ error: "Instance not found" }), { status: 404, headers: corsHeaders });

      await fetch(`${inst.api_url}/instance/restart/${inst.instance_name}`, {
        method: "PUT",
        headers: { apikey: inst.api_key },
      });

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: corsHeaders });
  } catch (err) {
    console.error("whatsapp-instance error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
