import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { agent_id, messages, session_id } = await req.json();
    if (!agent_id || !messages) {
      return new Response(JSON.stringify({ error: "agent_id and messages required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Get agent
    const { data: agent, error: agentErr } = await sb.from("ai_agents").select("*").eq("id", agent_id).single();
    if (agentErr || !agent) {
      return new Response(JSON.stringify({ error: "Agent not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get agent's knowledge base content
    let kbContext = "";
    const { data: kbLinks } = await sb.from("ai_agent_knowledge_bases").select("knowledge_base_id").eq("agent_id", agent_id);
    if (kbLinks && kbLinks.length > 0) {
      const kbIds = kbLinks.map((l: any) => l.knowledge_base_id);
      const { data: items } = await sb.from("ai_kb_items").select("*").in("knowledge_base_id", kbIds).eq("status", "trained");
      if (items && items.length > 0) {
        const faqEntries = items.filter((i: any) => i.type === "faq").map((i: any) => `P: ${i.content.question}\nR: ${i.content.answer}`);
        const textEntries = items.filter((i: any) => i.type === "text").map((i: any) => i.content.text);
        const urlEntries = items.filter((i: any) => i.type === "url" && i.content.crawled_content).map((i: any) => i.content.crawled_content);
        const tableEntries = items.filter((i: any) => i.type === "table").map((i: any) => i.content.data);

        const parts = [];
        if (faqEntries.length) parts.push("## FAQ\n" + faqEntries.join("\n\n"));
        if (textEntries.length) parts.push("## Textos de Referência\n" + textEntries.join("\n\n---\n\n"));
        if (urlEntries.length) parts.push("## Conteúdo de Sites\n" + urlEntries.join("\n\n---\n\n"));
        if (tableEntries.length) parts.push("## Dados Tabulares\n" + tableEntries.join("\n\n"));
        if (parts.length) kbContext = "\n\n# BASE DE CONHECIMENTO\nUse as informações abaixo para responder:\n\n" + parts.join("\n\n");
      }
    }

    // Check for external LLM config
    const { data: llmConfigs } = await sb.from("ai_llm_config").select("*").eq("active", true).limit(1);
    const externalConfig = llmConfigs?.[0];
    const agentLlmOverride = agent.llm_override;

    let apiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
    let apiKey = Deno.env.get("LOVABLE_API_KEY") || "";
    let model = agent.model || "google/gemini-3-flash-preview";

    if (agentLlmOverride && agentLlmOverride !== "lovable") {
      // Agent-level override
      const overrideConfig = llmConfigs?.find((c: any) => c.provider === agentLlmOverride) || externalConfig;
      if (overrideConfig && overrideConfig.provider !== "lovable") {
        const extKey = Deno.env.get(overrideConfig.api_key_name);
        if (extKey) {
          apiKey = extKey;
          model = overrideConfig.default_model || model;
        if (overrideConfig.provider === "xai") apiUrl = "https://api.x.ai/v1/chat/completions";
          else if (overrideConfig.provider === "openai") apiUrl = "https://api.openai.com/v1/chat/completions";
          else if (overrideConfig.provider === "anthropic") apiUrl = "https://api.anthropic.com/v1/messages";
        }
      }
    } else if (externalConfig && externalConfig.provider !== "lovable") {
      const extKey = Deno.env.get(externalConfig.api_key_name);
      if (extKey) {
        apiKey = extKey;
        model = externalConfig.default_model || model;
        if (externalConfig.provider === "xai") apiUrl = "https://api.x.ai/v1/chat/completions";
        else if (externalConfig.provider === "openai") apiUrl = "https://api.openai.com/v1/chat/completions";
        else if (externalConfig.provider === "anthropic") apiUrl = "https://api.anthropic.com/v1/messages";
      }
    }

    const systemPrompt = (agent.system_prompt || "Você é um assistente útil.") + kbContext;

    // Determine provider info for logging
    let providerName = "lovable";
    if (apiUrl.includes("x.ai")) providerName = "xai";
    else if (apiUrl.includes("openai.com")) providerName = "openai";
    else if (apiUrl.includes("anthropic.com")) providerName = "anthropic";

    // Estimate input tokens
    const allMessages = [{ role: "system", content: systemPrompt }, ...messages];
    const inputChars = allMessages.reduce((sum: number, m: any) => sum + (m.content?.length || 0), 0);
    const estimatedInputTokens = Math.ceil(inputChars / 4);

    let response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: allMessages,
        stream: true,
      }),
    });

    let usedModel = model;
    let usedProvider = providerName;

    // Fallback to Lovable AI if external provider fails
    if (!response.ok && apiUrl !== "https://ai.gateway.lovable.dev/v1/chat/completions") {
      const errStatus = response.status;
      const errText = await response.text();
      console.error("External AI failed:", errStatus, errText, "— falling back to Lovable AI");
      
      const fallbackKey = Deno.env.get("LOVABLE_API_KEY") || "";
      const fallbackModel = "google/gemini-3-flash-preview";
      usedModel = fallbackModel;
      usedProvider = "lovable";
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${fallbackKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: fallbackModel,
          messages: allMessages,
          stream: true,
        }),
      });
    }

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos no workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", status, t);
      return new Response(JSON.stringify({ error: "Erro na IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log estimated token usage (fire-and-forget)
    // For streaming, we estimate output tokens from a typical response (~500 tokens)
    const estimatedOutputTokens = 500;
    sb.from("ai_token_usage").insert({
      agent_id: agent_id,
      agent_name: agent.name || "",
      provider: usedProvider,
      model: usedModel,
      input_tokens: estimatedInputTokens,
      output_tokens: estimatedOutputTokens,
      total_tokens: estimatedInputTokens + estimatedOutputTokens,
      function_name: "ai-agent-chat",
    }).then(() => {}).catch((e: any) => console.error("Token log error:", e));

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
