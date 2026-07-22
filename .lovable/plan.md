## Objetivo

Sair do Lovable Cloud e rodar o projeto no **seu Supabase (free tier)** com o frontend hospedado no **seu servidor Verse**, migrando 100% do schema, dados e arquivos de storage.

---

## Etapas

### 1. Preparar o Supabase novo (você faz no painel)
- Anotar do painel do seu Supabase: `Project URL`, `anon key`, `service_role key`, senha do banco (`Database → Connection string`).
- Confirmar que o projeto está na região mais próxima do Brasil (ex.: `sa-east-1`).
- Habilitar extensões: `pgcrypto`, `pg_cron`, `pg_net` (Database → Extensions).

### 2. Exportar schema + dados do Lovable Cloud
- Uso o **Cloud → Advanced settings → Export data** do Lovable para gerar o dump completo do banco (essa é a via oficial e única de export completo).
- Você baixa o arquivo e me devolve, ou importa direto via `psql` no seu Supabase.

### 3. Migrar Storage (imagens, produtos, banners)
- Buckets atuais: `product-images`, `store-assets`, `images` (todos públicos).
- Escrevo um script Node que:
  - Lista todos os arquivos de cada bucket no Lovable Cloud.
  - Baixa e re-upa no seu Supabase preservando o caminho (`{tenant_id}/...`).
  - Recria os buckets como públicos e aplica as policies de isolamento por tenant.

### 4. Recriar/adaptar Edge Functions (40+ funções)
- Copio o código de todas as funções (`supabase/functions/*`) para deploy no seu projeto via **Supabase CLI** (`supabase functions deploy`).
- Ajusto config: `verify_jwt`, cron schedules (`whatsapp-process-queue`, `whatsapp-flow-tick`, `whatsapp-rescue-stuck`, `bling-token-refresh`).
- **pg_cron:** recrio os jobs que hoje disparam webhooks internos.

### 5. Secrets — te oriento a criar cada um
Lista completa que você vai precisar cadastrar no **seu Supabase → Edge Functions → Secrets**:

| Secret | Onde obter |
|---|---|
| `ASAAS_API_KEY` | Painel Asaas → Integrações → API |
| `ASAAS_WEBHOOK_TOKEN` | Você gera (ex.: `openssl rand -hex 32`) e cola no webhook do Asaas |
| `BLING_CLIENT_ID` / `BLING_CLIENT_SECRET` | Bling → Integrações → API v3 |
| `GHL_API_KEY` / `GHL_LOCATION_ID` | GoHighLevel → Settings → API |
| `MELHOR_ENVIO_TOKEN` | Melhor Envio → Tokens |
| `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ZONE_ID` | Cloudflare → My Profile → API Tokens |
| `XAI_API_KEY` | console.x.ai |
| `LOVABLE_API_KEY` | Não é mais possível — precisa trocar por **OpenAI/Anthropic/xAI direto**. Recomendo xAI (já tem). |
| `WHATSAPP_WEBHOOK_SECRET` / `EVOLUTION_API_URL` / `EVOLUTION_API_KEY` | Sua instância Evolution API |
| `CRON_SECRET` | Você gera aleatório |

Envio guia passo-a-passo de cada um, com screenshots do que procurar.

### 6. Adaptar o frontend para o novo Supabase
- Editar `.env` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` do **seu projeto**.
- Substituir `src/integrations/supabase/client.ts` (hoje é auto-gerado pelo Lovable) por um arquivo comum.
- Rodar `supabase gen types typescript` apontando pro seu projeto → substitui `src/integrations/supabase/types.ts`.
- Testes locais com `bun dev` antes de subir.

### 7. Build e deploy no servidor Verse
- `bun run build` → gera `dist/` estático.
- Subir `dist/` no servidor via SCP/rsync.
- Configurar **nginx** com:
  - `try_files $uri /index.html;` (SPA fallback — senão as rotas quebram no refresh).
  - HTTPS via Let's Encrypt (`certbot`).
  - Headers de cache para assets.
- Apontar seu domínio (`d7pharmabrazil.com.br`) para o IP do Verse.

### 8. Migração de webhooks externos (você reconfigura nos provedores)
Depois que edge functions estiverem no seu Supabase, atualizar URLs em:
- Asaas → webhook payment
- Bling → OAuth redirect
- Evolution API → webhook messages
- GHL → webhooks
- Cloudflare → nada muda (é chamado *pelo* backend)

### 9. Validação final
- Checklist de rotas: home, checkout (todas variantes ck=1/2/3), admin login, WhatsApp broadcasts, criação de pedido → webhook Asaas → comissão.
- Comparar contagem de registros antes/depois em cada tabela crítica.
- Testar refresh em `/admin` (deep link).

---

## ⚠️ Pontos de atenção

1. **Free tier do Supabase tem limites**: 500 MB banco, 1 GB storage, 2 GB egress/mês, edge functions pausam após 7 dias sem uso. Se o projeto crescer, vai precisar upgrade ($25/mês).
2. **Sem `LOVABLE_API_KEY`**: as funções de IA (kb-crawl, product-qa, agentes) precisam ser adaptadas para xAI/OpenAI direto. Custo extra.
3. **pg_cron precisa ser configurado manualmente** no seu Supabase (extensão + jobs).
4. **Você perde**: preview instantâneo do Lovable, deploy 1-clique, badge, share preview. O código continua editável aqui, mas cada mudança vira `git push` + rebuild manual no Verse.
5. **Tempo estimado**: 4–8 horas de trabalho meu + você executando as tarefas de painel (Supabase, DNS, secrets, nginx).

---

## Ordem de execução recomendada

```text
Você faz:                          Eu faço:
─────────────────────────         ─────────────────────────
1. Criar projeto Supabase
2. Export do Lovable Cloud
                                   3. Script de migração storage
                                   4. Adaptar edge functions
5. Cadastrar secrets (guiado)
                                   6. Ajustar frontend (.env, types)
                                   7. Testar local
8. Configurar nginx no Verse
9. Apontar DNS
                                   10. Validar checklist final
```

Confirma que quer seguir por esse caminho? Se sim, começo pela **Etapa 3** (script de migração de storage) enquanto você abre o painel do seu Supabase e me passa a URL + anon key do projeto novo.
