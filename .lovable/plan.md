

# Automatizar Configuração de Webhook na Evolution API

## Problema
Hoje, após criar uma instância WhatsApp, o usuário precisa ir manualmente na Evolution API para configurar a URL do webhook. Isso é confuso e quebra a experiência do painel.

## Solução
Automatizar tudo: ao criar (ou conectar) uma instância, o sistema configura automaticamente o webhook na Evolution API via chamada `POST /webhook/set/{instanceName}`. Também criar a edge function `whatsapp-evolution-webhook` que estava faltando.

## Mudanças

### 1. Criar edge function `whatsapp-evolution-webhook/index.ts`
- Recebe eventos da Evolution API (`messages.upsert`, `connection.update`, etc.)
- Faz upsert em `whatsapp_conversations` e insere em `whatsapp_message_log`
- Atualiza status da instância em `connection.update`
- Sem autenticação JWT (webhook externo)

### 2. Atualizar `whatsapp-instance/index.ts`
- No action `create`: após criar a instância na Evolution API, chamar automaticamente `POST {api_url}/webhook/set/{instanceName}` com a URL do nosso webhook (`{SUPABASE_URL}/functions/v1/whatsapp-evolution-webhook`)
- Configurar os eventos: `MESSAGES_UPSERT`, `CONNECTION_UPDATE`, `MESSAGES_UPDATE`
- No action `status` (quando conecta): re-configurar webhook se necessário
- Adicionar nova action `set_webhook` para reconfigurar manualmente se preciso

### 3. Atualizar UI em `WhatsAppPage.tsx`
- Remover o aviso manual "Configure a URL do webhook..."
- Adicionar badge "Webhook ✓" no card da instância quando configurado
- Botão "Reconfigurar Webhook" no menu de ações da instância (caso precise forçar)

### 4. Atualizar `IntegrationsPage.tsx`
- Remover instrução manual de webhook na seção Evolution API

## Detalhes técnicos

**Chamada Evolution API para setar webhook:**
```
POST {api_url}/webhook/set/{instanceName}
Headers: { apikey: api_key }
Body: {
  url: "{SUPABASE_URL}/functions/v1/whatsapp-evolution-webhook",
  webhook_by_events: false,
  webhook_base64: false,
  events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "MESSAGES_UPDATE"]
}
```

**Edge function webhook** recebe payloads da Evolution e:
- `MESSAGES_UPSERT`: cria/atualiza conversa + log de mensagem
- `CONNECTION_UPDATE`: atualiza status da instância (connected/disconnected)

