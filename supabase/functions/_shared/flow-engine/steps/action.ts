import { NodeHandler, firstEdgeTarget, interpolate } from "../types.ts";

export const handler: NodeHandler = {
  type: "action",
  async execute(ctx, node) {
    const { supabase, session, flow } = ctx;
    const data = node.data || {};
    const actionType: string = data.action_type ?? "";

    try {
      switch (actionType) {
        case "add_tag": {
          const tag = interpolate(String(data.tag ?? ""), session.variables).trim();
          if (tag && session.contact_phone) {
            // Upsert contact then add tag
            const { data: contact } = await supabase
              .from("whatsapp_contacts")
              .select("id")
              .eq("phone", session.contact_phone)
              .eq("tenant_id", session.tenant_id)
              .maybeSingle();
            if (contact?.id) {
              await supabase
                .from("customer_tags")
                .upsert({ contact_id: contact.id, tag, tenant_id: session.tenant_id }, { onConflict: "contact_id,tag" });
            }
          }
          break;
        }
        case "remove_tag": {
          const tag = interpolate(String(data.tag ?? ""), session.variables).trim();
          if (tag && session.contact_phone) {
            const { data: contact } = await supabase
              .from("whatsapp_contacts")
              .select("id")
              .eq("phone", session.contact_phone)
              .eq("tenant_id", session.tenant_id)
              .maybeSingle();
            if (contact?.id) {
              await supabase
                .from("customer_tags")
                .delete()
                .eq("contact_id", contact.id)
                .eq("tag", tag)
                .eq("tenant_id", session.tenant_id);
            }
          }
          break;
        }
        case "go_to_flow": {
          const flowId = data.flow_id as string | undefined;
          if (flowId) {
            const startNode = await supabase
              .from("whatsapp_flows")
              .select("nodes")
              .eq("id", flowId)
              .maybeSingle();
            const firstNodeId = (startNode?.data?.nodes as any[])?.[0]?.id;
            if (firstNodeId) {
              return { kind: "jump", flowId, nodeId: firstNodeId };
            }
          }
          break;
        }
        case "mark_converted": {
          if (session.contact_phone) {
            await supabase
              .from("whatsapp_contacts")
              .update({ converted: true, converted_at: new Date().toISOString() })
              .eq("phone", session.contact_phone)
              .eq("tenant_id", session.tenant_id);
          }
          break;
        }
      }
    } catch (e) {
      console.error("[action] error", actionType, e);
    }

    const next = firstEdgeTarget(flow, node.id);
    if (!next) return { kind: "complete" };
    return { kind: "next", nextNodeId: next };
  },
};
