import { NodeHandler, firstEdgeTarget, interpolate } from "../types.ts";

// Evaluates a variable against a condition and routes to "true" or "false" handle.
function evalBranch(left: any, op: string, right: string): boolean {
  const a = String(left ?? "").trim();
  const b = right.trim();
  switch (op) {
    case "exists":     return a.length > 0;
    case "not_exists": return a.length === 0;
    case "equals":     return a.toLowerCase() === b.toLowerCase();
    case "not_equals": return a.toLowerCase() !== b.toLowerCase();
    case "contains":   return a.toLowerCase().includes(b.toLowerCase());
    case "not_contains": return !a.toLowerCase().includes(b.toLowerCase());
    case "starts_with": return a.toLowerCase().startsWith(b.toLowerCase());
    case "is_true":    return ["true", "1", "yes", "sim"].includes(a.toLowerCase());
    case "gt": {
      // supports both BR (1.234,56) and US (1,234.56) number formats
      const toNum = (s: string) => parseFloat(s.replace(/\./g, "").replace(",", "."));
      return toNum(a) > toNum(b);
    }
    case "lt": {
      const toNum = (s: string) => parseFloat(s.replace(/\./g, "").replace(",", "."));
      return toNum(a) < toNum(b);
    }
    default: return false;
  }
}

export const handler: NodeHandler = {
  type: "branch",
  async execute(ctx, node) {
    const { session, flow } = ctx;
    const data = node.data || {};
    const varName = data.variable_name ?? "last_input";
    const op = data.operator ?? "exists";
    const compareValue = interpolate(String(data.compare_value ?? ""), session.variables);
    const left = session.variables?.[varName] ?? "";
    const matched = evalBranch(left, op, compareValue);
    const handle = matched ? "true" : "false";
    const next = firstEdgeTarget(flow, node.id, handle) ?? firstEdgeTarget(flow, node.id);
    if (!next) return { kind: "complete" };
    return { kind: "next", nextNodeId: next };
  },
};
