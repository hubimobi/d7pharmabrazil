# Etapa 4 — Deploy das Edge Functions

Este projeto tem **51 edge functions** em `supabase/functions/`. Todas rodam em Deno e podem ser deployadas no seu Supabase via CLI.

## 4.1 Linkar CLI ao seu projeto

Na raiz do projeto (clonado localmente):
```bash
supabase link --project-ref SEU_REF
# Vai pedir a senha do banco
```

## 4.2 Deploy em lote

```bash
# Deploy de TODAS de uma vez
for fn in supabase/functions/*/; do
  name=$(basename "$fn")
  [ "$name" = "_shared" ] && continue
  echo "→ Deploy: $name"
  supabase functions deploy "$name" --no-verify-jwt
done
```

Flag `--no-verify-jwt` é necessária porque o Lovable já validava JWT no código (via `getClaims`). Se quiser reforçar, remova a flag apenas nas funções que exigem autenticação real (mas todas já validam internamente).

## 4.3 pg_cron — recriar jobs

No painel do seu Supabase → **SQL Editor**, rode:

```sql
-- Habilitar extensões (se ainda não)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Substitua SEU_REF e CRON_SECRET
-- Rodar a cada 1 minuto: processar fila WhatsApp
SELECT cron.schedule(
  'whatsapp-process-queue',
  '* * * * *',
  $$
    SELECT net.http_post(
      url := 'https://SEU_REF.supabase.co/functions/v1/whatsapp-process-queue',
      headers := '{"x-cron-secret": "SEU_CRON_SECRET", "Content-Type": "application/json"}'::jsonb
    );
  $$
);

-- Rodar a cada 1 minuto: tick de flows
SELECT cron.schedule(
  'whatsapp-flow-tick',
  '* * * * *',
  $$
    SELECT net.http_post(
      url := 'https://SEU_REF.supabase.co/functions/v1/whatsapp-flow-tick',
      headers := '{"x-cron-secret": "SEU_CRON_SECRET"}'::jsonb
    );
  $$
);

-- Rodar a cada 5 minutos: resgatar mensagens travadas
SELECT cron.schedule(
  'whatsapp-rescue-stuck',
  '*/5 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://SEU_REF.supabase.co/functions/v1/whatsapp-rescue-stuck',
      headers := '{"x-cron-secret": "SEU_CRON_SECRET"}'::jsonb
    );
  $$
);

-- Rodar a cada 6 horas: refresh do token Bling
SELECT cron.schedule(
  'bling-refresh-token',
  '0 */6 * * *',
  $$
    SELECT net.http_post(
      url := 'https://SEU_REF.supabase.co/functions/v1/bling-refresh-token',
      headers := '{"x-cron-secret": "SEU_CRON_SECRET"}'::jsonb
    );
  $$
);

-- Ver jobs criados
SELECT jobid, schedule, jobname FROM cron.job;
```

## 4.4 Adaptar funções que usam `LOVABLE_API_KEY`

Funções afetadas (usam Lovable AI Gateway):
- `ai-agent-chat`
- `ai-kb-crawl` / `ai-kb-crawl-public`
- `analyze-copy-score`
- `generate-ad-copy`
- `generate-image` (⚠️ image gen — sem alternativa direta gratuita)
- `generate-profile-copy`
- `generate-testimonials`
- `improve-message-copy`
- `product-qa`

Você já tem `XAI_API_KEY` (Grok). Para chat/texto, troque a URL:

```typescript
// ANTES (Lovable)
const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
  headers: { Authorization: `Bearer ${Deno.env.get('LOVABLE_API_KEY')}` },
  body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages }),
});

// DEPOIS (xAI)
const res = await fetch('https://api.x.ai/v1/chat/completions', {
  headers: { Authorization: `Bearer ${Deno.env.get('XAI_API_KEY')}` },
  body: JSON.stringify({ model: 'grok-2-latest', messages }),
});
```

Para `generate-image`, use OpenAI DALL-E 3 (precisa cadastrar `OPENAI_API_KEY`):
```typescript
const res = await fetch('https://api.openai.com/v1/images/generations', {
  headers: { Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}` },
  body: JSON.stringify({ model: 'dall-e-3', prompt, size: '1024x1024' }),
});
```

**Peça pra mim** substituir todas essas 9 funções de uma vez quando estiver na hora — envio um patch único.

## 4.5 Validar
```bash
# Testar uma função pública
curl "https://SEU_REF.supabase.co/functions/v1/resolve-tenant?host=d7pharmabrazil.com.br" \
  -H "apikey: SEU_ANON_KEY"
```
