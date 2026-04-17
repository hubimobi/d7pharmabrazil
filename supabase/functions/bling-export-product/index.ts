import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getBlingAccessToken } from "../_shared/bling-token.ts";
import { resolveTenantId } from "../_shared/tenant-credentials.ts";

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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const authToken = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authToken);
    if (authErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles || []).some((r: any) => ["admin","super_admin","administrador","suporte","gestor","financeiro"].includes(r.role));
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const reqBody = await req.json();
    const tenantId = await resolveTenantId(req, reqBody);
    const { product_id } = reqBody;
    if (!product_id) {
      return new Response(JSON.stringify({ error: "product_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const accessToken = await getBlingAccessToken(supabase, tenantId);
    const codigo = product.sku || product.slug || product.name.slice(0, 30);

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
      } catch {
        // continua para criação/atualização direta
      }
    }

    const blingPayload: any = {
      nome: product.name,
      codigo,
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
      blingRes = await fetch(`${BLING_API}/produtos/${existingBlingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(blingPayload),
      });
    } else {
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
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});