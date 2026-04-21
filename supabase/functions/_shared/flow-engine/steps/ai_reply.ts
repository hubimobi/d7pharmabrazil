import { NodeHandler, firstEdgeTarget, interpolate } from "../types.ts";
import { getActiveLLM, logTokenUsage } from "../../llm.ts";
import { saveMessage, getHistory } from "../../ai-memory.ts";

export const handler: NodeHandler = {
  type: "ai_reply",
  async execute(ctx, node) {
    const { supabase, session, flow } = ctx;
    const data = node.data || {};
    
    // Resolve o Agente a ser usado:
    // 1. node.data.agent_id (preferencial)
    // 2. node.data.agent_slug (fallback por nome amigável)
    // 3. nada -> usa o prompt inline do nó
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
    
    // 1. Sincroniza a entrada do usuário com o histórico central
    if (lastInput) {
      await saveMessage(supabase, {
        tenant_id: session.tenant_id,
        agent_id: agent?.id || '00000000-0000-0000-0000-000000000000',
        session_id: sessionId,
        role: 'user',
        content: String(lastInput)
      });
    }

    // 2. Busca histórico recente (Memória)
    const history = await getHistory(supabase, { session_id: sessionId, limit: 15 });

    let systemPrompt = interpolate(
      String(data.prompt ?? (agent?.system_prompt || "Responda de forma curta.")),
      session.variables,
    );
    
    // Adiciona instrução de handoff ao system prompt se não houver
    if (!systemPrompt.includes("TRANSFER_HUMAN")) {
      systemPrompt += "\n\nSe o usuário solicitar algo que você não pode fazer ou quiser falar com um atendente humano, responda *exatamente* com a tag [[TRANSFER_HUMAN]] seguida de uma mensagem curta de transbordo.";
    }

    // Carrega Base de Conhecimento se houver agente
    if (agent) {
      const { data: kbLinks } = await supabase
        .from("ai_agent_knowledge_bases")
        .select("knowledge_base_id")
        .eq("agent_id", agent.id);
        
      if (kbLinks && kbLinks.length > 0) {
        const kbIds = kbLinks.map((l: any) => l.knowledge_base_id);
        const { data: items } = await supabase
          .from("ai_kb_items")
          .select("*")
          .in("knowledge_base_id", kbIds)
          .eq("status", "trained")
          .limit(10); // Limite de segurança para contexto
          
        if (items && items.length > 0) {
          const contextParts = items.map((i: any) => {
            if (i.type === "faq") return `P: ${i.content.question}\nR: ${i.content.answer}`;
            if (i.type === "text") return i.content.text;
            if (i.type === "url") return i.content.crawled_content;
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
      });

      const res = await fetch(selection.apiUrl, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${selection.apiKey}`, 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({
          model: selection.model,
          messages: [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: String(lastInput) },
          ],
          temperature: agent?.temperature ?? 0.7,
        }),
      });

      if (res.ok) {
        const j = await res.json();
        reply = j.choices?.[0]?.message?.content ?? "";
        
        // 3. Salva a resposta da IA no histórico central
        if (reply) {
          await saveMessage(supabase, {
            tenant_id: session.tenant_id,
            agent_id: agent?.id || '00000000-0000-0000-0000-000000000000',
            session_id: sessionId,
            role: 'assistant',
            content: reply
          });
        }

        // Log de uso de tokens
        await logTokenUsage(supabase, {
          agent_id: agent?.id,
          agent_name: agent?.name || "Flow IA Step",
          function_name: "whatsapp-flow-engine",
          selection,
          input_tokens: Math.ceil(systemPrompt.length / 4), // Estimativa simples
          output_tokens: Math.ceil(reply.length / 4),
        });
      }
    } catch (e) {
      console.error("AI step error:", e);
    }

    // 4. Detecção de Transbordo Humano (Handoff)
    if (reply.includes("[[TRANSFER_HUMAN]]")) {
      const cleanReply = reply.replace("[[TRANSFER_HUMAN]]", "").trim();
      
      // Envia a última mensagem de "passando para humano" se existir
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

      // Desativa AI e passa para Humano
      await supabase
        .from("whatsapp_conversations")
        .update({
          ai_agent_active: false,
          status: "human",
        })
        .eq("instance_id", session.instance_id)
        .eq("contact_phone", session.contact_phone);

      return { kind: "abort" }; // encerra o fluxo aqui para o atendente assumir
    }

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

    const next = firstEdgeTarget(flow, node.id);
    if (!next) return { kind: "complete" };
    return { kind: "next", nextNodeId: next };
  },
};
