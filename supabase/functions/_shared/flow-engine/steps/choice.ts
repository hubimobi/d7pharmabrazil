import { NodeHandler, firstEdgeTarget, interpolate } from "../types.ts";

export const handler: NodeHandler = {
  type: "choice",
  async execute(ctx, node) {
    const { supabase, session, flow } = ctx;
    const data = node.data || {};
    const lastInput: string = String(session.variables?.last_input ?? "").trim();
    const options: Array<{ label: string; tag?: string }> = data.options ?? [];

    // If we already have a user reply, route it
    if (lastInput) {
      // Try numeric index ("1", "2", ...)
      const numericIdx = parseInt(lastInput, 10);
      if (!isNaN(numericIdx) && numericIdx >= 1 && numericIdx <= options.length) {
        const handle = String(numericIdx - 1);
        const next = firstEdgeTarget(flow, node.id, handle) ?? firstEdgeTarget(flow, node.id);
        if (!next) return { kind: "complete" };
        return { kind: "next", nextNodeId: next };
      }

      // Try label match (case-insensitive)
      const lower = lastInput.toLowerCase();
      const labelIdx = options.findIndex((o) => o.label.toLowerCase() === lower);
      if (labelIdx >= 0) {
        const handle = String(labelIdx);
        const next = firstEdgeTarget(flow, node.id, handle) ?? firstEdgeTarget(flow, node.id);
        if (!next) return { kind: "complete" };
        return { kind: "next", nextNodeId: next };
      }

      // No match — fall through to re-send the question (or complete if no edge)
    }

    // Build and send the options message
    const question = interpolate(String(data.question ?? "Escolha uma opção:"), session.variables);
    const numbered = options.map((o, i) => `${i + 1}. ${o.label}`).join("\n");
    const messageText = `${question}\n\n${numbered}`;

    await supabase.from("whatsapp_message_queue").insert({
      contact_phone: session.contact_phone,
      contact_name: session.contact_name || "",
      instance_id: session.instance_id,
      flow_id: session.flow_id,
      message_content: messageText,
      variables: session.variables,
      status: "pending",
      scheduled_at: new Date().toISOString(),
      priority: 5,
      tenant_id: session.tenant_id,
      idempotency_key: `choice:${session.id}:${node.id}`,
    });

    // Wait for user to reply; route will be determined on next tick
    return { kind: "wait", waitingFor: "choice", nextNodeId: node.id, expiresInMinutes: Number(data.expires_in_minutes ?? 60) };
  },
};
