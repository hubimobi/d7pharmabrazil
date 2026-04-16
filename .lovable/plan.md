

# Melhorias Profissionais no Sistema de Envio WhatsApp

## Resumo
Implementar 3 melhorias inspiradas em ferramentas profissionais de disparo (ManyChat, Wati, Utalk): validação de número antes do envio, configuração de frequência/limites, e throttling inteligente anti-bloqueio.

## O que muda para o usuário
- Números inválidos são detectados **antes** de gastar mensagens
- Painel de configuração de velocidade de envio (mensagens/minuto, limite diário global, intervalo entre blocos)
- Envios escalonados com variação aleatória para parecer humano e evitar bloqueio do Meta

---

## Etapa 1: Tabela de configuração de envio

**Nova migration SQL** — criar tabela `whatsapp_sending_config` com campos:
- `messages_per_batch` (int, default 10) — quantas mensagens processar por execução
- `batch_interval_seconds` (int, default 30) — intervalo entre cada mensagem dentro do batch
- `batch_interval_variance` (int, default 15) — variação aleatória em segundos (+/-)
- `daily_global_limit` (int, default 500) — limite diário global (todas as instâncias somadas)
- `validate_numbers` (bool, default true) — se deve validar números antes de enviar
- `warmup_mode` (bool, default false) — modo aquecimento (reduz velocidade automaticamente)
- `warmup_daily_increase` (int, default 20) — quantas msgs a mais por dia no aquecimento
- `tenant_id` (uuid)
- RLS policies padrão

## Etapa 2: Validação de número via Evolution API

**Arquivo**: `supabase/functions/whatsapp-process-queue/index.ts`

Antes de enviar cada mensagem de texto/arquivo, chamar a Evolution API:
```
POST {api_url}/chat/whatsappNumbers/{instance_name}
Body: { "numbers": ["5547984826726"] }
```

Se o número retorna `exists: false`:
- Marcar a mensagem como `failed` com `error_message: "Número não existe no WhatsApp"`
- Cancelar automaticamente **todas** as outras mensagens pendentes do mesmo `contact_phone` no mesmo `funnel_id`
- Cachear o resultado (inserir em `whatsapp_number_validation` com TTL de 7 dias) para não validar o mesmo número repetidamente

**Nova tabela** `whatsapp_number_validation`:
- `phone` (text, unique)
- `exists` (bool)
- `validated_at` (timestamptz)
- `tenant_id` (uuid)

## Etapa 3: Throttling inteligente no process-queue

**Arquivo**: `supabase/functions/whatsapp-process-queue/index.ts`

Mudanças:
1. No início, carregar `whatsapp_sending_config` do tenant
2. Respeitar `messages_per_batch` em vez do hardcoded `limit(20)`
3. Calcular delay entre mensagens: `batch_interval_seconds ± random(batch_interval_variance)` em vez do hardcoded `3000 + Math.random() * 7000`
4. Antes de processar, verificar `daily_global_limit` (somar `messages_sent_today` de todas as instâncias)
5. Se `warmup_mode`, calcular limite dinâmico baseado na idade da instância

## Etapa 4: Staggering no Broadcast

**Arquivo**: `src/pages/admin/WhatsAppPage.tsx` (BroadcastTab)

Atualmente staggers por 5s fixo (`idx * 5000`). Mudar para usar a config:
- Ler `whatsapp_sending_config` antes do broadcast
- Usar `batch_interval_seconds` como base do stagger
- Agrupar em blocos de `messages_per_batch`, com intervalo maior entre blocos

## Etapa 5: UI de Configuração de Envio

**Arquivo**: `src/pages/admin/WhatsAppPage.tsx`

Adicionar uma nova seção "Configurações de Envio" (dentro da tab Instâncias ou como tab própria) com:
- Slider: Mensagens por lote (5-50)
- Slider: Intervalo entre envios (10-120 segundos)
- Slider: Variação aleatória (0-60 segundos)
- Input: Limite diário global (100-2000)
- Toggle: Validar números antes de enviar
- Toggle: Modo aquecimento (com campo de incremento diário)
- Indicador visual de "velocidade segura" (verde/amarelo/vermelho)

## Etapa 6: Cancelamento em cascata de números inválidos

**Arquivo**: `supabase/functions/whatsapp-process-queue/index.ts`

Quando um número é validado como inexistente:
- Cancelar todas as mensagens `pending` do mesmo `contact_phone` (não só do mesmo funil)
- Registrar no `whatsapp_message_log` como `"number_invalid"`

---

## Arquivos modificados
- `supabase/functions/whatsapp-process-queue/index.ts` — validação, throttling, config
- `src/pages/admin/WhatsAppPage.tsx` — UI de configuração + stagger inteligente no broadcast
- Nova migration SQL — tabelas `whatsapp_sending_config` e `whatsapp_number_validation`

## Inspiração em ferramentas profissionais
- **ManyChat/Wati**: Validação de número pré-envio, cancelamento em cascata
- **Utalk/Zapi**: Throttling com variação aleatória para simular comportamento humano
- **Chatwoot**: Modo aquecimento progressivo para números novos
- **Meta Best Practices**: Limite diário crescente, intervalos variáveis, evitar padrões repetitivos

