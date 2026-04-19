import { NodeHandler, firstEdgeTarget, interpolate } from "../types.ts";

export const handler: NodeHandler = {
  type: "set_variable",
  async execute(ctx, node) {
    const { session, flow } = ctx;
    const data = node.data || {};
    const key = String(data.key ?? data.variable ?? "");
    const value = interpolate(String(data.value ?? ""), session.variables);
    if (key) session.variables[key] = value;
    const next = firstEdgeTarget(flow, node.id);
    if (!next) return { kind: "complete" };
    return { kind: "next", nextNodeId: next };
  },
};
