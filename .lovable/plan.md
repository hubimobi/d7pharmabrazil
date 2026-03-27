

## Plano: Layout Responsivo + Seção de Perguntas com IA

### Bloco 1 — Reorganizar layout do ProductDetail

**Desktop (md+):** Duas colunas lado a lado (já funciona assim). Coluna esquerda = fotos + descrição. Coluna direita = compra + benefícios + frete + FAQ.

**Mobile:** Reordenar para: Fotos → Seção de compra (preço, botões, benefícios, frete, FAQ) → Descrição do produto. Atualmente a descrição fica junto das fotos no mobile.

**Como implementar:**
- Separar a descrição do produto da div de imagens em um bloco próprio
- Usar `order` classes do Tailwind para reordenar no mobile: imagens (`order-1`), compra (`order-2`), descrição (`order-3`)
- No desktop manter o grid de 2 colunas atual

### Bloco 2 — Seção "Perguntas e Respostas" com IA

Abaixo do FAQ, adicionar uma seção conforme a imagem de referência: título "Perguntas e respostas", input de texto + botão "Perguntar" com icone de IA.

**Funcionamento:**
- Criar edge function `product-qa` que recebe a pergunta + dados do produto (nome, descrição, benefícios, FAQs cadastradas)
- Usa Lovable AI (Gemini) para gerar resposta baseada nos dados do produto
- System prompt instruindo a IA a responder APENAS com base nas informações do produto cadastrado
- Resposta renderizada com markdown abaixo do input
- Loading state enquanto processa

**Arquivos:**

| Arquivo | Ação |
|---|---|
| `src/pages/ProductDetail.tsx` | Reorganizar layout + adicionar seção Q&A |
| `src/components/ProductQA.tsx` | Novo componente de perguntas com IA |
| `supabase/functions/product-qa/index.ts` | Nova edge function que chama Lovable AI |

### Detalhes técnicos

- Edge function recebe `{ question, productName, productDescription, benefits, faqs }` e monta um prompt contextual
- Usa `LOVABLE_API_KEY` (já disponível) com modelo `google/gemini-3-flash-preview`
- Não usa streaming (resposta curta, invoke simples)
- Layout mobile usa `flex flex-col` com classes `order-*` para reordenar sem duplicar HTML

