

## Plano: Sistema Completo de Tracking e Funil de Conversão

### Problema Atual

O site hoje só dispara `PageView` genérico no Meta Pixel e GTM. Não rastreia nenhum evento de funil (ViewContent, AddToCart, InitiateCheckout, Purchase). UTMs da URL não são capturadas nem persistidas. Não há rastreamento de navegação pós-compra nem de retorno ao site.

### Arquitetura da Solução

```text
┌──────────────────────────────────────────────────────────────┐
│                    src/lib/tracking.ts                        │
│         Helper centralizado - dispara para TODOS os canais   │
│    Meta Pixel (fbq) + GTM (dataLayer) + GA4 (gtag)          │
│    + Banco de Dados (tabela visitor_events)                   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  trackPageView(url, params)     → cada navegação + UTMs      │
│  trackViewContent(product)      → página de produto          │
│  trackAddToCart(product, qty)   → adicionar ao carrinho      │
│  trackInitiateCheckout(items)   → entrar no checkout         │
│  trackAddPaymentInfo(method)    → selecionar pagamento       │
│  trackPurchase(order)           → venda confirmada           │
│  trackCustomEvent(name, data)   → eventos genéricos          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### O que será implementado

#### 1. Helper centralizado de tracking (`src/lib/tracking.ts`)
- Funções tipadas para todos os eventos do funil
- Dispara simultaneamente para Meta Pixel, GTM/dataLayer e GA4
- Gera e persiste um `visitor_id` anônimo (UUID em localStorage)
- Captura e persiste UTMs da URL (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`) em `sessionStorage`
- Grava eventos no banco de dados (`visitor_events`) para análise interna

#### 2. Tabela `visitor_events` (migration)
- Colunas: `id`, `visitor_id`, `session_id`, `event_name`, `event_data` (jsonb), `page_url`, `referrer`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `link_ref_code`, `created_at`
- RLS: INSERT público (anon+authenticated), SELECT apenas admin
- Permite rastrear todo o funil internamente sem depender de ferramentas externas

#### 3. Captura automática de UTMs (`src/hooks/useUTMCapture.ts`)
- Hook montado no App.tsx que lê UTMs da URL no primeiro carregamento
- Persiste em `sessionStorage` para todas as páginas da sessão
- Passa UTMs para todos os eventos disparados pelo tracking helper

#### 4. Eventos em cada ponto do funil

| Ponto | Arquivo | Evento Meta Pixel | Evento GA4/GTM | DB |
|---|---|---|---|---|
| Qualquer página | App.tsx (hook) | PageView (já existe) | page_view | `page_view` |
| Página de produto | ProductDetail.tsx | ViewContent | view_item | `view_content` |
| Adicionar ao carrinho | useCart.tsx | AddToCart | add_to_cart | `add_to_cart` |
| Iniciar checkout | CheckoutPage/V2/V3 | InitiateCheckout | begin_checkout | `initiate_checkout` |
| Selecionar pagamento | CheckoutPage/V2/V3 | AddPaymentInfo | add_payment_info | `add_payment_info` |
| Compra confirmada | OrderConfirmationPage + PixPaymentResult | Purchase | purchase | `purchase` |

#### 5. Tracking de navegação pós-compra e retorno
- Após `purchase`, marcar o `visitor_id` com flag `has_purchased` em `sessionStorage`
- Todas as `page_view` subsequentes incluem `post_purchase: true` nos dados
- Quando o visitante retorna (nova sessão), o `visitor_id` persistido em `localStorage` permite correlacionar

#### 6. Tracking de campanhas WhatsApp/Links
- Os Smart Links já gravam `link_ref_code` — será incluído em TODOS os eventos subsequentes da sessão
- UTMs dos links serão capturadas automaticamente pelo hook
- No banco, será possível filtrar: `WHERE utm_source = 'whatsapp' AND event_name = 'purchase'` para ver conversão de campanhas

#### 7. Preparação para mapa de calor
- Hotjar já está implementado e carregando via TrackingScripts.tsx
- Adicionar identificação do visitante via `hj('identify', visitorId, { ... })` após carregar o script
- Permite segmentar sessões no Hotjar por visitante

#### 8. Proteção contra duplicatas
- Evento `Purchase` usa `sessionStorage` com `orderId` para não disparar duas vezes
- Verificação de `document.getElementById` já existe para scripts

### Arquivos a criar/modificar

| Arquivo | Ação |
|---|---|
| `src/lib/tracking.ts` | **Criar** — helper centralizado |
| `src/hooks/useUTMCapture.ts` | **Criar** — captura UTMs + page_view |
| `src/App.tsx` | **Modificar** — adicionar hook useUTMCapture |
| `src/pages/ProductDetail.tsx` | **Modificar** — trackViewContent |
| `src/hooks/useCart.tsx` | **Modificar** — trackAddToCart no addItem |
| `src/pages/CheckoutPage.tsx` | **Modificar** — trackInitiateCheckout + trackAddPaymentInfo |
| `src/pages/CheckoutPageV2.tsx` | **Modificar** — idem |
| `src/pages/CheckoutPageV3.tsx` | **Modificar** — idem |
| `src/pages/OrderConfirmationPage.tsx` | **Modificar** — trackPurchase |
| `src/components/checkout/PixPaymentResult.tsx` | **Modificar** — trackPurchase on confirmed |
| `src/components/TrackingScripts.tsx` | **Modificar** — Hotjar identify |
| Migration SQL | **Criar** — tabela `visitor_events` |

### Resultado Final

- Todo o funil de compra trackeado em Meta Pixel, GA4/GTM e banco interno
- UTMs capturadas e persistidas em todos os eventos
- Campanhas de WhatsApp e Links rastreáveis de ponta a ponta
- Navegação pós-compra e retorno do visitante correlacionáveis
- Hotjar preparado com identificação de visitante para mapas de calor
- Dados internos permitem análise por IA ou regras automáticas sem depender de ferramentas externas

