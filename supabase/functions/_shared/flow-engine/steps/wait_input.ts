import { NodeHandler, firstEdgeTarget } from "../types.ts";

export const handler: NodeHandler = {
  type: "wait_input",
  async execute(ctx, node) {
    const { session, flow } = ctx;
    const data = node.data || {};
    const waitingFor = (data.waiting_for as "text" | "choice" | "media") ?? "text";
    const expiresInMinutes = Number(data.expires_in_minutes ?? 60);

    // If session expired, route to timeout_node_id if configured
    if (session.expires_at && new Date(session.expires_at) < new Date()) {
      const timeoutNode = data.timeout_node_id as string | undefined;
      if (timeoutNode) return { kind: "next", nextNodeId: timeoutNode };
      return { kind: "complete" };
    }

    const next = firstEdgeTarget(flow, node.id);
    return { kind: "wait", waitingFor, nextNodeId: next, expiresInMinutes };
  },
};
