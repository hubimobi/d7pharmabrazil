import { NodeHandler, firstEdgeTarget } from "../types.ts";

export const handler: NodeHandler = {
  type: "wait_input",
  async execute(ctx, node) {
    const { flow } = ctx;
    const data = node.data || {};
    const waitingFor = (data.waiting_for as "text" | "choice" | "media") ?? "text";
    const expiresInMinutes = Number(data.expires_in_minutes ?? 60);
    const next = firstEdgeTarget(flow, node.id);
    return { kind: "wait", waitingFor, nextNodeId: next, expiresInMinutes };
  },
};
