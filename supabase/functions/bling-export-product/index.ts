import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BLING_API = "https://www.bling.com.br/Api/v3";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { product_id } = await req.json();
    if (!product_id) {
      return new Response(JSON.stringify({ error: "product_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get product from store
    const { data: product, error: prodErr } = await supabase
      .from("products")
      .select("*")
      .eq("id", product_id)
      .single();

    if (prodErr || !product) {
      return new Response(JSON.stringify({ error: "Produto não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get valid token
    const { data: tokens } = await supabase
      .from("bling_tokens")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!tokens) {
      return new Response(JSON.stringify({ error: "Bling não conectado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = tokens.access_token;
    const codigo = product.sku || product.slug || product.name.slice(0, 30);

    // Check if product already exists in Bling by SKU
    let existingBlingId: number | null = null;
    if (product.sku) {
      try {
        const searchRes = await fetch(
          `${BLING_API}/produtos?pesquisa=${encodeURIComponent(product.sku)}&limite=1`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const searchData = await searchRes.json();
        if (searchRes.ok && searchData.data?.length > 0) {
          existingBlingId = searchData.data[0].id;
        }
      } catch { /* proceed to create */ }
    }

    const blingPayload: any = {
      nome: product.name,
      codigo: codigo,
      preco: product.price,
      tipo: "P",
      situacao: product.active ? "A" : "I",
      unidade: product.unit || "UN",
      ...(product.ncm && { ncm: product.ncm }),
      ...(product.gtin && { gtin: product.gtin }),
      ...(product.weight && {
        pesoBruto: product.weight,
        pesoLiquido: product.weight,
      }),
      ...(product.description && {
        descricaoCurta: product.short_description || "",
      }),
    };

    let blingRes: Response;
    if (existingBlingId) {
      // Update existing product
      blingRes = await fetch(`${BLING_API}/produtos/${existingBlingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(blingPayload),
      });
    } else {
      // Create new product
      blingRes = await fetch(`${BLING_API}/produtos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(blingPayload),
      });
    }

    const blingData = await blingRes.json();

    if (!blingRes.ok) {
      console.error("Bling export error:", blingData);
      await supabase.from("integration_logs").insert({
        integration: "bling",
        action: "export_product",
        status: "error",
        details: `${product.name}: ${JSON.stringify(blingData).slice(0, 300)}`,
      });
      return new Response(JSON.stringify({ error: "Erro ao exportar produto", details: blingData }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("integration_logs").insert({
      integration: "bling",
      action: "export_product",
      status: "success",
      details: `${product.name} ${existingBlingId ? "atualizado" : "criado"} no Bling`,
    });

    return new Response(JSON.stringify({ success: true, updated: !!existingBlingId, bling_data: blingData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("bling-export-product error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
