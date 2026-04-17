import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getTikTokCreds } from "../_shared/tiktok-token.ts";
import { resolveTenantId } from "../_shared/tenant-credentials.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const body = await req.json().catch(() => ({}));
    const tenantId = await resolveTenantId(req, body);
    const action = body.action || "export";
    const { access_token: accessToken, shop_id: shopId, app_key: appKey } = await getTikTokCreds(supabase, tenantId);

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
