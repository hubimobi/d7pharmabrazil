import { NodeHandler, firstEdgeTarget, interpolate } from "../types.ts";

export const handler: NodeHandler = {
  type: "ai_reply",
  async execute(ctx, node) {
    const { supabase, session, flow } = ctx;
    const data = node.data || {};
    const prompt = interpolate(
      String(data.prompt ?? "Responda em uma frase curta ao usuário."),
      session.variables,
    );
    const lastInput = session.variables?.last_input ?? "";
    let reply = "";
    try {
      const apiKey = Deno.env.get("LOVABLE_API_KEY");
      if (apiKey) {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: data.model ?? "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: prompt },
              { role: "user", content: String(lastInput) },
            ],
          }),
        });
        if (res.ok) {
          const j = await res.json();
          reply = j.choices?.[0]?.message?.content ?? "";
        }
      }
    } catch (_e) { /* fallback abaixo */ }

    if (!reply) reply = String(data.fallback ?? "Recebi sua mensagem. 😊");

    await supabase.from("whatsapp_message_queue").insert({
      contact_phone: session.contact_phone,
      contact_name: session.contact_name || "",
      instance_id: session.instance_id,
      flow_id: session.flow_id,
      message_content: reply,
      variables: session.variables,
      status: "pending",
      scheduled_at: new Date().toISOString(),
      priority: 5,
      tenant_id: session.tenant_id,
      idempotency_key: `flow:${session.id}:${node.id}:${Date.now()}`,
    });

    const next = firstEdgeTarget(flow, node.id);
    if (!next) return { kind: "complete" };
    return { kind: "next", nextNodeId: next };
  },
};
