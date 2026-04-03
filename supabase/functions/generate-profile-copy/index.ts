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
      return { apiUrl: url, apiKey: extKey, model: ext.default_model || "grok-3-mini-fast" };
    }
  }
  return { apiUrl: "https://ai.gateway.lovable.dev/v1/chat/completions", apiKey: Deno.env.get("LOVABLE_API_KEY") || "", model: "google/gemini-2.5-flash" };
}

async function getCustomPrompt(sb: any, toolKey: string) {
  const { data } = await sb.from("ai_system_prompts").select("system_prompt, temperature").eq("tool_key", toolKey).single();
  return data;
}

const discMap: Record<string, string> = {
  D: "Dominância — tom direto, focado em resultados rápidos, linguagem assertiva e de comando",
  I: "Influência — tom emocional, empolgante, social, usa histórias e entusiasmo",
  S: "Estabilidade — tom seguro, confiável, tranquilo, foca em garantias e estabilidade",
  C: "Conformidade — tom lógico, técnico, detalhado, usa dados e precisão",
};

const oceanMap: Record<string, string> = {
  openness: "Abertura à Experiência — foco em inovação, novidade, criatividade",
  conscientiousness: "Conscienciosidade — foco em disciplina, organização, método",
  extraversion: "Extroversão — foco em entusiasmo, energia, interação social",
  agreeableness: "Amabilidade — foco em empatia, harmonia, cuidado com o outro",
  neuroticism: "Neuroticismo — foco em prevenção de problemas, medo de perder, segurança",
};

const funnelMap: Record<string, string> = {
  unaware: "Sem noção do problema — educar com curiosidade, revelar o problema de forma sutil",
  curious: "Curioso — aprofundar com prova social, dados e autoridade",
  ready: "Pronto para comprar — urgência, escassez, decisão imediata",
  post: "Pós-compra — relacionamento, confiança, fidelização e recompra",
};

const copyMethodMap: Record<string, string> = {
  venda: `V.E.N.D.A — Estrutura: Validação → Explicação → Nova visão → Direção → Abertura → Saída (CTA leve).
Tom: Humano, simples, empático, conversacional. Ideal para público frio, engajamento e stories.`,
  aida: `A.I.D.A — Estrutura: Atenção → Interesse → Desejo → Ação.
Tom: Clareza, progressivo, envolvente. Ideal para público em consideração, anúncios e conteúdos estruturados.`,
  corte: `C.O.R.T.E — Estrutura: Confronto → Oportunidade → Risco → Transição → Engajamento.
Tom: Direto, firme, persuasivo. Ideal para público quente, ofertas, remarketing e fechamento.`,
  ccp: `C.C.P — Estrutura: Cabeça (captura atenção, máx 12 palavras) → Corpo (explica problema, quebra crença, máx 3 linhas) → Pés (CTA claro, máx 1 linha).
Tom: Adaptável ao contexto. Focado em dor, desejo ou resultado.`,
};

function buildUserPrompt(params: any): string {
  const { productName, productDescription, benefits, discProfile, oceanTrait, funnelStage, platform, mode, copyMethod, ctaType } = params;

  const funnelText = funnelStage === "all"
    ? "TODAS as fases (Sem noção, Curioso, Pronto para comprar, Pós-compra)"
    : (funnelMap[funnelStage] || funnelStage);

  if (mode === "caixinha_pergunta" || mode === "quizz_conversao") {
    const isCaixinha = mode === "caixinha_pergunta";
    const profileModel = discProfile === "all"
      ? "DISC (D, I, S, C)"
      : (oceanTrait === "all"
        ? "OCEAN (Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism)"
        : `DISC: ${discMap[discProfile] || discProfile}, OCEAN: ${oceanMap[oceanTrait] || oceanTrait}`);

    const methodText = isCaixinha && copyMethod && copyMethodMap[copyMethod]
      ? `\nMÉTODO DE RESPOSTA OBRIGATÓRIO: ${copyMethodMap[copyMethod]}`
      : "";

    const copyInstructions = isCaixinha ? `

ETAPA 3: Para CADA pergunta gerada, crie:
- RESPOSTA: O que o SEGUIDOR/PERFIL responderia na caixinha. Deve ser curta (máximo 80 caracteres), natural, como uma pessoa real digitaria no Instagram. Adaptar ao perfil comportamental (ex: perfil D responde direto, perfil I responde com emoção).
- COPY: A resposta que a EMPRESA/PROFISSIONAL daria no Stories após receber a pergunta. Seguir o método ${(copyMethod || "venda").toUpperCase()}:${methodText}
  - Linguagem natural e humana
  - Máximo 5 linhas curtas (ideal para Stories)
  - Foco em conversão
  - Incluir CTA leve no final
  - Adaptar para o perfil comportamental indicado
  - Adaptar para a etapa da jornada indicada` : "";

    return `Analise o seguinte conteúdo e gere ${isCaixinha ? "perguntas para Instagram Stories (caixinha de perguntas)" : "perguntas para um Quizz de Conversão interativo"}.

PRODUTO/CONTEÚDO: ${productName}
DESCRIÇÃO: ${productDescription || "N/A"}
BENEFÍCIOS: ${benefits || "N/A"}
PLATAFORMA: ${isCaixinha ? "Instagram Stories — Caixinha de Perguntas" : "Quizz de Conversão (Instagram/Landing Page)"}
MODELO DE PERFIL: ${profileModel}
FASE DO FUNIL: ${funnelText}${methodText}

ETAPA 1: Identifique:
- Público-alvo
- Principal dor
- Desejo central
- Objeções comuns

ETAPA 2: Gere ${isCaixinha ? "perguntas para caixinha de perguntas do Instagram Stories" : "perguntas de quizz de conversão"}, seguindo:
- 1 pergunta para cada perfil comportamental do modelo selecionado
- Para cada fase do funil selecionada
- A PERGUNTA deve ativar dor ou desejo do perfil na fase indicada
${copyInstructions}

REGRAS:
- As perguntas devem parecer naturais (linguagem humana)
- Devem ativar dor ou desejo
- Máximo 12 palavras por pergunta
- Evitar linguagem técnica
- Gerar curiosidade ou identificação
- Evitar linguagem robótica
- Focar em dor, desejo ou resultado
- Máximo de clareza com mínimo de palavras
${!isCaixinha ? "- Cada pergunta do quizz deve ter opções que revelam o perfil do respondente\n- A resposta deve direcionar sutilmente para o produto/solução" : ""}

IMPORTANTE SOBRE OS CAMPOS (CAIXINHA):
${isCaixinha ? `- "pergunta": A pergunta que aparece na caixinha do Stories (máx 12 palavras). Relacionada à fase e ao perfil comportamental.
- "resposta": O que o SEGUIDOR digitaria como resposta na caixinha (máx 80 caracteres, curta e natural, como uma pessoa real escreveria). Deve refletir o comportamento do perfil.
- "copy": A resposta que a EMPRESA/PROFISSIONAL publicaria no Stories respondendo à pergunta. Seguir o método selecionado. Máximo 5 linhas curtas. Baseada no conteúdo do produto/URL/texto fornecido.
- "cta_copy": CTA leve no final da copy.` : ""}

Retorne JSON com esta estrutura EXATA:
{
  "questions": [
    {
      "perfil": "nome do perfil (ex: D - Dominância ou Openness)",
      "jornada": "fase do funil (ex: Curioso, Pronto p/ Compra)",
      "pergunta": "a pergunta em até 12 palavras",
      "resposta": "${isCaixinha ? "resposta curta do seguidor, máx 80 caracteres, como digitaria no Instagram" : "resposta que direciona para a conversão/produto"}"${isCaixinha ? `,
      "copy": "copy completa da empresa seguindo o método ${(copyMethod || "venda").toUpperCase()}, máximo 5 linhas curtas, pronta para usar no stories",
      "cta_copy": "CTA leve ou direto conforme o método"` : ""}
    }
  ],
  "publico_alvo": "descrição do público-alvo identificado",
  "principal_dor": "principal dor identificada",
  "desejo_central": "desejo central identificado"
}

Gere no mínimo 8 perguntas variadas, cobrindo diferentes perfis e fases.`;
  }

  if (mode === "all_disc") {
    return `Gere UMA copy de alta conversão para CADA perfil DISC (D, I, S, C) para o mesmo produto.

PRODUTO: ${productName}
DESCRIÇÃO: ${productDescription || "N/A"}
BENEFÍCIOS: ${benefits || "N/A"}
PLATAFORMA: ${platform || "geral"}
FASE DO FUNIL: ${funnelText}${ctaType ? `\nCTA OBRIGATÓRIO: Use "${ctaType}" como call to action principal.` : ""}

Para cada perfil, adapte o tom, os gatilhos e a linguagem. Também estime uma performance de conversão de 0 a 100 para cada perfil.

Retorne JSON com esta estrutura EXATA:
{
  "profiles": {
    "D": {
      "profile_summary": "Como a copy foi adaptada para Dominância",
      "headline": "...",
      "subheadline": "...",
      "body_blocks": ["bloco 1", "bloco 2", "bloco 3"],
      "cta": "...",
      "triggers_used": ["gatilho 1", "gatilho 2"],
      "estimated_performance": 85,
      "tone": "descrição curta do tom usado"
    },
    "I": { ... mesmo formato ... },
    "S": { ... mesmo formato ... },
    "C": { ... mesmo formato ... }
  },
  "best_profile": "D ou I ou S ou C — qual tem maior potencial de conversão",
  "comparison_notes": "Análise comparativa entre os 4 perfis"
}`;
  }

  if (mode === "all_ocean") {
    return `Gere UMA copy de alta conversão para CADA traço OCEAN (Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism) para o mesmo produto.

PRODUTO: ${productName}
DESCRIÇÃO: ${productDescription || "N/A"}
BENEFÍCIOS: ${benefits || "N/A"}
PLATAFORMA: ${platform || "geral"}
FASE DO FUNIL: ${funnelText}

Para cada traço, adapte o tom, os gatilhos e a linguagem. Também estime uma performance de conversão de 0 a 100 para cada traço.

Retorne JSON com esta estrutura EXATA:
{
  "profiles": {
    "openness": {
      "profile_summary": "Como a copy foi adaptada para Abertura à Experiência",
      "headline": "...",
      "subheadline": "...",
      "body_blocks": ["bloco 1", "bloco 2", "bloco 3"],
      "cta": "...",
      "triggers_used": ["gatilho 1", "gatilho 2"],
      "estimated_performance": 85,
      "tone": "descrição curta do tom usado"
    },
    "conscientiousness": { ... mesmo formato ... },
    "extraversion": { ... mesmo formato ... },
    "agreeableness": { ... mesmo formato ... },
    "neuroticism": { ... mesmo formato ... }
  },
  "best_profile": "qual traço tem maior potencial de conversão",
  "comparison_notes": "Análise comparativa entre os 5 traços OCEAN"
}`;
  }

  // Default single profile mode
  const ctaInstruction = ctaType ? `\nCTA OBRIGATÓRIO: Use "${ctaType}" como call to action principal.` : "";
  return `Gere copies de alta conversão para:

PRODUTO: ${productName}
DESCRIÇÃO: ${productDescription || "N/A"}
BENEFÍCIOS: ${benefits || "N/A"}
PLATAFORMA: ${platform || "geral"}
${ctaInstruction}

PERFIL DISC: ${discMap[discProfile] || discProfile}
TRAÇO OCEAN: ${oceanMap[oceanTrait] || oceanTrait}
FASE DO FUNIL: ${funnelText}

Retorne JSON com esta estrutura EXATA:
{
  "profile_summary": "Resumo do perfil comportamental e como a copy foi adaptada",
  "copies": [
    {
      "label": "Copy Principal",
      "headline": "...",
      "subheadline": "...",
      "body_blocks": ["bloco 1", "bloco 2", "bloco 3"],
      "cta": "...",
      "triggers_used": ["gatilho 1", "gatilho 2"]
    },
    {
      "label": "Variação A",
      "headline": "...",
      "subheadline": "...",
      "body_blocks": ["bloco 1", "bloco 2", "bloco 3"],
      "cta": "...",
      "triggers_used": ["gatilho 1", "gatilho 2"]
    },
    {
      "label": "Variação B",
      "headline": "...",
      "subheadline": "...",
      "body_blocks": ["bloco 1", "bloco 2", "bloco 3"],
      "cta": "...",
      "triggers_used": ["gatilho 1", "gatilho 2"]
    }
  ],
  "tone_guide": "Guia de tom de voz para esse perfil",
  "avoid_words": ["palavras a evitar para esse perfil"],
  "power_words": ["palavras de poder recomendadas"]
}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await sb.auth.getUser(token);
    if (authErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: roles } = await sb.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles || []).some((r: any) => ["admin","super_admin","administrador","suporte","gestor","financeiro"].includes(r.role));
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const { productName } = body;

    if (!productName) {
      return new Response(JSON.stringify({ error: "Nome do produto é obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const llm = await getActiveLLM(sb);
    const customPrompt = await getCustomPrompt(sb, "generate_profile_copy");

    const systemPrompt = customPrompt?.system_prompt || `Você é um copywriter especialista em alta conversão para o mercado brasileiro, com domínio em personalização por perfil psicológico (DISC e OCEAN) e estágio de consciência do cliente.

REGRAS OBRIGATÓRIAS:
- Linguagem simples e direta
- Foco em BENEFÍCIOS, nunca em características
- Incluir pelo menos 2 gatilhos mentais por copy
- Emoção alinhada ao perfil comportamental
- Evitar linguagem genérica ou clichê
- Cada copy deve ser pronta para copiar e colar
- Responda SEMPRE em JSON válido`;

    const userPrompt = buildUserPrompt(body);
    const temperature = customPrompt?.temperature || 0.8;

    let response = await fetch(llm.apiUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${llm.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: llm.model, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], temperature }),
    });

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
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit. Tente novamente." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("Erro ao gerar copy");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const usage = data.usage;

    try {
      const inputTokens = usage?.prompt_tokens || Math.ceil((systemPrompt.length + userPrompt.length) / 4);
      const outputTokens = usage?.completion_tokens || Math.ceil(content.length / 4);
      await sb.from("ai_token_usage").insert({
        agent_name: "Copy por Perfil",
        provider: llm.apiUrl.includes("lovable") ? "lovable" : llm.apiUrl.includes("x.ai") ? "xai" : "openai",
        model: llm.model,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
        function_name: "generate-profile-copy",
      });
    } catch (logErr) { console.error("Token log error:", logErr); }

    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: content };
    } catch { parsed = { raw: content }; }

    return new Response(JSON.stringify({ success: true, data: parsed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
