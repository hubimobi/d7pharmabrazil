

Vou implementar as **Fases 3 e 4** do plano aprovado: State Machine de fluxos + modularização dos steps.

## Fase 3 — State Machine (`whatsapp_flow_sessions`)

**Migration nova:**
```sql
CREATE TABLE public.whatsapp_flow_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  instance_id uuid REFERENCES whatsapp_instances(id) ON DELETE SET NULL,
  contact_phone text NOT NULL,
  contact_name text,
  flow_id uuid,                  -- pode referenciar whatsapp_flows OU funnel
  funnel_id uuid,
  current_node_id text,
  variables jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'active', -- active | waiting_input | completed | aborted | expired
  waiting_for text,              -- 'text' | 'choice' | 'media' | null
  last_event_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX ON whatsapp_flow_sessions (instance_id, contact_phone) WHERE status IN ('active','waiting_input');
CREATE INDEX ON whatsapp_flow_sessions (tenant_id, status);
CREATE INDEX ON whatsapp_flow_sessions (expires_at) WHERE status = 'waiting_input';
```

RLS: tenant_staff vê do próprio tenant, super_admin vê tudo.

Função SQL `advance_flow_session(session_id, user_input)` para casamento atômico de input → próxima aresta.

Função SQL `expire_flow_sessions()` chamada por cron — marca `waiting_input` com `expires_at < now()` como `expired`.

## Fase 4 — Engine modular

**Estrutura nova:**
```
supabase/functions/_shared/flow-engine/
  ├── engine.ts          // orquestrador: dispatch + persist
  ├── types.ts           // FlowContext, NodeHandler, NextAction
  └── steps/
      ├── message.ts     // envia texto via fila
      ├── condition.ts   // avalia variável
      ├── wait_input.ts  // pausa sessão como waiting_input
      ├── transfer.ts    // marca conversa como humano
      ├── set_variable.ts
      ├── start_flow.ts  // troca flow_id
      ├── ai_reply.ts    // chama ai-agent-chat
      └── end.ts
```

Cada step exporta:
```ts
export const handler: NodeHandler = {
  type: 'message',
  async execute(ctx, node) {
    // ...
    return { kind: 'next', nextNodeId: '...' }
      | { kind: 'wait', waitingFor: 'text' }
      | { kind: 'complete' }
      | { kind: 'jump', flowId, nodeId };
  }
}
```

`engine.ts` faz `Map<string, NodeHandler>` e despacha. Adicionar bloco novo = criar arquivo + registrar no map.

## Edge Functions novas/modificadas

**Nova `whatsapp-flow-tick`** (cron 30s):
- Claim atômico de sessões `active` com nó pendente (não `waiting_input`)
- Despacha um passo por sessão e persiste
- Termina rápido (sem setTimeout)

**Modificar `whatsapp-evolution-webhook`** (`MESSAGES_UPSERT` inbound):
1. Procura `flow_session` ativa por `(instance_id, contact_phone)` com `status='waiting_input'`
2. Se encontrar: chama `advance_flow_session` com texto recebido → reativa para `active`
3. Senão: dispara matchers de gatilho (palavra-chave bate com `whatsapp_flows.trigger_*`) → cria nova sessão

**Modificar `whatsapp-webhook`** (gatilho de evento, ex: `carrinho_abandonado`):
- Em vez de enfileirar todas as mensagens de uma vez, cria `flow_session` no nó inicial e deixa o tick processar.
- Mantém compatibilidade com funis antigos (se flow não existe, usa caminho antigo).

**Cron jobs (via SQL pg_cron):**
- `whatsapp-flow-tick` a cada 30s
- `expire_flow_sessions()` a cada 1min

## Compatibilidade

- Funis antigos (`whatsapp_funnels` + `whatsapp_funnel_steps`) continuam funcionando pelo caminho atual.
- Flows novos (`whatsapp_flows` JSON nodes/edges) usam o engine novo.
- `WhatsAppFlowEditor` já produz o formato certo — sem mudança de UI.

## Arquivos

**Criar:**
- `supabase/migrations/<ts>_whatsapp_flow_sessions.sql`
- `supabase/functions/_shared/flow-engine/engine.ts`
- `supabase/functions/_shared/flow-engine/types.ts`
- `supabase/functions/_shared/flow-engine/steps/{message,condition,wait_input,transfer,set_variable,start_flow,ai_reply,end}.ts`
- `supabase/functions/whatsapp-flow-tick/index.ts`

**Modificar:**
- `supabase/functions/whatsapp-evolution-webhook/index.ts` — branch inbound consulta flow_sessions
- `supabase/functions/whatsapp-webhook/index.ts` — quando trigger casa um flow novo, cria session
- Cron via insert SQL (não migração) com URL + anon key

## Resultado

- Conversação bidirecional: cliente responde → engine avança nó certo
- Estado persistente sobrevive a crashes e deploys
- Adicionar novo bloco = 1 arquivo, sem regressão
- Base ManyChat completa (faltará só polimento de UI no editor)

