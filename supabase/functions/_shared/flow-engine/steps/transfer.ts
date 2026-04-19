import { NodeHandler, firstEdgeTarget } from "../types.ts";

export const handler: NodeHandler = {
  type: "transfer",
  async execute(ctx, node) {
    const { supabase, session, flow } = ctx;
    const data = node.data || {};
    // marca conversa como "humano" se existir
    try {
      await supabase
        .from("whatsapp_conversations")
        .update({
          ai_agent_active: false,
          assigned_to: data.assigned_to ?? null,
          status: "human",
        })
        .eq("instance_id", session.instance_id)
        .eq("contact_phone", session.contact_phone);
    } catch (_e) { /* tabela pode não ter essas colunas — ignorar */ }

    const next = firstEdgeTarget(flow, node.id);
    if (!next) return { kind: "complete" };
    return { kind: "next", nextNodeId: next };
  },
};
