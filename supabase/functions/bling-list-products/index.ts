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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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
    const { page = 1, search = "" } = await req.json().catch(() => ({}));

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
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
