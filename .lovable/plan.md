

## Otimização Mobile, Respiro Visual e Performance — Inspirado no Mercado Livre

### Problemas Identificados

**Respiro / Padding:**
- Container usa `padding: 1rem` (16px) — ok no geral, mas seções internas como `FeaturedCarousel` adicionam `px-8 md:px-12` desnecessário que comprime o conteúdo mobile
- `ProductCard` e grids usam `gap-6` (24px) que ocupa muito espaço no mobile 375px
- Seções como `AllProducts`, `BenefitsSection` usam `py-16` no mobile — muito vertical
- `ProductDetail` fixed top bar (CTA) sobrepõe o header sticky sem spacing

**Mobile UX:**
- Grid de produtos usa `sm:grid-cols-2` — no 375px mostra 1 coluna com cards muito largos
- Carrossel de destaque com `px-8` comprime demais no mobile
- Footer 4 colunas empilha bem mas poderia ter grid 2x2 no mobile
- "Aceitamos" flags no ProductDetail fazem overflow horizontal no mobile
- Benefícios 4 colunas: ok com `sm:grid-cols-2` mas cards poderiam ser mais compactos

**Performance:**
- Framer Motion importado em BenefitsSection e TestimonialsSection para animações simples — overhead desnecessário
- Imagens sem `width`/`height` attributes causam layout shift
- Múltiplos `useStoreSettings()` chamados em cada componente (já cached pelo React Query, ok)
- `HeroSection` importa 12 ícones do Lucide — ok tree-shaked

### Plano de Ajustes

#### 1. Tailwind Container (`tailwind.config.ts`)
- Aumentar padding mobile para `1.25rem` (20px) para mais respiro nas bordas
- Adicionar padding `md: 2rem` para desktop

#### 2. Home — Seções (`Index.tsx` e componentes)
- Reduzir `py-16 md:py-24` para `py-10 md:py-20` nas seções para mobile mais compacto
- `FeaturedCarousel`: remover `px-8 md:px-12`, usar `px-2 md:px-8`
- `AllProducts`: grid `grid-cols-2 lg:grid-cols-3` com `gap-3 md:gap-6` para 2 colunas no mobile
- `BenefitsSection`: `grid-cols-2 lg:grid-cols-4` com `gap-3 md:gap-6`, padding `p-4 md:p-6`
- `TestimonialsSection`: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` com `gap-4 md:gap-6`
- `GuaranteeSection`: `gap-4 md:gap-6`
- `FinalCTA`: highlights flex-wrap com `gap-3 md:gap-6`

#### 3. ProductCard Mobile-first
- Reduzir padding `p-3 md:p-4`
- Título `text-xs md:text-sm` em grid de 2 colunas
- Botões mais compactos no mobile: `size="xs"` ou menor text
- Ocultar "Compra Rápida" no mobile para simplificar (mantém "Adicionar ao Carrinho")
- Parcelas: esconder no mobile para limpar visual

#### 4. ProductDetail Mobile
- Fixed top bar: adicionar `top-0` com `pt-[60px]` no main para não sobrepor
- "Aceitamos" flags: `flex-wrap` com itens menores no mobile
- Quantity selector inline com botões de compra

#### 5. Footer Mobile
- Grid `grid-cols-2 md:grid-cols-[1.2fr_1fr_1fr_1fr]` para 2 colunas no mobile

#### 6. Performance — Remover Framer Motion overhead
- `BenefitsSection`: substituir `motion.div` por CSS `animate-fade-in` com `IntersectionObserver` leve ou simplesmente classes Tailwind `animate-fade-in`
- `TestimonialsSection`: mesmo — usar CSS animations ao invés de framer-motion
- Adicionar `width`/`height` em imagens de produto para evitar CLS
- Lazy load seções abaixo da dobra com `React.lazy` + `Suspense` (TestimonialsSection, GuaranteeSection, FinalCTA)

#### 7. Skeleton Loading (Mercado Livre style)
- Criar `ProductCardSkeleton` com pulso cinza para estados de loading
- Usar no `AllProducts` e `FeaturedCarousel` durante loading

### Arquivos Modificados
- `tailwind.config.ts` — container padding
- `src/components/ProductCard.tsx` — mobile compact
- `src/components/FeaturedCarousel.tsx` — padding e spacing
- `src/components/AllProducts.tsx` — grid 2 colunas + skeleton
- `src/components/BenefitsSection.tsx` — remover framer-motion, grid mobile
- `src/components/TestimonialsSection.tsx` — remover framer-motion, grid mobile
- `src/components/GuaranteeSection.tsx` — spacing mobile
- `src/components/FinalCTA.tsx` — spacing mobile
- `src/components/Footer.tsx` — grid 2 colunas mobile
- `src/pages/ProductDetail.tsx` — fixed bar spacing, flags wrap
- `src/pages/Index.tsx` — lazy loading seções

Sem mudanças de banco de dados.

