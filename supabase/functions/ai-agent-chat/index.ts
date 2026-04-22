import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getActiveLLM, logTokenUsage } from "../_shared/llm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_MESSAGES = 50;
const MAX_MESSAGE_CHARS = 4000;
const MAX_KB_ITEMS = 20;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ── Auth: require valid JWT ──────────────────────────────────────────────
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

    // Resolve tenant from JWT user
    const { data: tenantUser } = await sb
      .from("tenant_users")
      .select("tenant_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    const tenantId = tenantUser?.tenant_id || null;

    // ── Input validation ─────────────────────────────────────────────────────
    const body = await req.json();
    const { agent_id, messages } = body;

    if (!agent_id || !messages) {
      return new Response(JSON.stringify({ error: "agent_id and messages required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages must be a non-empty array" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Truncate messages and content to prevent cost abuse / prompt injection
    const safeMessages = messages
      .slice(-MAX_MESSAGES)
      .map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content ?? "").substring(0, MAX_MESSAGE_CHARS),
      }));

    // ── Load agent — scoped to caller's tenant ───────────────────────────────
    let agentQuery = sb.from("ai_agents").select("*").eq("id", agent_id);
    if (tenantId) agentQuery = agentQuery.eq("tenant_id", tenantId);
    const { data: agent, error: agentErr } = await agentQuery.maybeSingle();
    if (agentErr || !agent) {
      return new Response(JSON.stringify({ error: "Agent not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Knowledge base context — limited and scoped ──────────────────────────
    let kbContext = "";
    const { data: kbLinks } = await sb
      .from("ai_agent_knowledge_bases")
      .select("knowledge_base_id")
      .eq("agent_id", agent_id);

    if (kbLinks && kbLinks.length > 0) {
      const kbIds = kbLinks.map((l: any) => l.knowledge_base_id);
      const { data: items } = await sb
        .from("ai_kb_items")
        .select("type, content")
        .in("knowledge_base_id", kbIds)
        .eq("status", "trained")
        .limit(MAX_KB_ITEMS);

      if (items && items.length > 0) {
        const faqEntries = items
          .filter((i: any) => i.type === "faq")
          .map((i: any) => `P: ${i.content.question}\nR: ${i.content.answer}`);
        const textEntries = items
          .filter((i: any) => i.type === "text")
          .map((i: any) => String(i.content.text ?? "").substring(0, 3000));
        const urlEntries = items
          .filter((i: any) => i.type === "url" && i.content.crawled_content)
          .map((i: any) => String(i.content.crawled_content).substring(0, 3000));
        const tableEntries = items
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

    // ── Resolve LLM ──────────────────────────────────────────────────────────
    const selection = await getActiveLLM(sb, {
      agentLlmOverride: agent.llm_override,
      agentModel: agent.model,
      tenantId,
    });

    const systemPrompt = (agent.system_prompt || "Você é um assistente útil.") + kbContext;
    const allMessages = [{ role: "system", content: systemPrompt }, ...safeMessages];

    // Estimate input tokens for logging (4 chars ≈ 1 token)
    const inputChars = allMessages.reduce((sum: number, m: any) => sum + (m.content?.length || 0), 0);
    const estimatedInputTokens = Math.ceil(inputChars / 4);

    let response = await callLLM(selection, allMessages, agent.temperature ?? 0.7, true);

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

    // Fire-and-forget token logging
    // Output tokens are estimated since streaming doesn't return usage stats
    logTokenUsage(sb, {
      agent_id,
      agent_name: agent.name || "",
      function_name: "ai-agent-chat",
      selection,
      input_tokens: estimatedInputTokens,
      output_tokens: 0, // updated to 0 — streaming makes real count unavailable here
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

// Separated so fallback reuse is clean and Anthropic format differences are handled centrally
async function callLLM(
  selection: { apiUrl: string; apiKey: string; model: string; provider: string },
  messages: any[],
  temperature: number,
  stream: boolean,
): Promise<Response> {
  // Anthropic uses a different auth header and message format
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

  // OpenAI-compatible (OpenAI, xAI, Lovable)
  return fetch(selection.apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${selection.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: selection.model,
      messages,
      temperature,
      stream,
    }),
  });
}
