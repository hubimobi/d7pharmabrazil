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

    const { text, productName, context } = await req.json();
    if (!text || text.trim().length < 10) {
      return new Response(JSON.stringify({ error: "Texto muito curto para análise" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const llm = await getActiveLLM(sb);
    const customPrompt = await getCustomPrompt(sb, "analyze_copy_score");

    const systemPrompt = customPrompt?.system_prompt || `Você é um sistema avançado de análise de copywriting focado em alta conversão para o mercado brasileiro.
Analise o texto e retorne APENAS JSON válido seguindo esta estrutura exata:

{
  "analysis": {
    "emotional_words": ["palavra1", "palavra2"],
    "power_words": ["palavra1", "palavra2"],
    "has_cta": true/false,
    "has_clear_promise": true/false,
    "has_proof": true/false
  },
  "scores": {
    "clareza": 0-10,
    "emocao": 0-10,
    "dor_desejo": 0-10,
    "prova": 0-10,
    "urgencia": 0-10,
    "fit_disc": 0-10,
    "fit_ocean": 0-10,
    "fit_funil": 0-10
  },
  "final_score": número de 0 a 10 (usando a fórmula: clareza*0.15 + emocao*0.25 + dor_desejo*0.20 + prova*0.15 + urgencia*0.10 + fit_disc*0.10 + fit_ocean*0.05),
  "classification": "fraco" | "médio" | "bom" | "alta conversão",
  "improvements": {
    "rewritten_headline": "headline reescrita com mais impacto",
    "suggestions": ["melhoria 1", "melhoria 2", "melhoria 3"],
    "stronger_words": ["palavra forte 1", "palavra forte 2", "palavra forte 3"],
    "profile_adjustments": "ajustes sugeridos para o perfil do público"
  }
}`;

    const userPrompt = `Analise o seguinte texto de copywriting${productName ? ` do produto "${productName}"` : ""}${context ? ` (contexto: ${context})` : ""}:

---
${text}
---

Retorne APENAS o JSON de análise, sem markdown ou explicações.`;

    const temperature = customPrompt?.temperature || 0.4;

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
      throw new Error("Erro ao analisar copy");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const usage = data.usage;

    // Log token usage
    try {
      const inputTokens = usage?.prompt_tokens || Math.ceil((systemPrompt.length + userPrompt.length) / 4);
      const outputTokens = usage?.completion_tokens || Math.ceil(content.length / 4);
      await sb.from("ai_token_usage").insert({
        agent_name: "Análise de Copy Score",
        provider: llm.apiUrl.includes("lovable") ? "lovable" : llm.apiUrl.includes("x.ai") ? "xai" : "openai",
        model: llm.model,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
        function_name: "analyze-copy-score",
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
