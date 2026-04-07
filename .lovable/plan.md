
Objetivo: corrigir de forma definitiva o erro em que itens de combo ainda podem ser removidos individualmente no checkout.

1. Causa raiz confirmada
- O bloqueio atual depende de `comboProductIds` no `useCart`.
- Hoje esse estado:
  - não é persistido no `localStorage`
  - só é preenchido no `ComboUpsell`
  - não é preenchido quando o combo é adicionado por `ComboCard` ou `ComboDetail`
- Resultado: ao entrar no checkout por outras origens, ou após recarregar a página, os produtos do combo deixam de ser reconhecidos como combo e voltam a exibir/remover como itens normais.

2. Correção estrutural no carrinho
Vou reestruturar o estado do combo no `useCart` para ele não depender só de memória temporária:
- Persistir também os metadados do combo no storage
- Salvar pelo menos:
  - `comboProductIds`
  - identificador do combo/grupo
  - quantidade do combo, quando aplicável
  - desconto do combo
  - frete grátis do combo
- Na inicialização do carrinho, restaurar esses dados junto com os itens.

3. Corrigir todas as entradas de combo
Vou padronizar a adição de combo em todos os pontos:
- `src/components/checkout/ComboUpsell.tsx`
- `src/components/ComboCard.tsx`
- `src/pages/ComboDetail.tsx`

Em vez de cada tela apenas adicionar produtos e setar desconto isolado, vou usar um fluxo único para:
- registrar quais produtos pertencem ao combo
- registrar o desconto correto
- registrar se o combo concede frete grátis
- manter a consistência ao duplicar/remover o combo

4. Melhorar a modelagem do combo no carrinho
Em vez de só guardar lista solta de IDs, vou tratar combo como um grupo lógico:
```text
comboState
├─ productIds[]
├─ discount
├─ freeShipping
├─ quantity
└─ source/type
```
Isso evita falhas quando:
- o usuário recarrega a página
- entra no checkout por rota diferente
- duplica o combo
- adiciona produto comum junto com combo

5. Ajustar a renderização dos 3 checkouts
Vou revisar:
- `src/pages/CheckoutPage.tsx`
- `src/pages/CheckoutPageV2.tsx`
- `src/pages/CheckoutPageV3.tsx`

Para garantir que:
- itens de combo nunca caiam na lista de “produtos comuns”
- não apareça botão individual de remover para item de combo
- não apareça controle individual de `+ / -` para item de combo
- só existam ações:
  - duplicar combo
  - remover combo inteiro

6. Blindagem extra na lógica
Além do ajuste visual, vou reforçar as regras no hook:
- `removeItem(productId)` continua bloqueando item de combo
- `updateQuantity(productId, qty)` continua bloqueando item de combo
- vou adicionar validações para limpar estado quebrado quando:
  - os IDs do combo não estiverem mais presentes no carrinho
  - parte do combo sumir por inconsistência
- isso evita falsos estados após navegação ou reload.

7. Compatibilidade com combos da vitrine
Hoje há dois tipos de combo no projeto:
- combos reais de `product_combos`
- combo/upsell configurado em `store_settings`

Vou manter compatibilidade com ambos, mas com a mesma estrutura no carrinho, para o checkout não depender de “de onde veio” o combo.

8. Validação que vou fazer após implementar
Vou testar estes cenários:
- adicionar combo pela vitrine e abrir checkout
- adicionar combo pela página de detalhe do combo e abrir checkout
- aceitar combo upsell no checkout
- recarregar a página do checkout com combo no carrinho
- tentar remover 1 item do combo
- tentar alterar quantidade de 1 item do combo
- duplicar combo
- remover combo inteiro
- usar combo junto com produtos avulsos

9. Resultado esperado
Após a correção:
- não será mais possível excluir item individual do combo
- não será mais possível alterar quantidade individual do combo
- o combo continuará protegido mesmo após reload
- o comportamento ficará igual nos 3 modelos de checkout

Detalhes técnicos
- Arquivos principais envolvidos:
  - `src/hooks/useCart.tsx`
  - `src/components/ComboCard.tsx`
  - `src/pages/ComboDetail.tsx`
  - `src/components/checkout/ComboUpsell.tsx`
  - `src/pages/CheckoutPage.tsx`
  - `src/pages/CheckoutPageV2.tsx`
  - `src/pages/CheckoutPageV3.tsx`
- A falha não está só no layout; está no modelo de estado do carrinho.
- A correção correta é centralizar o cadastro e persistência do combo, não apenas esconder botão no checkout.
