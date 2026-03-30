import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getValidToken(supabase: any, appKey: string, appSecret: string) {
  const { data: tokens } = await supabase
    .from("tiktok_tokens")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1);

  if (!tokens || tokens.length === 0) {
    throw new Error("TikTok Shop não conectado.");
  }

  const token = tokens[0];
  const now = new Date();
  const expiresAt = new Date(token.expires_at);

  if (expiresAt.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
    const res = await fetch("https://auth.tiktok-shops.com/api/v2/token/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_key: appKey,
        app_secret: appSecret,
        refresh_token: token.refresh_token,
        grant_type: "refresh_token",
      }),
    });
    const data = await res.json();
    if (data.code === 0 && data.data?.access_token) {
      const newExpiry = new Date(Date.now() + data.data.access_token_expire_in * 1000).toISOString();
      await supabase
        .from("tiktok_tokens")
        .update({
          access_token: data.data.access_token,
          refresh_token: data.data.refresh_token,
          expires_at: newExpiry,
        })
        .eq("id", token.id);
      return data.data.access_token;
    }
  }

  return token.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth check - admin only
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const authToken = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authToken);
    if (authErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles || []).some((r: any) => ["admin","super_admin","administrador","suporte","gestor","financeiro"].includes(r.role));
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const appKey = Deno.env.get("TIKTOK_APP_KEY");
    const appSecret = Deno.env.get("TIKTOK_APP_SECRET");
    if (!appKey || !appSecret) throw new Error("TikTok credentials not configured");

    const accessToken = await getValidToken(supabase, appKey, appSecret);

    const { data: tokenData } = await supabase
      .from("tiktok_tokens")
      .select("shop_id")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const shopId = tokenData?.shop_id;
    if (!shopId) throw new Error("Shop ID não encontrado.");

    // Fetch recent orders from TikTok Shop
    const timestamp = Math.floor(Date.now() / 1000);
    const ordersRes = await fetch(
      `https://open-api.tiktokglobalshop.com/order/202309/orders/search?app_key=${appKey}&shop_id=${shopId}&timestamp=${timestamp}`,
      {
        method: "POST",
        headers: {
          "x-tts-access-token": accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          page_size: 50,
          sort_by: "CREATE_TIME",
          sort_type: "DESC",
        }),
      }
    );

    const ordersData = await ordersRes.json();
    console.log("TikTok orders response:", JSON.stringify(ordersData).substring(0, 500));

    if (ordersData.code !== 0) {
      throw new Error(`Erro ao buscar pedidos: ${ordersData.message}`);
    }

    const orders = ordersData.data?.orders || [];
    const imported: any[] = [];

    for (const order of orders) {
      // Check if already imported
      const orderId = order.id;
      const { data: existing } = await supabase
        .from("orders")
        .select("id")
        .eq("id", orderId)
        .limit(1);

      if (existing && existing.length > 0) continue;

      // Map TikTok order to local order
      const buyer = order.buyer || {};
      const items = (order.line_items || []).map((item: any) => ({
        name: item.product_name || "Produto TikTok",
        quantity: item.quantity || 1,
        price: parseFloat(item.sale_price || "0"),
        sku: item.seller_sku || "",
      }));

      const total = items.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0);

      const { error: insertError } = await supabase.from("orders").insert({
        customer_name: buyer.name || `TikTok #${orderId.slice(-6)}`,
        customer_email: buyer.email || null,
        customer_phone: buyer.phone || null,
        items: JSON.stringify(items),
        total,
        status: "pending",
        coupon_code: `TIKTOK-${orderId.slice(-8)}`,
      });

      if (!insertError) {
        imported.push({ order_id: orderId, total });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_found: orders.length,
        imported: imported.length,
        details: imported,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("TikTok sync orders error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
