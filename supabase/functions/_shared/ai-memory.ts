// shared/ai-memory.ts
// Centraliza a sincronização de mensagens entre canais (WhatsApp/Web) e a tabela ai_chat_messages

export async function saveMessage(supabase: any, params: {
  tenant_id: string | null;
  agent_id: string;
  session_id: string; // ex: wa:+5511999999999
  role: 'user' | 'assistant';
  content: string;
  user_id?: string;
}) {
  const { tenant_id, agent_id, session_id, role, content, user_id } = params;

  // Resolve um user_id se não fornecido
  let finalUserId = user_id;
  if (!finalUserId) {
    // Se não há user_id, buscamos o dono do tenant ou um uuid fixo para anon
    const { data: tenant } = await supabase.from('tenants').select('owner_id').eq('id', tenant_id).maybeSingle();
    finalUserId = tenant?.owner_id || '00000000-0000-0000-0000-000000000000'; // fallback system
  }

  const { error } = await supabase.from('ai_chat_messages').insert({
    tenant_id,
    agent_id,
    session_id,
    role,
    content,
    user_id: finalUserId
  });

  if (error) {
    console.error('[ai-memory] Error saving message:', error);
  }
}

export async function getHistory(supabase: any, params: {
  session_id: string;
  limit?: number;
}) {
  const { session_id, limit = 15 } = params;

  const { data, error } = await supabase
    .from('ai_chat_messages')
    .select('role, content')
    .eq('session_id', session_id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[ai-memory] Error fetching history:', error);
    return [];
  }

  // Retorna em ordem cronológica (mais antiga primeiro)
  return data.reverse();
}
