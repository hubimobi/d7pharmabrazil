

## Modernização Visual — Inspirado em Airbnb + Mercado Livre

### Filosofia

**Airbnb**: espaço branco generoso, cards sem bordas visíveis (shadow sutil), tipografia limpa, transições suaves, foco total no conteúdo visual.

**Mercado Livre**: hierarquia de preço agressiva, badges de desconto em destaque, frete grátis como elemento visual forte, confiança via selos, compra rápida em 1 clique.

**Objetivo**: mesclar a leveza e elegância do Airbnb com a praticidade e urgência de conversão do Mercado Livre.

---

### Mudanças Propostas

#### 1. Cards de Produto — Estilo Airbnb

**Atual**: borda visível `border-border`, shadow-sm, hover overlay escuro com "Ver Mais"
**Novo**:
- Remover borda visível — usar apenas `shadow-sm` e `hover:shadow-lg` (estilo Airbnb)
- Cantos mais arredondados: `rounded-xl` ao invés de `rounded-lg`
- Hover: ao invés de overlay escuro, apenas escalar a imagem + elevar shadow (mais limpo)
- Badge de desconto: pill verde grande no canto (`-12% OFF`) estilo Mercado Livre
- Preço Pix destacado: adicionar label "no Pix" em verde ao lado do preço principal
- Frete grátis: badge verde "Frete Grátis" abaixo do preço quando aplicável

#### 2. Header — Mais Limpo

**Atual**: borda inferior + backdrop-blur
**Novo**:
- Remover `border-b`, usar apenas shadow sutil `shadow-sm` (Airbnb style)
- Carrinho: mostrar mini-preview do valor total ao lado do ícone
- Search: adicionar campo de busca inline no header (estilo Mercado Livre) — mobile: ícone que expande

#### 3. Seção de Benefícios — Cards Flutuantes

**Atual**: grid de cards com fundo `bg-card` e shadow-sm sobre fundo `bg-muted`
**Novo**:
- Fundo da seção: branco puro (sem `bg-muted`) — menos poluição visual
- Cards: ícone + texto sem borda/fundo, layout horizontal (ícone à esquerda, texto à direita)
- Inspiração Airbnb: limpo, sem caixas dentro de caixas

#### 4. Seção "Todos os Produtos" — Filtro Superior Horizontal

**Atual**: Select dropdown para filtro de grupo
**Novo**:
- Chips/pills horizontais scrolláveis (estilo Airbnb categorias) ao invés de dropdown
- Active chip com fundo `primary`, demais outline
- Sticky abaixo do header no scroll (como filtros do Mercado Livre)

#### 5. CSS Global — Transições e Suavidade

- Adicionar `scroll-behavior: smooth` ao html
- Transições globais em links e botões: `transition-all duration-200`
- Bordas mais suaves: aumentar `--radius` de `0.5rem` para `0.75rem`
- Border color mais sutil: `--border` de `210 20% 90%` para `210 15% 93%` (quase invisível)

#### 6. Footer — Mais Moderno

**Atual**: grid 4 colunas, fundo `bg-card`
**Novo**:
- Fundo escuro (`bg-foreground text-background`) — contraste forte como Mercado Livre
- Links com hover mais suave (opacity transition)
- Selos de segurança visuais (ícones Lock, Shield) na base

#### 7. Seção Garantia e CTA Final — Mais Impactante

**Atual**: gradient trust com ícones em linha
**Novo (Garantia)**:
- Layout com card central grande + número "30" em destaque (dias de garantia)
- Ícone de escudo animado sutilmente

**Novo (CTA Final)**:
- Full-width com gradiente mais vibrante
- Botão CTA maior com animação de hover scale

#### 8. ProductDetail — Galeria Airbnb Style

- Thumbnails na lateral (desktop) com transição suave ao trocar
- Botão "Comprar" fixo no bottom mobile com preço visível (sticky bar)
- Seção de avaliações com estrelas visuais maiores

---

### Detalhes Tecnicos

**Arquivos modificados:**
- `src/index.css` — border radius, scroll-behavior, transições globais, border color
- `src/components/ProductCard.tsx` — cards sem borda, rounded-xl, badge desconto pill, hover limpo
- `src/components/Header.tsx` — shadow ao invés de border-b, campo de busca
- `src/components/BenefitsSection.tsx` — layout horizontal, sem bg-muted
- `src/components/AllProducts.tsx` — chips de filtro ao invés de dropdown
- `src/components/Footer.tsx` — fundo escuro, selos de segurança
- `src/components/GuaranteeSection.tsx` — card central com destaque "30 dias"
- `src/components/FinalCTA.tsx` — botão maior, gradiente mais vibrante
- `src/pages/ProductDetail.tsx` — galeria lateral, sticky buy bar refinada

Sem mudancas de banco de dados ou rotas.

