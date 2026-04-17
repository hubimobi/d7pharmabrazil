import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const MODEL = "google/gemini-3-flash-preview";

const PRESERVE_RULES = `REGRAS OBRIGATÓRIAS DE PRESERVAÇÃO:
- NUNCA altere, traduza, remova ou renomeie variáveis no formato {NomeDaVariavel} (ex: {Nome}, {Primeiro_Nome}, {Produto}, {Link}, {Cupom}). Mantenha-as EXATAMENTE como estão.
- NUNCA quebre a estrutura de spintax {opção1|opção2|opção3}. Pode reescrever as opções internas, mas mantenha o formato {a|b|c}.
- Preserve TODOS os emojis presentes no texto original (você pode reposicioná-los, mas não removê-los a menos que excedam o tom solicitado).
- Mantenha o texto em PORTUGUÊS BRASILEIRO.
- Tom de WhatsApp: direto, próximo, sem formalidade exagerada, sem markdown (sem **negrito**, sem listas com hífen). Pode usar quebras de linha.`;

function spellSystemPrompt() {
  return `Você é um corretor ortográfico e gramatical para mensagens de WhatsApp em português brasileiro.

Sua tarefa: corrigir SOMENTE erros de ortografia, acentuação, pontuação básica e concordância. NÃO reescreva, NÃO mude o estilo, NÃO mude o tom, NÃO adicione nem remova frases.

${PRESERVE_RULES}

Responda APENAS com o texto corrigido. Sem explicações, sem aspas, sem comentários.`;
}

function improveSystemPrompt(tone: string, goal: string, size: string) {
  const sizeMap: Record<string, string> = {
    curto: "1-2 frases curtas (máx 25 palavras)",
    medio: "3-5 frases (máx 60 palavras)",
    longo: "5-8 frases (máx 120 palavras)",
  };
  return `Você é um copywriter especialista em mensagens de WhatsApp de alta conversão para o mercado brasileiro.

Sua tarefa: reescrever a mensagem do usuário gerando 3 variações diferentes, cada uma otimizada para conversão.

CONTEXTO:
- Tom: ${tone}
- Objetivo: ${goal}
- Tamanho: ${sizeMap[size] || sizeMap.medio}

${PRESERVE_RULES}

Boas práticas:
- Comece com algo que prenda atenção (gatilho, pergunta, benefício).
- Use prova social, urgência ou exclusividade quando fizer sentido para o objetivo.
- Termine com CTA claro quando o objetivo for vender/agendar.
- Use emojis com moderação (1-3 por mensagem) salvo se o original já tiver mais.

Retorne EXATAMENTE no formato JSON (sem markdown, sem \`\`\`):
{"variations":["texto da variação 1","texto da variação 2","texto da variação 3"]}`;
}

async function callAI(systemPrompt: string, userText: string, expectJson: boolean) {
  const body: Record<string, unknown> = {
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userText },
    ],
  };
  if (expectJson) {
    body.response_format = { type: "json_object" };
  }

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    if (resp.status === 429) {
      throw new Error("RATE_LIMIT");
    }
    if (resp.status === 402) {
      throw new Error("CREDITS_EXHAUSTED");
    }
    throw new Error(`AI gateway error ${resp.status}: ${txt}`);
  }

  const json = await resp.json();
  const content: string = json.choices?.[0]?.message?.content ?? "";
  const usage = json.usage ?? {};
  return {
    content,
    input_tokens: Number(usage.prompt_tokens || 0),
    output_tokens: Number(usage.completion_tokens || 0),
    total_tokens: Number(usage.total_tokens || 0),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: authError } = await userClient.auth.getClaims();
    if (authError || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roles = (roleData || []).map((r: { role: string }) => r.role);
    const allowed = roles.some((r) =>
      ["admin", "super_admin", "administrador", "gestor", "suporte"].includes(r),
    );
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const text: string = (body.text || "").toString();
    const mode: string = body.mode === "improve" ? "improve" : "spell";
    const tone: string = body.tone || "amigavel";
    const goal: string = body.goal || "vender";
    const size: string = body.size || "medio";

    if (!text.trim()) {
      return new Response(JSON.stringify({ error: "Texto vazio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: { improved_text?: string; variations?: string[] } = {};
    let usage = { input_tokens: 0, output_tokens: 0, total_tokens: 0 };

    if (mode === "spell") {
      const ai = await callAI(spellSystemPrompt(), text, false);
      usage = ai;
      result = { improved_text: ai.content.trim() };
    } else {
      const ai = await callAI(improveSystemPrompt(tone, goal, size), text, true);
      usage = ai;
      let variations: string[] = [];
      try {
        const parsed = JSON.parse(ai.content);
        variations = Array.isArray(parsed.variations) ? parsed.variations.slice(0, 3) : [];
      } catch {
        variations = [ai.content.trim()];
      }
      result = { variations };
    }

    // Log usage (best-effort)
    try {
      await adminClient.from("ai_token_usage").insert({
        agent_name: "MessageComposer",
        function_name: mode === "spell" ? "improve-message-copy:spell" : "improve-message-copy:improve",
        provider: "lovable",
        model: MODEL,
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        total_tokens: usage.total_tokens,
      });
    } catch (_e) { /* ignore */ }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "RATE_LIMIT") {
      return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (msg === "CREDITS_EXHAUSTED") {
      return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos em Lovable Cloud." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.error("improve-message-copy error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
