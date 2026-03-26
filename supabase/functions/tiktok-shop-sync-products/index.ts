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
    throw new Error("TikTok Shop não conectado. Autorize primeiro.");
  }

  const token = tokens[0];
  const now = new Date();
  const expiresAt = new Date(token.expires_at);

  // Refresh if expires within 24h
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
    const appKey = Deno.env.get("TIKTOK_APP_KEY");
    const appSecret = Deno.env.get("TIKTOK_APP_SECRET");
    if (!appKey || !appSecret) throw new Error("TikTok credentials not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const action = body.action || "export"; // "export" sends products to TikTok

    const accessToken = await getValidToken(supabase, appKey, appSecret);

    // Get shop_id
    const { data: tokenData } = await supabase
      .from("tiktok_tokens")
      .select("shop_id")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const shopId = tokenData?.shop_id;
    if (!shopId) throw new Error("Shop ID não encontrado. Reconecte o TikTok Shop.");

    if (action === "export") {
      // Export local products to TikTok Shop
      const productIds: string[] = body.product_ids || [];
      const query = supabase.from("products").select("*").eq("active", true);
      if (productIds.length > 0) {
        query.in("id", productIds);
      }
      const { data: products, error } = await query;
      if (error) throw error;

      const results: any[] = [];
      for (const product of products || []) {
        try {
          // Create product on TikTok Shop
          const timestamp = Math.floor(Date.now() / 1000);
          const createRes = await fetch(
            `https://open-api.tiktokglobalshop.com/product/202309/products?app_key=${appKey}&shop_id=${shopId}&timestamp=${timestamp}`,
            {
              method: "POST",
              headers: {
                "x-tts-access-token": accessToken,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                title: product.name,
                description: product.description || product.short_description || product.name,
                category_id: "0", // Generic - user should configure
                brand: { id: "0" },
                skus: [
                  {
                    outer_sku_id: product.sku || product.id,
                    original_price: String(product.price),
                    stock_infos: [{ available_stock: product.stock }],
                    seller_sku: product.sku || product.slug,
                  },
                ],
                main_images: product.image_url
                  ? [{ uri: product.image_url }]
                  : [],
                package_weight: { value: String(product.weight || 0.5), unit: "KILOGRAM" },
              }),
            }
          );
          const createData = await createRes.json();
          results.push({
            product_id: product.id,
            name: product.name,
            success: createData.code === 0,
            tiktok_product_id: createData.data?.product_id || null,
            error: createData.code !== 0 ? createData.message : null,
          });
        } catch (e: any) {
          results.push({
            product_id: product.id,
            name: product.name,
            success: false,
            error: e.message,
          });
        }
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("TikTok sync products error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
