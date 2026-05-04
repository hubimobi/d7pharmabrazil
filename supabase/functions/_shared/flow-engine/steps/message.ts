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
      // FIX: resolve instance_id if null so process-queue can route to correct WhatsApp
      let instanceId = session.instance_id;
      if (!instanceId && session.tenant_id) {
        try {
          const { data: instId } = await supabase.rpc("resolve_flow_session_instance", {
            _session_id: session.id,
          });
          if (instId) instanceId = instId;
        } catch (_) { /* non-critical */ }
      }

      await supabase.from("whatsapp_message_queue").insert({
        contact_phone: session.contact_phone,
        contact_name: session.contact_name || "",
        instance_id: instanceId,
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

