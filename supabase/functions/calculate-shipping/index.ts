import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MELHOR_ENVIO_API = "https://melhorenvio.com.br/api/v2/me/shipment/calculate";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MELHOR_ENVIO_TOKEN = Deno.env.get("MELHOR_ENVIO_TOKEN");
    if (!MELHOR_ENVIO_TOKEN) {
      throw new Error("MELHOR_ENVIO_TOKEN is not configured");
    }

    const { cep_destino, produtos } = await req.json();

    if (!cep_destino || !produtos || !Array.isArray(produtos) || produtos.length === 0) {
      return new Response(
        JSON.stringify({ error: "CEP de destino e produtos são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean CEP
    const cleanCep = cep_destino.replace(/\D/g, "");
    if (cleanCep.length !== 8) {
      return new Response(
        JSON.stringify({ error: "CEP inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch origin CEP from store settings
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: settings } = await supabaseClient
      .from("store_settings")
      .select("address_cep")
      .limit(1)
      .single();
    const originCep = (settings?.address_cep || "01001000").replace(/\D/g, "");

    // Build products payload for Melhor Envio
    const totalWeight = produtos.reduce((sum: number, p: any) => sum + (p.weight || 0.3) * (p.quantity || 1), 0);
    const maxHeight = Math.max(...produtos.map((p: any) => p.height || 5));
    const maxWidth = Math.max(...produtos.map((p: any) => p.width || 15));
    const totalLength = produtos.reduce((sum: number, p: any) => sum + (p.length || 20) * (p.quantity || 1), 0);
    const totalValue = produtos.reduce((sum: number, p: any) => sum + (p.price || 0) * (p.quantity || 1), 0);

    const body = {
      from: { postal_code: originCep },
      to: { postal_code: cleanCep },
      products: [
        {
          id: "package",
          width: Math.max(maxWidth, 11),
          height: Math.max(maxHeight, 2),
          length: Math.min(Math.max(totalLength, 16), 100),
          weight: Math.max(totalWeight, 0.3),
          insurance_value: totalValue,
          quantity: 1,
        },
      ],
    };

    const response = await fetch(MELHOR_ENVIO_API, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${MELHOR_ENVIO_TOKEN}`,
        "User-Agent": "D7PharmaBrazil (lucianoleal.mkt@gmail.com)",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Melhor Envio API error:", JSON.stringify(data));
      throw new Error(`Melhor Envio API error [${response.status}]: ${JSON.stringify(data)}`);
    }

    // Filter valid shipping options
    const options = (Array.isArray(data) ? data : [])
      .filter((opt: any) => !opt.error)
      .map((opt: any) => ({
        id: opt.id,
        name: opt.name,
        company: opt.company?.name || "",
        price: parseFloat(opt.custom_price || opt.price),
        delivery_time: opt.custom_delivery_time || opt.delivery_time,
        logo: opt.company?.picture || "",
      }))
      .sort((a: any, b: any) => a.price - b.price);

    return new Response(JSON.stringify({ options }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Shipping calculation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
