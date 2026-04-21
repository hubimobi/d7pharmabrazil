import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getActiveLLM, logTokenUsage } from "../_shared/llm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { agent_id, messages } = await req.json();
    if (!agent_id || !messages) {
      return new Response(JSON.stringify({ error: "agent_id and messages required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const { data: agent, error: agentErr } = await sb.from("ai_agents").select("*").eq("id", agent_id).single();
    if (agentErr || !agent) {
      return new Response(JSON.stringify({ error: "Agent not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Knowledge base context
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

    // Resolve LLM via shared helper
    let selection = await getActiveLLM(sb, {
      agentLlmOverride: agent.llm_override,
      agentModel: agent.model,
    });

    const systemPrompt = (agent.system_prompt || "Você é um assistente útil.") + kbContext;
    const allMessages = [{ role: "system", content: systemPrompt }, ...messages];
    const inputChars = allMessages.reduce((sum: number, m: any) => sum + (m.content?.length || 0), 0);
    const estimatedInputTokens = Math.ceil(inputChars / 4);

    let response = await fetch(selection.apiUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${selection.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: selection.model, messages: allMessages, stream: true }),
    });

    // Fallback to Lovable AI on external failure
    if (!response.ok && selection.provider !== "lovable") {
      const errStatus = response.status;
      const errText = await response.text();
      console.error("External AI failed:", errStatus, errText, "— falling back to Lovable AI");
      selection = {
        apiUrl: "https://ai.gateway.lovable.dev/v1/chat/completions",
        apiKey: Deno.env.get("LOVABLE_API_KEY") || "",
        model: "google/gemini-2.5-flash",
        provider: "lovable",
      };
      response = await fetch(selection.apiUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${selection.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: selection.model, messages: allMessages, stream: true }),
      });
    }

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit excedido. Tente novamente em alguns segundos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos no workspace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("AI error:", status, t);
      return new Response(JSON.stringify({ error: "Erro na IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fire-and-forget token logging (estimated for streaming)
    logTokenUsage(sb, {
      agent_id,
      agent_name: agent.name || "",
      function_name: "ai-agent-chat",
      selection,
      input_tokens: estimatedInputTokens,
      output_tokens: 500,
    });

    return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
