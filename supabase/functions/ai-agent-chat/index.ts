import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getActiveLLM, logTokenUsage } from "../_shared/llm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_MESSAGES = 50;
const MAX_MESSAGE_CHARS = 4000;
const MAX_KB_FETCH = 60;   // fetch more, score by relevance
const MAX_KB_CONTEXT = 10; // inject top-N most relevant

// Keyword relevance scoring: how many query words appear in the item content
function scoreKbItem(item: any, queryWords: string[]): number {
  if (queryWords.length === 0) return 1;
  const text = [
    item.content?.question,
    item.content?.answer,
    item.content?.text,
    item.content?.crawled_content,
    typeof item.content?.data === "string" ? item.content.data : "",
  ].filter(Boolean).join(" ").toLowerCase();

  let score = queryWords.reduce((s: number, w: string) => s + (text.includes(w) ? 1 : 0), 0);
  // Bonus: FAQ exact question prefix match
  if (item.type === "faq") {
    const q = (item.content?.question || "").toLowerCase();
    if (queryWords.some((w: string) => q.startsWith(w))) score += 2;
  }
  return score;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ── Auth: require valid user JWT ─────────────────────────────────────────
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await authClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(supabaseUrl, serviceKey);

    // Resolve tenant
    const { data: tenantUser } = await sb
      .from("tenant_users")
      .select("tenant_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    const tenantId = tenantUser?.tenant_id || null;

    // ── Input validation ──────────────────────────────────────────────────────
    const body = await req.json();
    const { agent_id, messages } = body;

    if (!agent_id || !messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "agent_id e messages são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeMessages = messages
      .slice(-MAX_MESSAGES)
      .map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content ?? "").substring(0, MAX_MESSAGE_CHARS),
      }));

    // ── Load agent ────────────────────────────────────────────────────────────
    // Special case: "__prompt_test__" means inline prompt from messages (no agent lookup)
    const isPromptTest = agent_id === "__prompt_test__";

    let agent: any = null;
    if (!isPromptTest) {
      let agentQuery = sb.from("ai_agents").select("*").eq("id", agent_id);
      if (tenantId) agentQuery = agentQuery.eq("tenant_id", tenantId);
      const { data: agentData, error: agentErr } = await agentQuery.maybeSingle();
      if (agentErr || !agentData) {
        return new Response(JSON.stringify({ error: "Agente não encontrado" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      agent = agentData;
    }

    // ── Knowledge base — relevance-ranked ────────────────────────────────────────
    let kbContext = "";
    if (agent) {
      const { data: kbLinks } = await sb
        .from("ai_agent_knowledge_bases")
        .select("knowledge_base_id")
        .eq("agent_id", agent.id);

      if (kbLinks && kbLinks.length > 0) {
        const kbIds = kbLinks.map((l: any) => l.knowledge_base_id);
        const { data: items } = await sb
          .from("ai_kb_items")
          .select("type, content")
          .in("knowledge_base_id", kbIds)
          .eq("status", "trained")
          .limit(MAX_KB_FETCH);

        if (items && items.length > 0) {
          // Extract query words from last user message for scoring
          const lastUserMsg = safeMessages.filter((m: any) => m.role === "user").pop()?.content?.toLowerCase() || "";
          const queryWords = lastUserMsg.split(/\s+/).filter((w: string) => w.length > 3);

          // Score and sort by relevance, take top MAX_KB_CONTEXT
          const ranked = (items as any[])
            .map((item) => ({ item, score: scoreKbItem(item, queryWords) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, MAX_KB_CONTEXT)
            .map(({ item }) => item);

          const faqEntries = ranked
            .filter((i: any) => i.type === "faq")
            .map((i: any) => `P: ${i.content.question}\nR: ${i.content.answer}`);
          const textEntries = ranked
            .filter((i: any) => i.type === "text")
            .map((i: any) => String(i.content.text ?? "").substring(0, 3000));
          const urlEntries = ranked
            .filter((i: any) => i.type === "url" && i.content.crawled_content)
            .map((i: any) => String(i.content.crawled_content).substring(0, 3000));
          const tableEntries = ranked
            .filter((i: any) => i.type === "table")
            .map((i: any) => i.content.data);

          const parts = [];
          if (faqEntries.length) parts.push("## FAQ\n" + faqEntries.join("\n\n"));
          if (textEntries.length) parts.push("## Textos de Referência\n" + textEntries.join("\n\n---\n\n"));
          if (urlEntries.length) parts.push("## Conteúdo de Sites\n" + urlEntries.join("\n\n---\n\n"));
          if (tableEntries.length) parts.push("## Dados Tabulares\n" + tableEntries.join("\n\n"));
          if (parts.length) kbContext = "\n\n# BASE DE CONHECIMENTO\nUse as informações abaixo para responder:\n\n" + parts.join("\n\n");
        }
      }
    } // end if(agent)

    // ── Resolve LLM ────────────────────────────────────────────────────────────
    const selection = await getActiveLLM(sb, {
      agentLlmOverride: agent?.llm_override,
      agentModel: agent?.model || (body.model as string | undefined),
      tenantId,
    });

    // For __prompt_test__, the system prompt comes from the messages array itself
    // (the caller sets role:"system" as first message). For real agents, build it normally.
    let systemPrompt: string;
    let chatMessages: any[];
    if (isPromptTest) {
      const sysMsg = safeMessages.find((m: any) => m.role === "system");
      systemPrompt = sysMsg?.content || "Você é um assistente útil.";
      chatMessages = safeMessages.filter((m: any) => m.role !== "system");
    } else {
      systemPrompt = (agent.system_prompt || "Você é um assistente útil.") + kbContext;
      chatMessages = safeMessages;
    }
    const allMessages = [{ role: "system", content: systemPrompt }, ...chatMessages];

    const inputChars = allMessages.reduce((sum: number, m: any) => sum + (m.content?.length || 0), 0);
    const estimatedInputTokens = Math.ceil(inputChars / 4);

    let response = await callLLM(selection, allMessages, agent?.temperature ?? 0.7, true);

    // Fallback to Lovable AI on external failure
    if (!response.ok && selection.provider !== "lovable") {
      const errStatus = response.status;
      const errText = await response.text();
      console.error("External AI failed:", errStatus, errText.substring(0, 200), "— falling back to Lovable AI");
      const fallback = {
        apiUrl: "https://ai.gateway.lovable.dev/v1/chat/completions",
        apiKey: Deno.env.get("LOVABLE_API_KEY") || "",
        model: "google/gemini-2.5-flash",
        provider: "lovable",
      };
      response = await callLLM(fallback, allMessages, agent.temperature ?? 0.7, true);
    }

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit excedido. Tente novamente em alguns segundos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos no workspace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("AI error:", status, t.substring(0, 300));
      return new Response(JSON.stringify({ error: "Erro na IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Estimate output tokens (~0.3x input is a reasonable heuristic for chat)
    const estimatedOutputTokens = Math.ceil(estimatedInputTokens * 0.3);

    logTokenUsage(sb, {
      agent_id,
      agent_name: agent.name || "",
      function_name: "ai-agent-chat",
      selection,
      input_tokens: estimatedInputTokens,
      output_tokens: estimatedOutputTokens,
      tenant_id: tenantId,
    });

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

async function callLLM(
  selection: { apiUrl: string; apiKey: string; model: string; provider: string },
  messages: any[],
  temperature: number,
  stream: boolean,
): Promise<Response> {
  if (selection.provider === "anthropic") {
    const systemMsg = messages.find((m) => m.role === "system");
    const chatMessages = messages.filter((m) => m.role !== "system");
    return fetch(selection.apiUrl, {
      method: "POST",
      headers: {
        "x-api-key": selection.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selection.model,
        system: systemMsg?.content ?? "",
        messages: chatMessages,
        temperature,
        max_tokens: 2048,
        stream,
      }),
    });
  }

  return fetch(selection.apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${selection.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: selection.model, messages, temperature, stream }),
  });
}
