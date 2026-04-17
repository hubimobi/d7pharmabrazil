import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { getTenantCredentials, resolveTenantId, DEFAULT_TENANT_ID } from "../_shared/tenant-credentials.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GHL_API = "https://services.leadconnectorhq.com";

interface GHLCreds { api_key: string; location_id: string; }

async function getGhlCreds(supabase: any, tenantId: string): Promise<{ apiKey: string; locationId: string }> {
  const tenantCreds = await getTenantCredentials<GHLCreds>(supabase, tenantId, "ghl");
  if (tenantCreds?.api_key && tenantCreds?.location_id) {
    return { apiKey: tenantCreds.api_key, locationId: tenantCreds.location_id };
  }
  if (tenantId === DEFAULT_TENANT_ID) {
    const apiKey = Deno.env.get("GHL_API_KEY");
    const locationId = Deno.env.get("GHL_LOCATION_ID");
    if (apiKey && locationId) return { apiKey, locationId };
  }
  throw new Error("GHL não configurado para este tenant");
}

interface GHLSyncPayload {
  action: "contact_and_opportunity" | "add_tags" | "webhook_test";
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  order_id?: string;
  order_total?: number;
  items?: { name: string; quantity: number; price: number }[];
  tags?: string[];
  pipeline_stage?: string;
}

async function findOrCreateContact(
  apiKey: string,
  locationId: string,
  name: string,
  email: string,
  phone?: string,
  tags?: string[]
): Promise<string> {
  // Search by email
  const searchRes = await fetch(
    `${GHL_API}/contacts/search/duplicate?locationId=${locationId}&email=${encodeURIComponent(email)}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version: "2021-07-28",
      },
    }
  );

  const searchData = await searchRes.json();

  if (searchRes.ok && searchData.contact?.id) {
    const contactId = searchData.contact.id;

    // Update tags if provided
    if (tags && tags.length > 0) {
      await fetch(`${GHL_API}/contacts/${contactId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Version: "2021-07-28",
        },
        body: JSON.stringify({ tags, locationId }),
      });
    }

    return contactId;
  }

  // Create contact
  const nameParts = name.trim().split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  const createRes = await fetch(`${GHL_API}/contacts/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Version: "2021-07-28",
    },
    body: JSON.stringify({
      firstName,
      lastName,
      email,
      phone: phone || "",
      locationId,
      tags: tags || [],
      source: "Loja Online D7 Pharma",
    }),
  });

  const createData = await createRes.json();

  if (!createRes.ok || !createData.contact?.id) {
    console.error("GHL create contact error:", createData);
    throw new Error("Erro ao criar contato no GHL: " + JSON.stringify(createData));
  }

  return createData.contact.id;
}

async function createOpportunity(
  apiKey: string,
  locationId: string,
  contactId: string,
  orderId: string,
  orderTotal: number,
  items: { name: string; quantity: number; price: number }[]
): Promise<any> {
  // First get pipelines to find the first available
  const pipelinesRes = await fetch(
    `${GHL_API}/opportunities/pipelines?locationId=${locationId}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version: "2021-07-28",
      },
    }
  );

  const pipelinesData = await pipelinesRes.json();

  if (!pipelinesRes.ok || !pipelinesData.pipelines?.length) {
    console.log("No pipelines found, skipping opportunity creation");
    return null;
  }

  const pipeline = pipelinesData.pipelines[0];
  const firstStage = pipeline.stages?.[0];

  if (!firstStage) {
    console.log("No stages found in pipeline, skipping");
    return null;
  }

  const itemsDescription = items
    .map((i) => `${i.quantity}x ${i.name} (R$ ${i.price.toFixed(2)})`)
    .join(", ");

  const oppRes = await fetch(`${GHL_API}/opportunities/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Version: "2021-07-28",
    },
    body: JSON.stringify({
      pipelineId: pipeline.id,
      locationId,
      name: `Pedido #${orderId.slice(0, 8)} - R$ ${orderTotal.toFixed(2)}`,
      stageId: firstStage.id,
      status: "open",
      contactId,
      monetaryValue: orderTotal,
      source: "Loja Online",
    }),
  });

  const oppData = await oppRes.json();

  if (!oppRes.ok) {
    console.error("GHL opportunity error:", oppData);
    throw new Error("Erro ao criar oportunidade no GHL");
  }

  return oppData;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check - admin only
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sbAuth = createClient(supabaseUrl, supabaseKey);
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const authToken = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await sbAuth.auth.getUser(authToken);
    if (authErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: roles } = await sbAuth.from("user_roles").select("role").eq("user_id", user.id);
    const isGhlAdmin = (roles || []).some((r: any) => ["admin","super_admin","administrador","suporte","gestor","financeiro"].includes(r.role));
    if (!isGhlAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const payload: GHLSyncPayload = await req.json();

    if (!payload.customer_email || !payload.customer_name) {
      return new Response(
        JSON.stringify({ error: "customer_name e customer_email obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Supabase admin client for logging + tenant lookup
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    const tenantId = await resolveTenantId(req, payload as any);
    const { apiKey, locationId } = await getGhlCreds(supabaseAdmin, tenantId);

    // Build tags
    const tags: string[] = [...(payload.tags || [])];
    if (payload.items?.length) {
      payload.items.forEach((item) => {
        tags.push(`comprou-${item.name.toLowerCase().replace(/\s+/g, "-").slice(0, 30)}`);
      });
    }
    tags.push("cliente-loja-online");

    // 1. Find or create contact
    const contactId = await findOrCreateContact(
      apiKey,
      locationId,
      payload.customer_name,
      payload.customer_email,
      payload.customer_phone,
      tags
    );

    await supabaseAdmin.from("integration_logs").insert({
      integration: "ghl",
      action: "contact_synced",
      status: "success",
      details: `Contato sincronizado: ${payload.customer_name} (${payload.customer_email}). Tags: ${tags.join(", ")}`,
    });

    let opportunity = null;

    // 2. Create opportunity if order data provided
    if (payload.order_id && payload.order_total && payload.items) {
      try {
        opportunity = await createOpportunity(
          apiKey,
          locationId,
          contactId,
          payload.order_id,
          payload.order_total,
          payload.items
        );

        if (opportunity) {
          await supabaseAdmin.from("integration_logs").insert({
            integration: "ghl",
            action: "opportunity_created",
            status: "success",
            details: `Oportunidade criada para pedido #${payload.order_id.slice(0, 8)}, valor R$ ${payload.order_total.toFixed(2)}`,
          });
        }
      } catch (err) {
        console.error("Opportunity creation failed (non-fatal):", err);
        await supabaseAdmin.from("integration_logs").insert({
          integration: "ghl",
          action: "opportunity_error",
          status: "error",
          details: `Erro ao criar oportunidade: ${err.message}`,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        contact_id: contactId,
        tags_applied: tags,
        opportunity: opportunity ? "created" : "skipped",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("ghl-sync error:", err);

    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const sb = createClient(supabaseUrl, supabaseKey);
      await sb.from("integration_logs").insert({
        integration: "ghl",
        action: "sync_error",
        status: "error",
        details: err.message,
      });
    } catch (_) {}

    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
