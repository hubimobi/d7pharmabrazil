

O usuário fez uma análise técnica precisa do sistema atual e quer evoluir para uma arquitetura tipo ManyChat. Vou validar as 3 falhas apontadas lendo o código real e propor um plano de refatoração.

## Análise das falhas apontadas

**1. Race condition na fila** — Vou confirmar lendo `whatsapp-process-queue/index.ts`. Pelo summary, o select pega `pending` e depois faz update — sem `FOR UPDATE SKIP LOCKED` nem claim atômico. Se o cron disparar 2x em paralelo (acontece quando uma execução demora mais que o intervalo), os dois workers pegam as mesmas linhas e enviam duplicado.

**2. setTimeout em Edge Function** — Edge Functions Supabase têm timeout (~150s wall clock e CPU limits agressivos). Usar `setTimeout` para espaçar envios trava CPU e desperdiça quota. Pior: se o batch tem 100 mensagens com delay de 5s entre cada = 500s, morre no meio.

**3. Monolítica** — `whatsapp-process-queue` mistura: validação de número, limites diários, escolha de instância, envio, retry, branches de funil (condition/transfer/wait/save/branch/start_flow/split). Adicionar novo tipo de step exige tocar nesse arquivo gigante.

**4. Falta de State Machine** — Hoje o "estado" do usuário no funil está implícito na fila (`whatsapp_message_queue`). Não há tabela `flow_sessions` que guarde "user X está no node Y do flow Z aguardando resposta". Quando o cliente responde, não há onde retomar.

## Plano de refatoração (4 fases incrementais)

### Fase 1 — Atomicidade e idempotência (resolve #1)

Criar função SQL `claim_whatsapp_messages(worker_id, batch_size)` que faz:
```sql
UPDATE whatsapp_message_queue
SET status='processing', claimed_by=worker_id, claimed_at=now()
WHERE id IN (
  SELECT id FROM whatsapp_message_queue
  WHERE status='pending' AND scheduled_at <= now()
  ORDER BY priority DESC, scheduled_at ASC
  LIMIT batch_size
  FOR UPDATE SKIP LOCKED
)
RETURNING *;
```

Adicionar colunas: `claimed_by uuid`, `claimed_at timestamptz`, `idempotency_key text unique`. Worker só processa o que conseguiu claimar. Se crashear, job de "rescue" devolve `processing` com `claimed_at < now()-5min` para `pending`.

### Fase 2 — Substituir setTimeout por re-agendamento (resolve #2)

Em vez de `await sleep(delay)` dentro do handler, calcular `next_scheduled_at = now() + jitter` e fazer UPDATE na próxima mensagem da fila. O cron roda a cada 30s e processa apenas o que está "vencido". Cada execução envia 1 lote pequeno (5-10 msgs) e termina rápido. Anti-ban vira persistente no banco, não em memória.

### Fase 3 — State Machine de fluxos (resolve #4, base para ManyChat)

Nova tabela `whatsapp_flow_sessions`:
```
id, tenant_id, instance_id, contact_phone, flow_id,
current_node_id, variables jsonb, status (active/waiting_input/completed/aborted),
last_event_at, expires_at, created_at
```

Quando webhook recebe mensagem de entrada:
1. Procura sessão ativa por `(instance_id, contact_phone)`
2. Se status=`waiting_input`, casa a resposta com a aresta esperada e avança o nó
3. Se não tem sessão, dispara matchers de gatilho (palavra-chave, evento)

Isso é exatamente o modelo do ManyChat: o **estado** é a fonte da verdade, a fila é só executora.

### Fase 4 — Modularizar steps (resolve #3)

Criar `supabase/functions/_shared/flow-steps/` com um handler por tipo:
- `message.ts`, `condition.ts`, `transfer.ts`, `wait_input.ts`, `branch.ts`, `start_flow.ts`, `set_variable.ts`, `ai_reply.ts`

Cada handler exporta `execute(ctx, node) -> NextAction`. O orquestrador (`flow-engine`) só faz dispatch por tipo. Adicionar novo bloco = criar novo arquivo, sem tocar no engine.

### Arquivos a criar/modificar

**Novos:**
- `supabase/migrations/<ts>_whatsapp_state_machine.sql` — colunas idempotência + tabela `whatsapp_flow_sessions` + função `claim_whatsapp_messages` + job rescue
- `supabase/functions/_shared/flow-steps/*.ts` — handlers modulares
- `supabase/functions/_shared/flow-engine.ts` — orquestrador
- `supabase/functions/whatsapp-flow-tick/index.ts` — cron leve (claim + dispatch + reschedule)
- `supabase/functions/whatsapp-flow-rescue/index.ts` — recupera mensagens travadas em `processing`

**Modificados:**
- `supabase/functions/whatsapp-process-queue/index.ts` — fica só como compatibilidade, delega para o novo engine
- `supabase/functions/whatsapp-evolution-webhook/index.ts` — em `MESSAGES_UPSERT` inbound, consulta `whatsapp_flow_sessions` e avança o nó se houver sessão `waiting_input`
- `supabase/functions/whatsapp-webhook/index.ts` (trigger de funil) — cria `flow_session` em vez de só enfileirar mensagens
- `supabase/config.toml` — agendar `whatsapp-flow-tick` a cada 30s e `whatsapp-flow-rescue` a cada 5min via pg_cron

### Resultado esperado

- Zero envios duplicados (claim atômico + idempotency_key)
- Funciona com filas de qualquer tamanho (re-agendamento, sem setTimeout)
- Conversação bidirecional real (webhook avança a sessão quando cliente responde)
- Adicionar novo tipo de bloco = 1 arquivo novo, sem risco de regressão
- Base sólida para evoluir para ManyChat (drag-drop já existe em `WhatsAppFlowEditor`, falta só o motor)

### Riscos e mitigação

- **Migração de dados**: mensagens já em `pending` continuam funcionando (engine novo lê o mesmo formato)
- **Rollback**: manter `whatsapp-process-queue` antigo desabilitado mas presente por 1 sprint
- **Compatibilidade UI**: `WhatsAppFlowEditor` já modela nodes/edges no formato certo, não precisa mudar

Posso fazer tudo de uma vez ou só Fase 1+2 primeiro (ataca os bugs críticos sem mexer em estado de fluxo). Recomendo dividir: aprovar Fase 1+2 agora (rápido, alto impacto) e fazer 3+4 num segundo ciclo.

