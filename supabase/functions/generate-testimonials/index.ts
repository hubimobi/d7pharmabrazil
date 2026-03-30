import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getActiveLLM(sb: any) {
  const { data: configs } = await sb.from("ai_llm_config").select("*").eq("active", true).limit(1);
  const ext = configs?.[0];
  if (ext && ext.provider !== "lovable") {
    const extKey = Deno.env.get(ext.api_key_name);
    if (extKey) {
      let url = "https://ai.gateway.lovable.dev/v1/chat/completions";
      if (ext.provider === "xai") url = "https://api.x.ai/v1/chat/completions";
      else if (ext.provider === "openai") url = "https://api.openai.com/v1/chat/completions";
      else if (ext.provider === "anthropic") url = "https://api.anthropic.com/v1/messages";
      return { apiUrl: url, apiKey: extKey, model: ext.default_model || "grok-3-mini-fast" };
    }
  }
  return { apiUrl: "https://ai.gateway.lovable.dev/v1/chat/completions", apiKey: Deno.env.get("LOVABLE_API_KEY") || "", model: "google/gemini-2.5-flash" };
}

async function getCustomPrompt(sb: any, toolKey: string) {
  const { data } = await sb.from("ai_system_prompts").select("system_prompt, user_prompt_template, temperature").eq("tool_key", toolKey).single();
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { productUrl, productName, productDescription, quantity = 5, benefits = [], regenerateHint, personaHint } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const llm = await getActiveLLM(sb);
    const customPrompt = await getCustomPrompt(sb, "generate_testimonials");

    const systemPrompt = customPrompt?.system_prompt || `Você é um especialista em marketing digital e copywriting brasileiro. Sua tarefa é gerar testemunhos ultra-realistas para produtos.

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

    const benefitsList = Array.isArray(benefits) && benefits.length > 0
      ? `\n\nBENEFÍCIOS DO PRODUTO (use como DORES RESOLVIDAS):\n${benefits.map((b: string, i: number) => `${i + 1}. ${b}`).join("\n")}`
      : "";

    let userPrompt = `Gere ${quantity} testemunhos ultra-realistas para este produto:

${productName ? `Nome: ${productName}` : ""}
${productDescription ? `Descrição: ${productDescription}` : ""}
${productUrl ? `URL: ${productUrl}` : ""}${benefitsList}

Para cada testemunho, crie uma persona variada (mãe preocupada, adulto com rotina corrida, pessoa cética, etc).
${regenerateHint ? `\nDica de headline para focar: ${regenerateHint}` : ""}
${personaHint ? `\nUse esta persona como base: ${personaHint}` : ""}

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
      "persona": { "name": "Nome S.", "age": 35, "city": "São Paulo, SP", "context": "mãe de 2 filhos" },
      "testimonial_text": "texto do depoimento...",
      "usage_time": "2 semanas",
      "headline": "headline curta e emocional",
      "emotion_tag": "alívio",
      "rating": 5,
      "headline_variations": ["variação 1", "variação 2", "variação 3"],
      "testimonial_variation": "versão alternativa",
      "image_prompt": "prompt para imagem realista da persona..."
    }
  ]
}`;

    const temperature = customPrompt?.temperature || 0.9;

    let response = await fetch(llm.apiUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${llm.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: llm.model, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], temperature }),
    });

    // Fallback to Lovable AI
    if (!response.ok && llm.apiUrl !== "https://ai.gateway.lovable.dev/v1/chat/completions") {
      console.error("External AI failed:", response.status, "— falling back to Lovable AI");
      const fallbackKey = Deno.env.get("LOVABLE_API_KEY") || "";
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${fallbackKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], temperature }),
      });
    }

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit atingido. Tente novamente." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("Erro ao gerar testemunhos");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: content };
    } catch { parsed = { raw: content }; }

    return new Response(JSON.stringify({ success: true, data: parsed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
