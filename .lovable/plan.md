

## Ajustes no WhatsAppFlowEditor

### 1. Zoom com botão direito + scroll
- Detectar `wheel` event no canvas com `event.buttons === 2` (botão direito segurado) → ajustar `zoom` state.
- Prevenir context menu padrão (`onContextMenu={e => e.preventDefault()}`).
- Range: 0.3x a 2x, step 0.1.
- Zoom centrado na posição do mouse.

### 2. Largura adaptativa real para mensagens
- Trocar `max-w-[360px]` por `max-w-[480px]` no card de mensagem.
- Remover `line-clamp-3` do preview de mensagem texto.
- Usar `whitespace-pre-wrap break-words` para texto fluir naturalmente.
- Container `w-fit` permite expansão até o max.

### 3. Confirmação ao deletar bloco
- Adicionar `AlertDialog` ao clicar no botão lixeira do nó.
- Mensagem: "Tem certeza que deseja excluir este bloco? Esta ação não pode ser desfeita."
- Botões: Cancelar / Excluir (destructive).
- State: `deleteConfirmId: string | null`.

### 4. Bloco "Definir Variável" enriquecido
Adicionar seletor de **fonte da variável** com tipos:
- **Produto**: lista produtos ativos (`useProducts`)
- **Tag**: lista tags de `customer_tags` + presets
- **Representante**: lista de `representatives` ativos
- **Status da compra**: enum (pago, pendente, cancelado, reembolsado, etc.)
- **Estágio recuperação carrinho**: stages do `abandoned_carts` (novo, 1º contato, em negociação, proposta, perdido, convertido)
- **Estágio recompra**: stages do `repurchase_funnel`
- **Cupom**: lista de cupons ativos
- **Perfil comportamental**: presets (Novo, Recorrente, VIP, Inativo, Em recuperação)

Estrutura de dados:
```typescript
data.variables: Array<{
  name: string;                  // nome interno (ex: "produto_interesse")
  source_type: "product" | "tag" | "representative" | "order_status" | "recovery_stage" | "repurchase_stage" | "coupon" | "behavior_profile" | "custom";
  source_value: string;          // id ou valor selecionado
  source_label: string;          // label legível para preview
}>
```

UI: lista de linhas, cada uma com Select (tipo) + Select (valor) + botão remover. Botão "+ Adicionar variável" no rodapé permitindo concatenar múltiplas.

### Arquivo modificado
- `src/components/admin/WhatsAppFlowEditor.tsx`

