

# Funil de Automação WhatsApp — estilo ManyChat simplificado

## Situação atual

A tabela `whatsapp_funnel_steps` tem apenas: `delay_minutes`, `template_id`, `instance_id`, `active`, `step_order`. Cada etapa é sempre "espera X minutos + envia template". Sem condicionais, sem tipos de ação, sem transferência.

## Novo modelo de etapas

Cada step ganha um campo `step_type` e um campo `config` (JSONB) que armazena a configuração específica do tipo:

| Tipo | Descrição | config JSONB |
|---|---|---|
| `message_template` | Envia template existente | `{ template_id }` |
| `message_custom` | Envia mensagem livre | `{ content, variables }` |
| `pause` | Aguarda tempo | `{ delay_value, delay_unit }` (m/h/d) |
| `send_file` | Envia arquivo/áudio/link | `{ file_type: "file"|"audio"|"link", url, caption?, use_shortener? }` |
| `condition` | Condicional (branch) | `{ condition_type: "replied"|"tag_added"|"clicked_link"|"accessed_link", expected: true|false, tag_name?, link_code?, yes_step_order, no_step_order }` |
| `transfer` | Transferir conversa | `{ transfer_to: "ai_agent"|"representative"|"user", target_id? }` |
| `end` | Finalizar funil | `{ condition?: { type, value }, mark_as? }` |

## Migration SQL

```sql
ALTER TABLE public.whatsapp_funnel_steps
  ADD COLUMN IF NOT EXISTS step_type text NOT NULL DEFAULT 'message_template',
  ADD COLUMN IF NOT EXISTS config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS label text DEFAULT '';
```

Retrocompatibilidade: steps existentes mantêm `step_type = 'message_template'` e continuam funcionando com `template_id`.

## UI — Nova experiência de adição de etapa

Substituir o botão "+ Etapa" por um menu dropdown com os tipos disponíveis. Cada tipo renderiza um card visual diferente na timeline do funil:

```text
┌──────────────────────────────────────┐
│ [1] 📩 Mensagem Template             │
│     Template: "Boas vindas"          │
│     WhatsApp: Auto                   │
├──────────────────────────────────────┤
│ [2] ⏸️  Pausa — 2 horas              │
├──────────────────────────────────────┤
│ [3] ✉️  Mensagem Livre               │
│     "Olá {Nome}, tudo bem?"          │
├──────────────────────────────────────┤
│ [4] 🔀 Condicional: Respondeu?       │
│     ✅ Sim → Etapa 6 (Transferir)    │
│     ❌ Não → Etapa 5 (Lembrete)      │
├──────────────────────────────────────┤
│ [5] 📎 Enviar Arquivo                │
│     Tipo: Link encurtado             │
├──────────────────────────────────────┤
│ [6] 🔄 Transferir → Agente de IA    │
├──────────────────────────────────────┤
│ [7] 🏁 Finalizar                     │
└──────────────────────────────────────┘
```

Cada card é editável inline (expandível ao clicar). O tipo `condition` mostra dois caminhos (sim/não) com select para qual etapa segue.

## Arquivos

| Arquivo | Ação |
|---|---|
| Migration SQL | ALTER whatsapp_funnel_steps + step_type, config, label |
| `src/pages/admin/WhatsAppPage.tsx` | Reescrever seção de Funis: novo addStep com tipo, cards visuais por tipo, editor inline de config |
| `supabase/functions/whatsapp-webhook/index.ts` | Adaptar para processar step_type (message_template fica igual, pause vira delay, condition avalia e pula, transfer cria ação, end finaliza) |
| `supabase/functions/whatsapp-process-queue/index.ts` | Suporte a novos tipos na fila |

## Detalhes de implementação

**Frontend (WhatsAppPage.tsx):**
- Dropdown "+ Nova Etapa" com ícones por tipo
- Ao adicionar, insere step com `step_type` e `config` padrão
- Card visual diferente por tipo (cor de fundo, ícone, campos específicos)
- Tipo `pause`: input de valor + select min/h/d (substitui o delay_minutes genérico)
- Tipo `message_custom`: textarea com suporte a variáveis
- Tipo `condition`: select do tipo de condição + toggle sim/não + selects de destino
- Tipo `transfer`: select com agentes IA, representantes, usuários
- Tipo `send_file`: select tipo (arquivo/áudio/link) + input URL + checkbox encurtador
- Tipo `end`: checkbox "com condição" + select condição

**Backend (webhook + process-queue):**
- `message_template`: comportamento atual (busca template, substitui vars, enfileira)
- `message_custom`: usa `config.content` diretamente
- `pause`: adiciona delay ao cumulativo (já funciona via delay_minutes, migrar para config)
- `send_file`: enfileira com tipo de mídia
- `condition`: avalia condição (check em whatsapp_message_log/contacts/link_clicks) e pula para step correto
- `transfer`: atualiza `whatsapp_conversations.assigned_to` ou aciona agente IA
- `end`: marca conversa como fechada

**Link encurtado (send_file com shortener):**
- Reutiliza a tabela `short_links` existente para criar link rastreável
- Gera código automático no formato `/l/:code`
- Rastreia cliques via `link_clicks` (já existe)

## O que falta (essencial para ManyChat-like)

Itens já incluídos no plano acima. Nada faltando para um MVP funcional de automação estilo ManyChat simplificado.

