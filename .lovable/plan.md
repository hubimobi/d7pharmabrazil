

# Recriar Interface de Conversas Estilo Chatwoot

## Por que não importar do GitHub
O Chatwoot é uma aplicação Ruby on Rails + Vue.js completa (~500k linhas). Não pode ser incorporado em um projeto React/Vite. Importar parcialmente quebraria tudo.

## O que será feito
Reescrever `src/components/admin/WhatsAppConversations.tsx` com layout profissional de 3 colunas inspirado no Chatwoot, usando os dados já existentes no banco.

## Estrutura

```text
WhatsAppConversations.tsx (reescrito, ~800 linhas)
├── ConversationSidebar (56px) — filtros: Todas, Minhas, Não lidas, Arquivadas + labels
├── ConversationList (300px) — busca, avatares coloridos, preview, badges não lidos
├── ConversationChat (flex) — header com ações + bolhas + input com / para templates
└── ContactPanel (280px, colapsável) — detalhes, tags, notas, histórico
```

## Funcionalidades
- **Filtros laterais** com contadores (Todas, Não lidas, Arquivadas)
- **Lista** com avatar (iniciais coloridas), preview da última msg, timestamp relativo, badge unread
- **Chat** com separadores de data, bolhas estilizadas (verde outbound, branco inbound), status de entrega
- **Canned Responses**: digitar `/` abre dropdown de templates filtráveis
- **Painel de contato**: info, labels/tags, notas internas, link WhatsApp
- **Status visuais**: Aberta (azul), Pendente (amarelo), Resolvida (verde), Arquivada (cinza)
- **Realtime** mantido via Supabase channel

## Dados utilizados (sem mudanças no banco)
- `whatsapp_conversations`, `whatsapp_message_log`, `whatsapp_templates`, `whatsapp_instances`

## Arquivo modificado
- `src/components/admin/WhatsAppConversations.tsx` — reescrita completa

