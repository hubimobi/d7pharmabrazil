

# Gestor de Mensagens WhatsApp — estilo GHL simplificado

## Objetivo
Adicionar uma nova aba **"Conversas"** ao módulo WhatsApp com interface de inbox estilo GHL: lista de conversas à esquerda, chat à direita, envio manual de mensagens, respostas rápidas, tags e filtros por status.

## O que já existe
- Aba "Contatos" com timeline de mensagens (somente leitura, sem envio)
- `whatsapp_message_log` com campo `direction` (outbound/inbound)
- `whatsapp_contacts` com `tags`, `notes`, `source`
- `whatsapp_instances` conectadas via Evolution API
- Edge Function `whatsapp-send` para envio real
- `whatsapp_templates` com Spintax

## O que será criado

### 7A. Migration — tabela `whatsapp_conversations`
Nova tabela para agrupar conversas por contato:

| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid | Isolamento |
| contact_phone | text | Telefone do contato |
| contact_name | text | Nome |
| last_message | text | Última mensagem (preview) |
| last_message_at | timestamptz | Timestamp da última msg |
| unread_count | int | Mensagens não lidas |
| status | text | open / closed / archived |
| assigned_to | uuid? | Usuário atendente |
| tags | jsonb | Tags da conversa |
| created_at / updated_at | timestamptz | |

RLS: tenant_iso padrão + `is_super_admin()`.

Adicionar `conversation_id` à `whatsapp_message_log` (nullable, para retrocompatibilidade).

### 7B. Nova aba "Conversas" no WhatsAppPage

Layout 3 colunas (responsivo para 2 em telas menores):

```text
┌─────────────┬──────────────────────┬────────────┐
│  Lista de   │                      │  Detalhes  │
│  Conversas  │   Chat / Timeline    │  Contato   │
│  (filtros)  │   + Input de envio   │  Tags/Info │
└─────────────┴──────────────────────┴────────────┘
```

**Coluna 1 — Lista de Conversas:**
- Filtros: Todas / Abertas / Arquivadas / Não lidas
- Busca por nome/telefone
- Card de conversa: avatar, nome, preview da última msg, horário, badge de não lidas
- Ordenação por `last_message_at` desc

**Coluna 2 — Chat:**
- Timeline estilo WhatsApp (bolhas verdes = outbound, brancas = inbound)
- Campo de texto + botão enviar (chama `whatsapp-send`)
- Botão de respostas rápidas (popover com templates)
- Indicador de status (enviado/erro)

**Coluna 3 — Detalhes do Contato:**
- Nome, telefone, email
- Tags (adicionar/remover)
- Notas do contato
- Ações: Abrir WhatsApp Web, Fechar conversa, Arquivar
- Histórico resumido: total de msgs, primeira/última interação

### 7C. Envio manual via Edge Function

Reutilizar `whatsapp-send` existente. No frontend:
1. Selecionar instância ativa (ou usar a primeira disponível)
2. Digitar mensagem
3. Enviar via `supabase.functions.invoke("whatsapp-send")`
4. Inserir log em `whatsapp_message_log`
5. Atualizar `whatsapp_conversations` (last_message, last_message_at)

### 7D. Respostas Rápidas

Popover no campo de mensagem que lista `whatsapp_templates` ativos. Ao clicar, preenche o campo com o conteúdo do template (variáveis substituídas pelo nome do contato). Suporte a Spintax (gera variação ao selecionar).

## Arquivos a criar/editar

| Arquivo | Ação |
|---|---|
| Migration SQL | Criar tabela `whatsapp_conversations` + alter `whatsapp_message_log` |
| `src/pages/admin/WhatsAppPage.tsx` | Adicionar aba "Conversas" com componente `ConversationsTab` |

## Detalhes técnicos

- A aba "Conversas" substitui a funcionalidade da aba "Contatos" atual (que fica como está para retrocompatibilidade)
- Auto-criar conversa ao enviar primeira mensagem para um contato
- Ao receber mensagem inbound (via webhook futuro), incrementar `unread_count`
- Marcar como lida ao abrir a conversa

