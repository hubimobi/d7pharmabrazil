

Fase 2 = #5 (isolamento de credenciais) + #6 (storage isolado) + #8 (branding dinâmico). Vou propor implementação fatiada começando pelo mais crítico: **#5**, porque é o único que causa **vazamento de dados entre lojas** (bug grave hoje).

## Plano — Fase 2, Etapa 1: Isolamento de credenciais por tenant (#5)

### Problema atual
Tokens de Bling, TikTok Shop, Asaas, Evolution API, GHL e Cloudflare estão **globais** — toda loja compartilha as mesmas credenciais. Quando a Loja B conectar o Bling dela, vai sobrescrever o token da Loja A (`bling_tokens` não tem `tenant_id`).

### O que vou fazer

**1. Nova tabela `tenant_integrations`** (substitui secrets globais)
```text
tenant_integrations
├── id uuid pk
├── tenant_id uuid (FK tenants, NOT NULL)
├── provider text   ('bling' | 'tiktok_shop' | 'asaas' | 'evolution' | 'ghl' | 'cloudflare')
├── credentials jsonb   (access_token, refresh_token, expires_at, api_key, etc.)
├── active boolean
├── last_used_at timestamptz
├── UNIQUE(tenant_id, provider)
```
- RLS: admin do tenant lê/escreve só do próprio tenant; super_admin vê tudo.
- Trigger `ensure_tenant_id` já existe → reutiliza.

**2. Migrar dados existentes** (sem perder integração atual)
- Copia `bling_tokens` → `tenant_integrations(provider='bling', tenant_id=DEFAULT)`.
- Copia `tiktok_tokens` → idem.
- Copia campos relevantes de `store_settings` (Evolution, Cloudflare, Asaas) → idem por tenant.
- Mantém tabelas antigas por enquanto (backward-compat); deprecar depois.

**3. Helper compartilhado nas Edge Functions**
Criar `supabase/functions/_shared/tenant-credentials.ts` com:
- `resolveTenantId(req)` — extrai do JWT (`tenant_users`) ou body.
- `getTenantCredentials(supabase, tenantId, provider)` — lê/refresca token.
- `saveTenantCredentials(supabase, tenantId, provider, creds)`.

**4. Atualizar Edge Functions críticas** para ler do tenant em vez de globais:
- `bling-callback`, `bling-refresh-token`, `bling-list-products`, `bling-export-product`, `bling-sync-order`
- `tiktok-shop-callback`, `tiktok-shop-sync-products`, `tiktok-shop-sync-orders`
- `asaas-webhook` e `create-payment` → ler `ASAAS_API_KEY` do tenant
- `whatsapp-instance`, `whatsapp-send`, `whatsapp-process-queue` → Evolution por tenant
- `ghl-sync` → API key + location por tenant
- `cloudflare-purge` → token+zone por tenant

**5. Frontend: UI de gerenciamento**
- Atualizar `IntegrationsPage.tsx` para CRUD em `tenant_integrations` em vez de mostrar secrets globais.
- Bling: botão "Conectar" gera state com tenant_id → callback grava no tenant.
- TikTok: idem.
- Asaas/Evolution/GHL/Cloudflare: campos de input por tenant (substituir uso de `store_settings`).

**6. Fallback seguro**
Se um tenant não tiver credencial própria, **NÃO** cair para a global (evita vazamento). Mostrar "Integração não configurada" e bloquear ação.

### Arquivos
- **Migration nova**: tabela `tenant_integrations` + RLS + seed da migração de dados.
- **Novo**: `supabase/functions/_shared/tenant-credentials.ts`
- **Editar**: ~14 Edge Functions listadas acima
- **Editar**: `src/pages/admin/IntegrationsPage.tsx` (refatorar cards de Bling/TikTok/Asaas/Evolution/GHL/Cloudflare)

### Escopo desta etapa
**Apenas #5.** Storage (#6) e branding (#8) ficam pra etapas seguintes — cada uma é grande e independente. Faz sentido shipar #5 sozinho, validar, depois seguir.

### Tamanho
Etapa grande (~14 funções + migration + UI). Posso fatiar ainda mais se preferir:
- **5a**: tabela + helper + Bling+TikTok (os mais críticos, hoje quebrados)
- **5b**: Asaas + Evolution + GHL + Cloudflare
- **5c**: UI completa em `IntegrationsPage`

Recomendo começar por **5a** (resolve o bug mais grave: ERPs cross-tenant). Confirma se quer 5a só ou Fase 5 completa de uma vez.

