// shared/ai-memory.ts
// Centraliza a sincronização de mensagens entre canais (WhatsApp/Web) e a tabela ai_chat_messages

export async function saveMessage(supabase: any, params: {
  tenant_id: string | null;
  agent_id: string;
  session_id: string; // ex: wa:+5511999999999
  role: "user" | "assistant";
  content: string;
  user_id?: string;
}) {
  const { tenant_id, agent_id, session_id, role, content, user_id } = params;

  let finalUserId = user_id;
  if (!finalUserId) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("owner_id")
      .eq("id", tenant_id)
      .maybeSingle();
    finalUserId = tenant?.owner_id || "00000000-0000-0000-0000-000000000000";
  }

  const { error } = await supabase.from("ai_chat_messages").insert({
    tenant_id,
    agent_id,
    session_id,
    role,
    content,
    user_id: finalUserId,
  });

  if (error) {
    console.error("[ai-memory] Error saving message:", error);
  }
}

// FIX: filter by agent_id so different agents on the same phone don't share history.
// A SDR agent and a Support agent serving the same number must have isolated contexts.
export async function getHistory(supabase: any, params: {
  session_id: string;
  agent_id?: string;
  limit?: number;
}) {
  const { session_id, agent_id, limit = 15 } = params;

  let query = supabase
    .from("ai_chat_messages")
    .select("role, content")
    .eq("session_id", session_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (agent_id) query = query.eq("agent_id", agent_id);

  const { data, error } = await query;

  if (error) {
    console.error("[ai-memory] Error fetching history:", error);
    return [];
  }

  // Return in chronological order (oldest first)
  return (data as any[]).reverse();
}
