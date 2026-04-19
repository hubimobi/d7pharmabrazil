import { NodeHandler, firstEdgeTarget, interpolate } from "../types.ts";

export const handler: NodeHandler = {
  type: "message",
  async execute(ctx, node) {
    const { supabase, session, flow } = ctx;
    const data = node.data || {};
    const raw = data.content ?? data.message ?? data.text ?? "";
    const content = interpolate(raw, session.variables);
    const delayMin = Number(data.delay_minutes ?? 0);
    const scheduledAt = new Date(Date.now() + delayMin * 60_000).toISOString();
    const idemKey = `flow:${session.id}:${node.id}:${Date.now()}`;

    if (content && content.trim().length > 0) {
      await supabase.from("whatsapp_message_queue").insert({
        contact_phone: session.contact_phone,
        contact_name: session.contact_name || "",
        instance_id: session.instance_id,
        flow_id: session.flow_id,
        message_content: content,
        variables: session.variables,
        status: "pending",
        scheduled_at: scheduledAt,
        priority: 5,
        tenant_id: session.tenant_id,
        idempotency_key: idemKey,
      });
    }

    const next = firstEdgeTarget(flow, node.id);
    if (!next) return { kind: "complete" };
    return { kind: "next", nextNodeId: next };
  },
};
