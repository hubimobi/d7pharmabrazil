// Flow Engine — tipos compartilhados
export type FlowNode = {
  id: string;
  type: string; // 'message' | 'condition' | 'wait_input' | 'transfer' | 'set_variable' | 'start_flow' | 'ai_reply' | 'end' | ...
  data?: Record<string, any>;
  [key: string]: any;
};

export type FlowEdge = {
  id?: string;
  source: string;
  target: string;
  sourceHandle?: string | null; // usado por condition/wait_input ('yes' | 'no' | option key)
  data?: Record<string, any>;
};

export type FlowDefinition = {
  id: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  trigger_event?: string;
  trigger_value?: string;
};

export type FlowSession = {
  id: string;
  tenant_id: string;
  instance_id: string | null;
  contact_phone: string;
  contact_name: string | null;
  flow_id: string | null;
  funnel_id: string | null;
  current_node_id: string | null;
  variables: Record<string, any>;
  status: string;
  waiting_for: string | null;
  last_user_input: string | null;
  expires_at: string | null;
};

export type FlowContext = {
  supabase: any;
  session: FlowSession;
  flow: FlowDefinition;
};

export type NextAction =
  | { kind: "next"; nextNodeId: string }
  | { kind: "wait"; waitingFor: "text" | "choice" | "media"; nextNodeId?: string; expiresInMinutes?: number }
  | { kind: "complete" }
  | { kind: "abort"; reason?: string }
  | { kind: "jump"; flowId?: string; nodeId: string };

export type NodeHandler = {
  type: string;
  execute: (ctx: FlowContext, node: FlowNode) => Promise<NextAction>;
};

// Helpers
export function findNode(flow: FlowDefinition, nodeId: string): FlowNode | undefined {
  return flow.nodes.find((n) => n.id === nodeId);
}

export function findEdgesFrom(flow: FlowDefinition, nodeId: string, handle?: string | null): FlowEdge[] {
  return flow.edges.filter((e) => {
    if (e.source !== nodeId) return false;
    if (handle === undefined) return true;
    return (e.sourceHandle ?? null) === (handle ?? null);
  });
}

export function firstEdgeTarget(flow: FlowDefinition, nodeId: string, handle?: string | null): string | undefined {
  const edges = findEdgesFrom(flow, nodeId, handle);
  return edges[0]?.target;
}

export function interpolate(text: string, vars: Record<string, any>): string {
  if (!text) return "";
  let out = String(text);
  for (const [k, v] of Object.entries(vars || {})) {
    out = out.replaceAll(`{${k}}`, String(v ?? ""));
  }
  return out;
}
