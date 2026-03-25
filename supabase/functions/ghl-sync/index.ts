import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GHL_API = "https://services.leadconnectorhq.com";

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
    const apiKey = Deno.env.get("GHL_API_KEY");
    const locationId = Deno.env.get("GHL_LOCATION_ID");

    if (!apiKey || !locationId) {
      return new Response(
        JSON.stringify({ error: "GHL_API_KEY ou GHL_LOCATION_ID não configurados" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: GHLSyncPayload = await req.json();

    if (!payload.customer_email || !payload.customer_name) {
      return new Response(
        JSON.stringify({ error: "customer_name e customer_email obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
      } catch (err) {
        console.error("Opportunity creation failed (non-fatal):", err);
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
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
