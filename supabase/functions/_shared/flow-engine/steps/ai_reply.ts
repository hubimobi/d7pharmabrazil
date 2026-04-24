import { NodeHandler, firstEdgeTarget, interpolate } from "../types.ts";
import { getActiveLLM, logTokenUsage } from "../../llm.ts";
import { saveMessage, getHistory } from "../../ai-memory.ts";

export const handler: NodeHandler = {
  type: "ai_reply",
  async execute(ctx, node) {
    const { supabase, session, flow } = ctx;
    const data = node.data || {};

    // Resolve agent:
    // 1. node.data.agent_id (preferred)
    // 2. node.data.agent_slug (fallback by friendly name)
    // 3. nothing -> use inline prompt from node
    let agent: any = null;
    const agentId = data.agent_id;

    if (agentId) {
      const { data: a } = await supabase
        .from("ai_agents")
        .select("*")
        .eq("id", agentId)
        .maybeSingle();
      agent = a;
    }

    const lastInput = session.variables?.last_input ?? "";
    const sessionId = `wa:${session.contact_phone}`;

    // FIX: fetch history BEFORE saving the new user message so it isn't duplicated.
    // Previous code saved first then fetched, causing lastInput to appear twice in context.
    // FIX: pass agent_id so agents don't share each other's history for the same phone number.
    const history = await getHistory(supabase, {
      session_id: sessionId,
      agent_id: agent?.id,
      limit: 15,
    });

    // Now save the user input AFTER fetching history
    if (lastInput) {
      await saveMessage(supabase, {
        tenant_id: session.tenant_id,
        agent_id: agent?.id || "00000000-0000-0000-0000-000000000000",
        session_id: sessionId,
        role: "user",
        content: String(lastInput),
      });
    }

    let systemPrompt = interpolate(
      String(data.prompt ?? (agent?.system_prompt || "Responda de forma curta.")),
      session.variables,
    );

    if (!systemPrompt.includes("TRANSFER_HUMAN")) {
      systemPrompt += "\n\nSe o usuário solicitar algo que você não pode fazer ou quiser falar com um atendente humano, responda *exatamente* com a tag [[TRANSFER_HUMAN]] seguida de uma mensagem curta de transbordo.";
    }

    // Load knowledge base if agent is configured
    if (agent) {
      const { data: kbLinks } = await supabase
        .from("ai_agent_knowledge_bases")
        .select("knowledge_base_id")
        .eq("agent_id", agent.id);

      if (kbLinks && kbLinks.length > 0) {
        const kbIds = kbLinks.map((l: any) => l.knowledge_base_id);
        const { data: items } = await supabase
          .from("ai_kb_items")
          .select("type, content")
          .in("knowledge_base_id", kbIds)
          .eq("status", "trained")
          .limit(40);

        if (items && items.length > 0) {
          // Score by keyword relevance against last user input
          const queryWords = String(lastInput).toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
          const ranked = (items as any[])
            .map((item) => {
              const text = [item.content?.question, item.content?.answer, item.content?.text, item.content?.crawled_content]
                .filter(Boolean).join(" ").toLowerCase();
              const score = queryWords.reduce((s: number, w: string) => s + (text.includes(w) ? 1 : 0), 0);
              return { item, score };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 8)
            .map(({ item }) => item);

          const contextParts = ranked.map((i: any) => {
            if (i.type === "faq") return `P: ${i.content.question}\nR: ${i.content.answer}`;
            if (i.type === "text") return String(i.content.text ?? "").substring(0, 2000);
            if (i.type === "url") return String(i.content.crawled_content ?? "").substring(0, 2000);
            return "";
          }).filter(Boolean);

          if (contextParts.length > 0) {
            systemPrompt += "\n\n# CONTEXTO DE CONHECIMENTO:\n" + contextParts.join("\n---\n");
          }
        }
      }
    }

    let reply = "";
    try {
      const selection = await getActiveLLM(supabase, {
        agentLlmOverride: agent?.llm_override,
        agentModel: agent?.model || data.model,
        tenantId: session.tenant_id,
      });

      // FIX: use callLLM helper that handles Anthropic's different auth/format
      const res = await callLLM(selection, [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: String(lastInput) },
      ], agent?.temperature ?? 0.7);

      if (res.ok) {
        const j = await res.json();
        // Handle both OpenAI format and Anthropic format
        reply = j.choices?.[0]?.message?.content ?? j.content?.[0]?.text ?? "";

        if (reply) {
          await saveMessage(supabase, {
            tenant_id: session.tenant_id,
            agent_id: agent?.id || "00000000-0000-0000-0000-000000000000",
            session_id: sessionId,
            role: "assistant",
            content: reply,
          });
        }

        // FIX: use actual token counts from API response when available
        const usage = j.usage || {};
        await logTokenUsage(supabase, {
          agent_id: agent?.id,
          agent_name: agent?.name || "Flow IA Step",
          function_name: "whatsapp-flow-engine",
          selection,
          input_tokens: usage.input_tokens ?? usage.prompt_tokens ?? Math.ceil(systemPrompt.length / 4),
          output_tokens: usage.output_tokens ?? usage.completion_tokens ?? Math.ceil(reply.length / 4),
          tenant_id: session.tenant_id,
        });
      } else {
        const errText = await res.text();
        console.error("AI step LLM error:", res.status, errText.substring(0, 200));
      }
    } catch (e) {
      console.error("AI step error:", e);
    }

    // Human handoff detection
    if (reply.includes("[[TRANSFER_HUMAN]]")) {
      const cleanReply = reply.replace("[[TRANSFER_HUMAN]]", "").trim();

      if (cleanReply) {
        await supabase.from("whatsapp_message_queue").insert({
          contact_phone: session.contact_phone,
          contact_name: session.contact_name || "",
          instance_id: session.instance_id,
          message_content: cleanReply,
          status: "pending",
          scheduled_at: new Date().toISOString(),
          tenant_id: session.tenant_id,
        });
      }

      await supabase
        .from("whatsapp_conversations")
        .update({ ai_agent_active: false, status: "human" })
        .eq("instance_id", session.instance_id)
        .eq("contact_phone", session.contact_phone);

      return { kind: "abort" };
    }

    // FIX: only enqueue if reply is non-empty to avoid sending blank WhatsApp messages
    if (reply.trim()) {
      await supabase.from("whatsapp_message_queue").insert({
        contact_phone: session.contact_phone,
        contact_name: session.contact_name || "",
        instance_id: session.instance_id,
        flow_id: session.flow_id,
        message_content: reply,
        variables: session.variables,
        status: "pending",
        scheduled_at: new Date().toISOString(),
        priority: 5,
        tenant_id: session.tenant_id,
        idempotency_key: `flow:${session.id}:${node.id}:${Date.now()}`,
      });
    }

    const next = firstEdgeTarget(flow, node.id);
    if (!next) return { kind: "complete" };
    return { kind: "next", nextNodeId: next };
  },
};

// FIX: Anthropic requires x-api-key header and a different body format.
// OpenAI-compatible providers (xAI, Lovable) use Authorization: Bearer.
function callLLM(
  selection: { apiUrl: string; apiKey: string; model: string; provider: string },
  messages: any[],
  temperature: number,
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
        max_tokens: 1024,
      }),
    });
  }

  return fetch(selection.apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${selection.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: selection.model, messages, temperature }),
  });
}
