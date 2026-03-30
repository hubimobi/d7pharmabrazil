import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { productUrl, productName, productDescription, quantity = 5, benefits = [] } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você é um especialista em marketing digital e copywriting brasileiro. Sua tarefa é gerar testemunhos ultra-realistas para produtos.

REGRAS CRÍTICAS:
- Linguagem natural, imperfeita, humana (como brasileiro real fala)
- Evitar tom publicitário
- Incluir emoção real (alívio, frustração, dúvida, surpresa)
- Mostrar antes → durante → depois
- NÃO prometer milagres
- Incluir pequenos detalhes do cotidiano
- Pode conter leve ceticismo inicial
- Evitar palavras genéricas como "maravilhoso", "incrível"
- Tamanho: 3 a 6 linhas por depoimento
- Nomes comuns brasileiros
- Cidades reais do Brasil

Responda SEMPRE em JSON válido.`;

    const userPrompt = `Gere ${quantity} testemunhos ultra-realistas para este produto:

${productName ? `Nome: ${productName}` : ""}
${productDescription ? `Descrição: ${productDescription}` : ""}
${productUrl ? `URL: ${productUrl}` : ""}

Para cada testemunho, crie uma persona variada (mãe preocupada, adulto com rotina corrida, pessoa cética, etc).

Retorne um JSON com esta estrutura exata:
{
  "product_analysis": {
    "name": "nome do produto",
    "benefits": ["benefício 1", "benefício 2"],
    "target_audience": "público-alvo",
    "pain_points": ["dor 1", "dor 2"],
    "language_tone": "tom da linguagem"
  },
  "testimonials": [
    {
      "persona": {
        "name": "Nome S.",
        "age": 35,
        "city": "São Paulo, SP",
        "context": "mãe de 2 filhos, trabalha em escritório"
      },
      "testimonial_text": "texto do depoimento aqui...",
      "usage_time": "2 semanas",
      "headline": "headline curta e emocional",
      "emotion_tag": "alívio",
      "rating": 5,
      "headline_variations": ["variação 1", "variação 2", "variação 3"],
      "testimonial_variation": "versão alternativa do depoimento",
      "image_prompt": "prompt detalhado para gerar imagem realista da persona: selfie casual, ambiente cotidiano, iluminação natural..."
    }
  ]
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
        temperature: 0.9,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit atingido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos na sua conta." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("Erro ao gerar testemunhos");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Extract JSON from response
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch {
      parsed = { raw: content };
    }

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
