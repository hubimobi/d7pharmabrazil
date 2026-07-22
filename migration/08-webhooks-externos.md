# Etapa 8 — Reconfigurar webhooks nos provedores

Base URL nova das funções: `https://SEU_REF.supabase.co/functions/v1/`

## Asaas
Painel Asaas → **Integrações → Webhooks** → editar:
- URL: `https://SEU_REF.supabase.co/functions/v1/asaas-webhook`
- Token: colar o mesmo `ASAAS_WEBHOOK_TOKEN` que você cadastrou nos secrets
- Eventos: `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_REFUNDED`

## Bling
Após deploy, faça login como admin em `https://d7pharmabrazil.com.br/admin/integracoes/bling` e clique **Conectar** — ele vai redirecionar pro OAuth do Bling com a URL correta.

Antes disso, no painel do Bling → **seu app** → **Redirect URI**, adicione:
```
https://SEU_REF.supabase.co/functions/v1/bling-callback
```

## Evolution API (WhatsApp)
Para cada instância, chamar (via curl ou pelo painel Evolution):
```bash
curl -X POST 'https://sua-evo.com/webhook/set/INSTANCE_NAME' \
  -H 'apikey: EVOLUTION_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "https://SEU_REF.supabase.co/functions/v1/whatsapp-evolution-webhook",
    "webhook_by_events": false,
    "events": ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"]
  }'
```

E adicione o header `x-webhook-secret: WHATSAPP_WEBHOOK_SECRET` na config da Evolution (varia por versão).

## GoHighLevel
Painel GHL → **Settings → Integrations → Webhooks** (ou via API):
- URL: `https://SEU_REF.supabase.co/functions/v1/ghl-sync`

## TikTok Shop
Se usa: **Seller Center → App Console → Callback URL**:
- `https://SEU_REF.supabase.co/functions/v1/tiktok-shop-callback`

## Cloudflare
Nada muda — o backend chama a API do CF, não recebe callback.

## Meta Product Feed
Meta Commerce Manager → **Catálogo → Fontes de dados**:
- URL: `https://SEU_REF.supabase.co/functions/v1/meta-product-feed?tenant_id=SEU_TENANT_UUID`
- Formato: RSS 2.0
