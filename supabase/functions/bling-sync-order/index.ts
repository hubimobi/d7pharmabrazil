import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getBlingAccessToken } from "../_shared/bling-token.ts";
import { DEFAULT_TENANT_ID } from "../_shared/tenant-credentials.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BLING_API = "https://www.bling.com.br/Api/v3";

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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Auth check - admin only
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const authToken = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authToken);
    if (authErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles || []).some((r: any) => ["admin","super_admin","administrador","suporte","gestor","financeiro"].includes(r.role));
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { order_id, force } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Use the order's tenant for credential lookup (server-to-server safe)
    const tenantId = order.tenant_id || DEFAULT_TENANT_ID;
    const accessToken = await getBlingAccessToken(supabase, tenantId);
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
      } catch (e: any) {
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
      
      // Handle "identical order" error — means order already exists in Bling
      const isDuplicate = blingData?.error?.fields?.some((f: any) => f.code === 3);
      if (isDuplicate) {
        // Search Bling for the existing order to get its ID
        try {
          const searchRes = await fetch(
            `${BLING_API}/pedidos/vendas?pesquisa=${encodeURIComponent(orderRef)}&limite=5`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          const searchData = await searchRes.json();
          if (searchRes.ok && searchData.data?.length > 0) {
            const existingId = String(searchData.data[0].numero || searchData.data[0].id);
            await supabase.from("orders").update({ bling_order_id: existingId }).eq("id", order_id);
            await supabase.from("integration_logs").insert({ integration: "bling", action: "sync_order", status: "success", details: `Pedido ${orderRef} já existia no Bling (ID: ${existingId}). Atualizado.` });
            return new Response(
              JSON.stringify({ success: true, already_exists: true, bling_id: existingId }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } catch (_: any) { /* fallthrough */ }
        
        // If search failed, still treat as success
        await supabase.from("integration_logs").insert({ integration: "bling", action: "sync_order", status: "success", details: `Pedido ${orderRef} já existe no Bling (duplicata detectada).` });
        return new Response(
          JSON.stringify({ success: true, already_exists: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
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
  } catch (err: any) {
    console.error("bling-sync-order error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
