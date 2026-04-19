import { NodeHandler, firstEdgeTarget, interpolate } from "../types.ts";

function evalCondition(left: any, op: string, right: any): boolean {
  const a = String(left ?? "").toLowerCase().trim();
  const b = String(right ?? "").toLowerCase().trim();
  switch (op) {
    case "equals": case "=": case "==": return a === b;
    case "not_equals": case "!=": return a !== b;
    case "contains": return a.includes(b);
    case "not_contains": return !a.includes(b);
    case "starts_with": return a.startsWith(b);
    case "ends_with": return a.endsWith(b);
    case "is_empty": return a.length === 0;
    case "is_not_empty": return a.length > 0;
    case "gt": return Number(a) > Number(b);
    case "lt": return Number(a) < Number(b);
    default: return false;
  }
}

export const handler: NodeHandler = {
  type: "condition",
  async execute(ctx, node) {
    const { session, flow } = ctx;
    const data = node.data || {};
    const variable = data.variable ?? "last_input";
    const op = data.operator ?? "contains";
    const value = interpolate(String(data.value ?? ""), session.variables);
    const left = session.variables?.[variable] ?? "";
    const matched = evalCondition(left, op, value);
    const handle = matched ? "yes" : "no";
    const next = firstEdgeTarget(flow, node.id, handle) ?? firstEdgeTarget(flow, node.id);
    if (!next) return { kind: "complete" };
    return { kind: "next", nextNodeId: next };
  },
};
