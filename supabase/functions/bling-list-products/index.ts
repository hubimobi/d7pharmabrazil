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

    const body = await req.json().catch(() => ({}));
    const tenantId = await resolveTenantId(req, body);
    const accessToken = await getBlingAccessToken(supabase, tenantId);
    const { page = 1, search = "" } = body;

    let url = `${BLING_API}/produtos?pagina=${page}&limite=100`;
    if (search) {
      url += `&pesquisa=${encodeURIComponent(search)}`;
    }

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await res.json();

    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Erro ao buscar produtos do Bling", details: data }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const products = (data.data || []).map((p: any) => ({
      id: p.id,
      nome: p.nome || "",
      codigo: p.codigo || "",
      preco: p.preco || 0,
      precoCusto: p.precoCusto || 0,
      unidade: p.unidade || "UN",
      tipo: p.tipo || "P",
      situacao: p.situacao || "",
      estoque: p.estoque?.saldoVirtualTotal || 0,
      gtin: p.gtin || "",
      ncm: p.ncm || "",
    }));

    return new Response(JSON.stringify({ products, total: data.data?.length || 0 }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("bling-list-products error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});