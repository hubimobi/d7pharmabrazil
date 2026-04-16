

# Correções WhatsApp + Nova Aba Flows (Typebot)

## Problemas Identificados

### 1. Conversas não aparecem (0 registros)
- **Causa raiz**: O webhook da Evolution API só recebe eventos `connection.update` com `state="connecting"`. Nenhum evento `messages.upsert` chega, então conversas e mensagens nunca são criadas.
- **Solução**: O webhook está configurado corretamente no código (`configureWebhook` envia `MESSAGES_UPSERT`), mas as instâncias mostram `state="connecting"` repetidamente — estão em loop de reconexão. Precisamos:
  1. Corrigir o `whatsapp-evolution-webhook` para também tratar `state="connecting"` sem ignorar, e logar melhor
  2. Adicionar um botão "Reconfigurar Webhook" na UI para forçar recadastro do webhook
  3. Adicionar na aba Conversas um indicador quando não há dados + botão de diagnóstico

### 2. Envio de mensagens não funciona
- **Causa raiz**: O `whatsapp-send` funciona em teoria, mas as instâncias podem não estar realmente conectadas (loop de "connecting"). Também, ao enviar pela UI de Conversas, o `contact_phone` pode não ter o código `55`.
- **Solução**: Aplicar `ensureBrazilCountryCode` no frontend antes de enviar, e melhorar feedback de erro na UI

### 3. Funis com problemas
- O `whatsapp-webhook` (trigger de funis) depende de receber eventos via webhook que não estão chegando
- Steps sem `template_id` (config vazio) não produzem conteúdo
- **Solução**: Validar steps ao salvar, alertar quando step não tem template

### 4. Nova aba Flows (inspirado Typebot)
- Editor visual de fluxos com nós arrastáveis e conexões
- Diferente dos funis lineares atuais: suporta ramificações, condições, loops
- Nós: Start, Mensagem, Condição, Espera, Input (pergunta), AI Gen, Transferir, Fim

## Plano de Implementação

### Arquivo 1: `supabase/functions/whatsapp-evolution-webhook/index.ts`
- Melhorar logs para debug (logar payload completo em `messages.upsert`)
- Tratar variações de formato do Evolution API v2
- Adicionar fallback para `connection.update` com `state="connecting"` (logar mas não atualizar)

### Arquivo 2: `src/components/admin/WhatsAppConversations.tsx`
- Adicionar `ensureBrazilCountryCode` ao enviar mensagem
- Mostrar estado vazio informativo com diagnóstico quando 0 conversas
- Melhorar tratamento de erro no envio

### Arquivo 3: `src/pages/admin/WhatsAppPage.tsx`
- Na aba Instâncias: adicionar botão "Reconfigurar Webhook" que chama `whatsapp-instance` com `action: "set_webhook"`
- Na aba Funis: validar que steps têm template/conteúdo antes de ativar
- Adicionar nova aba **Flows**

### Arquivo 4 (novo): `src/components/admin/WhatsAppFlowEditor.tsx`
- Editor visual de fluxos estilo Typebot
- Canvas com nós arrastáveis (usando posicionamento absoluto + SVG para conexões)
- Tipos de nó: Start, Message, Condition, Wait, Input, AI Generate, Transfer, End
- Cada nó tem configuração inline (template, delay, condição)
- Conexões entre nós via drag de pontos de saída
- Salva estrutura como JSON no banco

### Migration SQL
- Criar tabela `whatsapp_flows` (id, name, nodes JSON, edges JSON, active, tenant_id, trigger_event, created_at)
- RLS com tenant isolation

## Arquitetura do Flow Editor

```text
WhatsAppFlowEditor.tsx (~600 linhas)
├── FlowCanvas — área de canvas com zoom/pan
│   ├── FlowNode — cada nó renderizado com posição absoluta
│   │   ├── Configuração inline (mensagem, template, condição)
│   │   └── Handles de conexão (entrada/saída)
│   └── FlowEdges — SVG overlay para linhas de conexão
├── FlowToolbar — barra lateral com tipos de nó para arrastar
└── FlowProperties — painel de propriedades do nó selecionado
```

Nós suportados (inspirados no Typebot do screenshot):
- **Start**: ponto de entrada
- **Message**: envia mensagem (template ou custom)
- **Input**: faz pergunta e salva resposta em variável
- **Condition**: ramifica baseado em variável/resposta
- **Wait**: pausa com timeout
- **AI Gen**: chama LLM para gerar resposta
- **Transfer**: transfere para humano/agente
- **Set Variable**: define variável para uso posterior

## Detalhes técnicos

### Dados de nó (JSON)
```json
{
  "nodes": [
    { "id": "1", "type": "start", "position": { "x": 50, "y": 100 }, "data": {} },
    { "id": "2", "type": "message", "position": { "x": 300, "y": 100 }, "data": { "content": "Olá {Nome}!" } },
    { "id": "3", "type": "condition", "position": { "x": 550, "y": 100 }, "data": { "variable": "Sport", "options": ["Ride", "Run", "Other"] } }
  ],
  "edges": [
    { "from": "1", "to": "2" },
    { "from": "2", "to": "3" },
    { "from": "3", "to": "4", "label": "Ride" }
  ]
}
```

### Resumo de arquivos
- `supabase/functions/whatsapp-evolution-webhook/index.ts` — melhoria de logs e tratamento
- `supabase/functions/whatsapp-send/index.ts` — sem mudanças (já funciona)
- `src/components/admin/WhatsAppConversations.tsx` — fix envio + estado vazio
- `src/pages/admin/WhatsAppPage.tsx` — botão reconfigurar webhook + validação funis + aba Flows
- `src/components/admin/WhatsAppFlowEditor.tsx` — novo editor visual
- Migration: tabela `whatsapp_flows`

