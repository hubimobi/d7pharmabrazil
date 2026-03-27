

## Reajuste de Fontes e Tipografia — Padrões E-commerce 2026

### Contexto: Tendencias Tipograficas 2026

Os principais e-commerces (Shopee, Amazon, Mercado Livre, Shein) seguem estas convenções:

```text
Mobile-first type scale (2026):
─────────────────────────────────
Elemento              Mobile    Desktop
─────────────────────────────────
Body text             14px      15-16px
Small/secondary       12px      13px
Micro labels          11px      11-12px
Product title (card)  14px      15px
Product price         18px      20px
Section headings      22-24px   28-32px
Hero headline         28-32px   40-48px
Buttons               14-15px   15px
Nav links             14px      15px
Footer text           13px      14px
─────────────────────────────────
```

Regras-chave:
- **Minimo absoluto: 11px** (nada abaixo disso, eliminar text-[9px] e text-[10px])
- **Body base: 14px mobile / 16px desktop** (usar `text-sm` como minimo util)
- **Line-height generoso**: 1.5-1.6 para body, 1.2-1.3 para headings
- **Font-weight**: usar 400 para body, 500 para labels, 600-700 para headings e precos

### Problemas Atuais

1. **text-[9px]** em CountdownTimer (ilegivel no mobile)
2. **text-[10px]** em: ProductCard (parcelas, stock alert), Header (cart badge), AdminSidebar, DashboardPage badges, CartRecommendations
3. **text-[11px]** em: RecentPurchasePopup, admin stat cards (OrdersPage, CommissionsPage, DashboardPage)
4. **text-xs (12px)** usado excessivamente para conteudo que deveria ser 13-14px (descricoes de produto, ratings, footer links, header nav phone)
5. **Sem escala responsiva** — fontes iguais no mobile e desktop em muitos componentes
6. **Body base** definido como `text-base` (16px) mas quase tudo usa `text-xs` ou `text-sm`, criando hierarquia fraca

### Plano de Ajustes

#### 1. CSS Base (`src/index.css`)
- Definir `font-size: 15px` no body para mobile, `16px` para desktop via media query
- Melhorar line-height base para `1.6`
- Adicionar classe utilitaria `.text-2xs` para os raros casos que precisam 11px

#### 2. ProductCard (`src/components/ProductCard.tsx`)
- Parcelas: `text-[10px]` → `text-xs` (12px)
- Stock alert: `text-[10px]` → `text-[11px]`
- Rating/reviews: `text-xs` → `text-xs` (manter, ok a 12px)
- Product name: `text-sm` → `text-sm md:text-base` (14→16 desktop)
- Price: `text-lg` → `text-lg md:text-xl` (18→20 desktop)
- Short description: `text-xs` → `text-[13px]`

#### 3. Header (`src/components/Header.tsx`)
- Cart badge: `text-[10px]` → `text-[11px]`
- Nav links: `text-sm` → `text-sm md:text-[15px]`
- Phone: `text-xs` → `text-[13px]`

#### 4. Footer (`src/components/Footer.tsx`)
- Links: `text-sm` (14px) → manter (ok)
- Footer bottom: `text-xs` → `text-[13px]`
- Section titles: `text-sm font-semibold` → `text-[15px] font-semibold`

#### 5. CountdownTimer (`src/components/CountdownTimer.tsx`)
- Unit label: `text-[9px]` → `text-[11px]`

#### 6. RecentPurchasePopup (`src/components/RecentPurchasePopup.tsx`)
- Header badge: `text-[11px]` → `text-xs`
- Time label: `text-[11px]` → `text-xs`

#### 7. NotificationBar (`src/components/NotificationBar.tsx`)
- Text: `text-sm` → `text-sm md:text-base` (responsivo)

#### 8. Admin stat cards (DashboardPage, OrdersPage, CommissionsPage)
- Card title: `text-[11px]` → `text-xs`
- Trend badge: `text-[10px]` → `text-[11px]`

#### 9. AdminSidebar (`src/components/admin/AdminSidebar.tsx`)
- Subtitle: `text-[10px]` → `text-[11px]`
- Section labels: `text-[10px]` → `text-[11px]`

#### 10. CheckoutPage e forms
- Labels e inputs ja usam `text-sm`/`text-base` — ok
- Garantir que `text-xs` em helpers suba para `text-[13px]`

#### 11. Sections da Home (Benefits, Testimonials, Guarantee, FinalCTA)
- Section headings: adicionar `md:text-3xl` ou `md:text-4xl` quando so tiver `text-2xl`
- Section descriptions: garantir `text-base md:text-lg`

#### 12. ProductDetail page
- Payment flags: `text-[10px]` → `text-xs`
- Garantir que descricao use `text-sm md:text-base` com `leading-relaxed`

### Resumo de Impacto

- **Eliminar**: todo uso de `text-[9px]` e `text-[10px]` (subir para 11-12px)
- **Reduzir**: uso excessivo de `text-xs` em conteudo de leitura (subir para 13px)
- **Adicionar**: breakpoints responsivos `md:text-*` em headings, precos e body text
- **Melhorar**: line-height base e hierarquia tipografica

### Arquivos Modificados
- `src/index.css`
- `src/components/ProductCard.tsx`
- `src/components/Header.tsx`
- `src/components/Footer.tsx`
- `src/components/CountdownTimer.tsx`
- `src/components/RecentPurchasePopup.tsx`
- `src/components/NotificationBar.tsx`
- `src/components/BenefitsSection.tsx`
- `src/components/TestimonialsSection.tsx`
- `src/components/GuaranteeSection.tsx`
- `src/components/FinalCTA.tsx`
- `src/components/admin/AdminSidebar.tsx`
- `src/pages/admin/DashboardPage.tsx`
- `src/pages/admin/OrdersPage.tsx`
- `src/pages/admin/CommissionsPage.tsx`
- `src/pages/ProductDetail.tsx`
- `src/components/checkout/CartRecommendations.tsx`

Sem mudancas de banco de dados ou rotas.

