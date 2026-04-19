import { NodeHandler } from "../types.ts";

export const handler: NodeHandler = {
  type: "start_flow",
  async execute(ctx, node) {
    const { supabase, session } = ctx;
    const data = node.data || {};
    const flowId = data.flow_id ?? data.target_flow_id;
    if (!flowId) return { kind: "complete" };
    const { data: target } = await supabase
      .from("whatsapp_flows")
      .select("id, nodes")
      .eq("id", flowId)
      .maybeSingle();
    if (!target) return { kind: "complete" };
    const firstNode = (target.nodes as any[])?.[0]?.id;
    if (!firstNode) return { kind: "complete" };
    return { kind: "jump", flowId, nodeId: firstNode };
  },
};
