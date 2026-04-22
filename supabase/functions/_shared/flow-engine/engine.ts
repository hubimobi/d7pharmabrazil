import { FlowContext, FlowDefinition, FlowSession, NodeHandler, findNode } from "./types.ts";
import { handler as messageHandler } from "./steps/message.ts";
import { handler as conditionHandler } from "./steps/condition.ts";
import { handler as waitHandler } from "./steps/wait_input.ts";
import { handler as transferHandler } from "./steps/transfer.ts";
import { handler as setVarHandler } from "./steps/set_variable.ts";
import { handler as startFlowHandler } from "./steps/start_flow.ts";
import { handler as aiReplyHandler } from "./steps/ai_reply.ts";
import { handler as endHandler } from "./steps/end.ts";

const HANDLERS: Record<string, NodeHandler> = {
  message: messageHandler,
  message_custom: messageHandler,
  message_template: messageHandler,
  condition: conditionHandler,
  wait_input: waitHandler,
  wait: waitHandler,
  transfer: transferHandler,
  set_variable: setVarHandler,
  start_flow: startFlowHandler,
  ai_reply: aiReplyHandler,
  end: endHandler,
};

const MAX_STEPS_PER_TICK = 10; // segurança anti-loop

export async function loadFlow(supabase: any, flowId: string): Promise<FlowDefinition | null> {
  const { data } = await supabase
    .from("whatsapp_flows")
    .select("id, nodes, edges, trigger_event, trigger_value")
    .eq("id", flowId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    nodes: (data.nodes as any[]) || [],
    edges: (data.edges as any[]) || [],
    trigger_event: data.trigger_event,
    trigger_value: data.trigger_value,
  };
}

async function persistSession(supabase: any, session: FlowSession, patch: Partial<FlowSession>) {
  Object.assign(session, patch);
  await supabase
    .from("whatsapp_flow_sessions")
    .update({
      current_node_id: session.current_node_id,
      variables: session.variables,
      status: session.status,
      waiting_for: session.waiting_for,
      expires_at: session.expires_at,
      flow_id: session.flow_id,
      last_event_at: new Date().toISOString(),
    })
    .eq("id", session.id);
}

export async function runSession(supabase: any, session: FlowSession): Promise<void> {
  if (!session.flow_id) {
    await persistSession(supabase, session, { status: "error" });
    return;
  }
  let flow = await loadFlow(supabase, session.flow_id);
  if (!flow) {
    await persistSession(supabase, session, { status: "error" });
    return;
  }

  let currentId = session.current_node_id || flow.nodes[0]?.id;
  if (!currentId) {
    await persistSession(supabase, session, { status: "completed" });
    return;
  }

  // Track visited nodes to detect infinite loops (A→B→A cycles)
  const visitedInTick = new Set<string>();

  for (let step = 0; step < MAX_STEPS_PER_TICK; step++) {
    if (visitedInTick.has(currentId)) {
      console.error(`[engine] Cycle detected at node ${currentId} in flow ${session.flow_id}`);
      await persistSession(supabase, session, { status: "error", current_node_id: currentId });
      return;
    }
    visitedInTick.add(currentId);
    const node = findNode(flow, currentId);
    if (!node) {
      await persistSession(supabase, session, { status: "error", current_node_id: currentId });
      return;
    }
    const handler = HANDLERS[node.type] ?? HANDLERS["message"];
    const ctx: FlowContext = { supabase, session, flow };
    let action;
    try {
      action = await handler.execute(ctx, node);
    } catch (e) {
      console.error("Step error:", node.type, e);
      await persistSession(supabase, session, { status: "error", current_node_id: currentId });
      return;
    }

    if (action.kind === "next") {
      currentId = action.nextNodeId;
      session.current_node_id = currentId;
      continue;
    }
    if (action.kind === "wait") {
      const expires = action.expiresInMinutes
        ? new Date(Date.now() + action.expiresInMinutes * 60_000).toISOString()
        : null;
      await persistSession(supabase, session, {
        status: "waiting_input",
        waiting_for: action.waitingFor,
        current_node_id: action.nextNodeId ?? currentId,
        expires_at: expires,
      });
      return;
    }
    if (action.kind === "complete") {
      await persistSession(supabase, session, { status: "completed", current_node_id: currentId });
      return;
    }
    if (action.kind === "abort") {
      await persistSession(supabase, session, { status: "aborted", current_node_id: currentId });
      return;
    }
    if (action.kind === "jump") {
      if (action.flowId && action.flowId !== session.flow_id) {
        const newFlow = await loadFlow(supabase, action.flowId);
        if (!newFlow) {
          await persistSession(supabase, session, { status: "error" });
          return;
        }
        flow = newFlow;
        session.flow_id = action.flowId;
      }
      currentId = action.nodeId;
      session.current_node_id = currentId;
      continue;
    }
  }

  // se atingiu max steps, persiste e deixa o próximo tick continuar
  await persistSession(supabase, session, { current_node_id: currentId });
}
