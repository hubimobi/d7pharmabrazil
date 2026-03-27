

## Melhorar SEO dos Produtos

### Situação Atual
- O `SEOHead` define apenas `title`, `description`, `og:title`, `og:description` e `og:type`
- Na página de produto usa `product.name` como title e `product.shortDescription` como description
- Não há campos SEO customizáveis no cadastro de produto (meta title, meta description, og:image)
- Não há dados estruturados (JSON-LD / Schema.org Product)
- Não há canonical URL na página de produto
- Não há sitemap dinâmico

### Plano

#### 1. Adicionar campos SEO na tabela `products`
Migração para adicionar 3 colunas:
- `seo_title` (text, nullable) — título customizado para SEO
- `seo_description` (text, nullable) — meta description customizada
- `seo_keywords` (text, nullable) — palavras-chave

#### 2. Aba "SEO" no cadastro de produto (`ProductsPage.tsx`)
Nova aba no dialog de edição com:
- Campo "Título SEO" (com contador de caracteres, ideal 50-60)
- Campo "Meta Description" (com contador, ideal 120-160)
- Campo "Palavras-chave" (separadas por vírgula)
- Preview de como aparece no Google (snippet preview)

#### 3. Melhorar `SEOHead.tsx`
Adicionar suporte a:
- `og:image` (imagem do produto)
- `og:url` (canonical)
- `twitter:card` = `summary_large_image`
- `twitter:image`
- Keywords meta tag
- Canonical link automático

#### 4. JSON-LD Schema.org na página de produto (`ProductDetail.tsx`)
Inserir dados estruturados `Product` com:
- `name`, `description`, `image`, `sku`, `brand`
- `offers` (price, currency, availability)
- `aggregateRating` (rating, reviewCount)
- Isso melhora rich snippets no Google (estrelas, preço)

#### 5. Sitemap dinâmico (Edge Function)
Criar `sitemap-xml` edge function que gera `/sitemap.xml` com:
- Páginas estáticas (home, produtos, políticas)
- Todas as páginas de produto ativas (`/produto/{slug}`)
- Atualizado automaticamente com `lastmod`

### Detalhes Técnicos

**Arquivos modificados:**
- `supabase/migrations/` — nova migração (3 colunas SEO)
- `src/pages/admin/ProductsPage.tsx` — aba SEO com campos e preview
- `src/components/SEOHead.tsx` — props expandidas (image, keywords, url, twitter)
- `src/pages/ProductDetail.tsx` — JSON-LD + passar og:image + canonical
- `supabase/functions/sitemap-xml/index.ts` — nova edge function
- `public/robots.txt` — adicionar referência ao sitemap

Sem alterações em rotas ou autenticação.

