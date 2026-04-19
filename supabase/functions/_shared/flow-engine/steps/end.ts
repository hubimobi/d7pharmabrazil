import { NodeHandler } from "../types.ts";

export const handler: NodeHandler = {
  type: "end",
  async execute(_ctx, _node) {
    return { kind: "complete" };
  },
};
