import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getActiveLLM } from "../_shared/llm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getCustomPrompt(sb: any, toolKey: string) {
  const { data } = await sb.from("ai_system_prompts").select("system_prompt, temperature").eq("tool_key", toolKey).single();
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question, productName, productDescription, benefits, faqs } = await req.json();
    if (!question || !productName) {
      return new Response(JSON.stringify({ error: "question and productName are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const llm = await getActiveLLM(sb);
    const customPrompt = await getCustomPrompt(sb, "product_qa");

    const faqText = (faqs || []).map((f: any) => `P: ${f.q}\nR: ${f.a}`).join("\n\n");
    const benefitsText = (benefits || []).join(", ");
    const cleanDesc = (productDescription || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

    const basePrompt = customPrompt?.system_prompt || `Você é um especialista em produtos. Responda APENAS com base nas informações fornecidas. Se não souber, sugira contato pelo WhatsApp.

Regras:
- Português brasileiro
- Conciso (3-4 frases)
- Não invente informações
- Amigável e profissional`;

    const systemPrompt = `${basePrompt}

Produto: ${productName}
Descrição: ${cleanDesc}
Benefícios: ${benefitsText}
${faqText ? `\nFAQ:\n${faqText}` : ""}`;

    let response = await fetch(llm.apiUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${llm.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: llm.model, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: question }] }),
    });

    if (!response.ok && llm.apiUrl !== "https://ai.gateway.lovable.dev/v1/chat/completions") {
      console.error("External AI failed:", response.status, "— falling back to Lovable AI");
      const fallbackKey = Deno.env.get("LOVABLE_API_KEY") || "";
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${fallbackKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: question }] }),
      });
    }

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Muitas perguntas, tente novamente." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Serviço indisponível." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || "Não foi possível gerar uma resposta.";
    const usage = data.usage;

    try {
      const inputTokens = usage?.prompt_tokens || Math.ceil((systemPrompt.length + question.length) / 4);
      const outputTokens = usage?.completion_tokens || Math.ceil(answer.length / 4);
      await sb.from("ai_token_usage").insert({
        agent_name: "Perguntas sobre Produto",
        provider: llm.apiUrl.includes("lovable") ? "lovable" : llm.apiUrl.includes("x.ai") ? "xai" : "openai",
        model: llm.model,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
        function_name: "product-qa",
      });
    } catch (logErr) { console.error("Token log error:", logErr); }

    return new Response(JSON.stringify({ answer }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("product-qa error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
