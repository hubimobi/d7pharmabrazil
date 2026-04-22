import { NodeHandler, firstEdgeTarget } from "../types.ts";

// Round-robin A/B split. Uses whatsapp_flow_split_state to persist last_index.
export const handler: NodeHandler = {
  type: "split",
  async execute(ctx, node) {
    const { supabase, session, flow } = ctx;
    const data = node.data || {};
    const splitCount = Math.max(2, Number(data.split_count ?? 2));

    // Fetch current state
    const { data: stateRow } = await supabase
      .from("whatsapp_flow_split_state")
      .select("id, last_index")
      .eq("flow_id", session.flow_id)
      .eq("node_id", node.id)
      .eq("tenant_id", session.tenant_id)
      .maybeSingle();

    const prevIndex: number = stateRow?.last_index ?? -1;
    const nextIndex = (prevIndex + 1) % splitCount;

    if (stateRow?.id) {
      await supabase
        .from("whatsapp_flow_split_state")
        .update({ last_index: nextIndex })
        .eq("id", stateRow.id);
    } else {
      await supabase
        .from("whatsapp_flow_split_state")
        .insert({ flow_id: session.flow_id, node_id: node.id, tenant_id: session.tenant_id, last_index: nextIndex });
    }

    // Route to handle matching the index string ("0", "1", ...)
    const handle = String(nextIndex);
    const next = firstEdgeTarget(flow, node.id, handle) ?? firstEdgeTarget(flow, node.id);
    if (!next) return { kind: "complete" };
    return { kind: "next", nextNodeId: next };
  },
};
