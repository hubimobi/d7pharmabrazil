

## Plano — Fase 2, Etapa #8: Branding Dinâmico por Tenant

### Problema
Hoje `index.html` tem `<title>`, favicon e OG image **estáticos do D7Pharma**. Toda loja nova aparece como "D7Pharma" no Google, WhatsApp share, Facebook e aba do navegador. Isso quebra a experiência multi-tenant.

### O que vou fazer

**1. `DynamicBranding.tsx` (novo componente client-side)**
- Lê `useStoreSettings()` (já tem `store_name`, `favicon_url`, `logo_url`).
- Atualiza dinamicamente:
  - `document.title` base (substitui "D7 Pharma Brazil")
  - `<link rel="icon">` para `favicon_url` do tenant
  - `<meta name="theme-color">` com `design_bg_color`
  - `<meta name="apple-mobile-web-app-title">` com `store_name`
- Montado uma vez no `App.tsx` (singleton, igual `DesignTokenApplier`).

**2. Refatorar `SEOHead.tsx`**
- Hoje hardcoded: `${title} | D7 Pharma Brazil`.
- Trocar por `${title} | ${storeName}` lendo de `useStoreSettings()`.
- Default OG image: usa `logo_url` do tenant se `image` prop não passada.
- Default `og:site_name` = `store_name`.

**3. Adicionar campos SEO globais em `store_settings`** (migration)
- `seo_default_title text` (ex: "Suplementos de Alta Performance")
- `seo_default_description text`
- `seo_default_og_image text`
- `seo_keywords text`
- Usados como fallback em todas as páginas sem SEO específico.

**4. UI em `StoreSettingsPage.tsx`** — nova aba "SEO & Branding"
- Inputs para os 4 campos acima + preview de como aparece no Google/WhatsApp.
- Upload de OG image (usa `tenantPath` já criado em #6).

**5. Edge Function `seo-meta` (opcional, não nesta etapa)**
- Pre-render de `<meta>` por hostname para crawlers que não executam JS (Facebook, WhatsApp).
- Fica para etapa #8b se você quiser depois — bots modernos do Google/WhatsApp já executam JS suficiente pro client-side funcionar em 90% dos casos.

**6. Atualizar `index.html`**
- Trocar título estático por placeholder neutro ("Carregando…") — JS substitui em <500ms.
- Remover OG image hardcoded do D7Pharma (vira fallback genérico).
- Manter favicon `.ico` default só como fallback antes do JS rodar.

### Arquivos
- **Novo**: `src/components/DynamicBranding.tsx`
- **Editar**: `src/App.tsx` (montar `DynamicBranding`), `src/components/SEOHead.tsx`, `src/pages/admin/StoreSettingsPage.tsx`, `src/hooks/useStoreSettings.tsx` (tipos novos), `index.html`
- **Migration**: adicionar 4 colunas SEO em `store_settings`

### Escopo
**Apenas client-side branding (#8a).** Pre-render server-side (#8b via edge function) fica pra depois — só precisa se você notar problemas reais de share em WhatsApp/FB com lojas novas.

Confirma?

