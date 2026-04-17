
## Plano: Melhorias avançadas no Editor de Flows

### 1. Bloquear saída sem salvar (rigoroso)
Reforçar guard no `FlowCanvas`:
- Botão **Voltar** (`onBack`) → checa `dirty` antes, abre `UnsavedChangesDialog`.
- Cliques em `[role="tab"]` (tabs do WhatsAppPage) → interceptar igual a `<a>`.
- `beforeunload` (já existe).
- Dialog com 3 opções: **Salvar e sair** / **Sair sem salvar** / **Cancelar**.

### 2. Bloco "Esperar" — modo "Data Específica"
Adicionar modo `wait_until_date` ao nó `wait`:
- Campos: `wait_date` (date picker) + `wait_time` (HH:MM).
- Select Modo: `Aguardar duração` | `Aguardar até data específica`.
- Processor calcula `scheduled_at = (date + time)`; pausa fluxo até essa data.

### 3. Bloco "Pergunta" — salvar resposta em campo
Novo campo `save_to_field` no nó `question`:
- Select: `name`, `email`, `phone`, `city`, `state`, `cpf`, `tag`, `custom_key`.
- Processor faz `upsert` em `popup_leads` (chave: phone) com o valor capturado.
- Para `tag`: insere em `customer_tags`. Para `custom_key`: salva em `popup_leads.tags` como `"key:value"`.

### 4. Bloco "Escolhas" — limite 4
- Botão "Adicionar opção" desabilita quando `choices.length >= 4`.
- Mensagem helper "Máximo de 4 escolhas".

### 5. Bloco "Condição" — palavras-chave por vírgula
- Trocar input atual por `<Input>` controlado com `value=keywords` (string).
- Parse só na execução: `keywords.split(",").map(k=>k.trim()).filter(Boolean)`.
- Helper text: "Separe por vírgula".

### 6. Nome customizado para o nó
- Campo `label?: string` em `FlowNode`.
- Input "Nome do bloco (opcional)" no topo do `renderPropertiesPanel`.
- Preview e header do nó mostram `node.label || defaultLabelByType()`.
- Busca/lista de nós considera `label` além de id/tipo.
- *(ignorar "convertido" conforme solicitado)*

### 7. Bloco "Variável" — ramificação Sim/Não
Estender nó `variable` (ou novo `branch`):
- Config: `variable_name`, `operator` (`exists`, `equals`, `contains`, `is_true`), `compare_value`.
- 2 portas de saída: **Sim** (verde) / **Não** (vermelho).
- Edges armazenam `fromHandle: "true" | "false"`; renderer colore conforme.

### 8. Bloco "Iniciar Fluxo" (start_flow)
Novo tipo `start_flow`:
- Config: `target_flow_id` (select de `whatsapp_flows` ativos).
- **Comportamento (conforme usuário):** encerra **imediatamente** o fluxo atual:
  - Cancela todas as mensagens pendentes desse contato no flow atual (`UPDATE whatsapp_message_queue SET status='cancelled' WHERE contact_phone=X AND flow_id=current AND status='pending'`).
  - Inicia o fluxo alvo para o mesmo contato (enfileira primeiro nó do novo flow com variáveis preservadas).
- Validação: bloquear seleção do próprio flow (loop direto).

### 9. Bloco "Split" (round-robin)
Novo tipo `split`:
- Config: `split_count` (2-5) → gera N portas de saída A/B/C/D/E.
- Estado por flow: nova tabela `whatsapp_flow_split_state(flow_id uuid, node_id text, last_index int, updated_at, PRIMARY KEY(flow_id,node_id))`.
- Em cada execução: incrementa `last_index` (módulo N) e direciona para a porta correspondente.
- UI: portas numeradas/coloridas no canvas.

### Arquivos modificados
- `src/components/admin/WhatsAppFlowEditor.tsx` — novos tipos, properties panel, ramificações, label, guard reforçado.
- `src/hooks/useUnsavedChangesGuard.tsx` — interceptar `[role="tab"]` + expor `attemptExit()`.
- `src/pages/admin/WhatsAppPage.tsx` — passar callback de guard pro tab change quando flow está sujo.
- `supabase/functions/whatsapp-process-queue/index.ts` — executar `wait_until_date`, `branch`, `start_flow` (com cancelamento), `split` (com round-robin), salvar resposta em `popup_leads`/`customer_tags`.
- **Migration nova:** `whatsapp_flow_split_state` + index.

### Investigação a fazer ao implementar
- Confirmar se `whatsapp_message_queue` já tem coluna `flow_id` (sim — adicionada na migration anterior). Usar para cancelamento.
- Verificar coluna `popup_leads.tags` (jsonb/text[]) para o save em custom_key.
