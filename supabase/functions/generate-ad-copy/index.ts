import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { productName, productDescription, platform = "facebook", objective = "conversao" } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você é um especialista em anúncios digitais e copywriting para o mercado brasileiro. Crie copies de alta conversão. Responda SEMPRE em JSON válido.`;

    const userPrompt = `Crie copies de anúncios para:
Produto: ${productName}
Descrição: ${productDescription || "N/A"}
Plataforma: ${platform}
Objetivo: ${objective}

Retorne JSON:
{
  "ads": [
    {
      "type": "feed",
      "headline": "headline principal",
      "primary_text": "texto principal do anúncio",
      "description": "descrição curta",
      "cta": "botão de ação",
      "variations": [
        { "headline": "variação 1", "primary_text": "texto variação 1" },
        { "headline": "variação 2", "primary_text": "texto variação 2" }
      ],
      "image_prompt": "prompt para gerar imagem do anúncio"
    },
    {
      "type": "stories",
      "headline": "headline stories",
      "primary_text": "texto curto",
      "cta": "botão",
      "image_prompt": "prompt para imagem stories vertical"
    },
    {
      "type": "reels",
      "hook": "gancho dos primeiros 3 segundos",
      "script": "roteiro completo de 15-30s",
      "cta": "call to action final"
    }
  ],
  "targeting_suggestions": {
    "interests": ["interesse1", "interesse2"],
    "age_range": "25-55",
    "lookalike_suggestion": "descrição do público"
  }
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit. Tente novamente." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("Erro ao gerar copies");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: content };
    } catch {
      parsed = { raw: content };
    }

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
