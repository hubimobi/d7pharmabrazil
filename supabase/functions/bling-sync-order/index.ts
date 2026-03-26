import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BLING_API = "https://www.bling.com.br/Api/v3";

async function getValidToken(supabase: any): Promise<string> {
  const { data: tokens } = await supabase
    .from("bling_tokens")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!tokens) throw new Error("Bling não conectado. Conecte pelo painel de integrações.");

  const now = new Date();
  const expiresAt = new Date(tokens.expires_at);

  if (expiresAt > now) {
    return tokens.access_token;
  }

  const clientId = Deno.env.get("BLING_CLIENT_ID")!;
  const clientSecret = Deno.env.get("BLING_CLIENT_SECRET")!;
  const credentials = btoa(`${clientId}:${clientSecret}`);

  const res = await fetch(`${BLING_API}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error("Falha ao renovar token do Bling. Reconecte pelo painel.");
  }

  const newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

  await supabase
    .from("bling_tokens")
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tokens.id);

  return data.access_token;
}

async function findOrCreateContact(
  accessToken: string,
  name: string,
  email: string,
  phone: string
): Promise<number> {
  if (email) {
    const searchRes = await fetch(
      `${BLING_API}/contatos?pesquisa=${encodeURIComponent(email)}&limite=1`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const searchData = await searchRes.json();
    if (searchRes.ok && searchData.data && searchData.data.length > 0) {
      return searchData.data[0].id;
    }
  }

  const contactPayload = {
    nome: name || "Cliente Loja Online",
    tipo: "F",
    situacao: "A",
    ...(email && { email }),
    ...(phone && { celular: phone }),
  };

  const createRes = await fetch(`${BLING_API}/contatos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(contactPayload),
  });

  const createData = await createRes.json();

  if (!createRes.ok || !createData.data?.id) {
    console.error("Bling create contact error:", createData);
    throw new Error("Não foi possível criar contato no Bling: " + JSON.stringify(createData));
  }

  return createData.data.id;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id, force } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Pedido não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Block pending/cancelled orders unless forced
    if (!force && (order.status === "pending" || order.status === "cancelled")) {
      return new Response(
        JSON.stringify({ error: `Pedido com status "${order.status}" não pode ser sincronizado. Use force=true para forçar.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = await getValidToken(supabase);
    const orderRef = order.id.slice(0, 8);

    // Check if order already exists in Bling — use full observation text for precision
    if (!force) {
      try {
        const searchRes = await fetch(
          `${BLING_API}/pedidos/vendas?pesquisa=${encodeURIComponent(orderRef)}&limite=5`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const searchData = await searchRes.json();
        if (searchRes.ok && searchData.data && searchData.data.length > 0) {
          // Validate that at least one result matches our customer name to avoid collisions
          const matchingOrder = searchData.data.find((blingOrder: any) => {
            const blingName = blingOrder.contato?.nome?.toLowerCase() || "";
            const ourName = order.customer_name?.toLowerCase() || "";
            return blingName.includes(ourName.split(" ")[0]) || ourName.includes(blingName.split(" ")[0]);
          });

          if (matchingOrder) {
            await supabase.from("integration_logs").insert({
              integration: "bling", action: "sync_order", status: "success",
              details: `Pedido ${orderRef} já existe no Bling (ID: ${matchingOrder.id}). Pulando.`
            });
            const existingBlingId = String(matchingOrder.numero || matchingOrder.id);
            await supabase.from("orders").update({ bling_order_id: existingBlingId }).eq("id", order_id);

            return new Response(
              JSON.stringify({ success: true, already_exists: true, bling_id: matchingOrder.id }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          // No name match — treat as no duplicate found, proceed with creation
        }
      } catch (e) {
        console.log("Bling search failed, proceeding with sync:", e.message);
      }
    }

    // Find or create contact in Bling
    const contactId = await findOrCreateContact(
      accessToken,
      order.customer_name,
      order.customer_email || "",
      order.customer_phone || ""
    );

    // Fetch product details
    const items = order.items as any[];
    const productIds = items.map((i: any) => i.product_id || i.id).filter(Boolean);

    const { data: products } = await supabase
      .from("products")
      .select("id, name, sku, ncm, gtin, unit, price")
      .in("id", productIds);

    const productMap = new Map((products || []).map((p: any) => [p.id, p]));

    // Build Bling items — search for existing products in Bling by SKU to reference by ID
    const blingItems = [];
    for (const item of items) {
      const prod = productMap.get(item.product_id || item.id);
      const sku = prod?.sku || "";
      const blingItem: any = {
        descricao: item.name || prod?.name || "Produto",
        quantidade: item.quantity || 1,
        valor: item.price || prod?.price || 0,
        unidade: prod?.unit || "UN",
      };

      // Try to find existing product in Bling by SKU to avoid "code already exists" error
      if (sku) {
        try {
          const prodSearchRes = await fetch(
            `${BLING_API}/produtos?pesquisa=${encodeURIComponent(sku)}&limite=1`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          const prodSearchData = await prodSearchRes.json();
          if (prodSearchRes.ok && prodSearchData.data?.length > 0) {
            blingItem.produto = { id: prodSearchData.data[0].id };
          } else {
            blingItem.codigo = sku;
          }
        } catch {
          blingItem.codigo = sku;
        }
      }

      blingItems.push(blingItem);
    }

    // Calculate discount: difference between items total and order.total
    const itemsTotal = blingItems.reduce((sum, item) => sum + (item.valor * item.quantidade), 0);
    const orderTotal = Number(order.total) || 0;
    const discountValue = Math.max(0, Math.round((itemsTotal - orderTotal) * 100) / 100);

    const blingPayload: any = {
      numero: 0,
      data: new Date(order.created_at).toISOString().split("T")[0],
      contato: { id: contactId },
      itens: blingItems,
      observacoes: `Pedido loja online #${orderRef}${order.coupon_code ? ` | Cupom: ${order.coupon_code}` : ""}`,
    };

    // Add discount if applicable
    if (discountValue > 0) {
      blingPayload.desconto = {
        valor: discountValue,
        unidade: "REAL",
      };
    }

    console.log("Sending to Bling:", JSON.stringify(blingPayload));

    const blingRes = await fetch(`${BLING_API}/pedidos/vendas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(blingPayload),
    });

    const blingData = await blingRes.json();

    if (!blingRes.ok) {
      console.error("Bling sync error:", blingData);
      await supabase.from("integration_logs").insert({ integration: "bling", action: "sync_order", status: "error", details: `Pedido ${orderRef}: ${JSON.stringify(blingData).slice(0, 300)}` });
      return new Response(
        JSON.stringify({ error: "Erro ao enviar pedido ao Bling", details: blingData }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const blingId = blingData?.data?.id ? String(blingData.data.id) : null;
    const blingNumero = blingData?.data?.numero ? String(blingData.data.numero) : blingId;

    if (blingId) {
      await supabase.from("orders").update({ bling_order_id: blingNumero || blingId }).eq("id", order_id);
    }

    await supabase.from("integration_logs").insert({ integration: "bling", action: "sync_order", status: "success", details: `Pedido ${orderRef} sincronizado. Bling ID: ${blingId || 'N/A'}${discountValue > 0 ? ` | Desconto: R$${discountValue.toFixed(2)}` : ''}` });

    return new Response(
      JSON.stringify({ success: true, bling_order: blingData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("bling-sync-order error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
