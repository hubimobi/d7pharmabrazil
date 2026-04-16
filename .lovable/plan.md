

## Ajustes Visuais e Funcionais no WhatsAppFlowEditor

### 1. Largura adaptativa dos blocos
- Atualmente blocos têm largura fixa (`w-64` / 256px). Mudar para `min-w-[280px] max-w-[360px]` com `w-fit` para acomodar conteúdo.
- Conteúdo longo (templates, prompts) usa `line-clamp-3` com `whitespace-pre-wrap`.

### 2. Bloco Mensagem tipo Link — usar padrão existente
Reutilizar exatamente o componente `CopyLinkButton` / dialog "Link Personalizado" (imagem 1) que já existe em `src/pages/admin/ProductsPage.tsx`:
- Selecionar **Produto** (dropdown com produtos ativos via `useProducts`)
- Selecionar **Prescritor** (cupom automático) — opcional
- Selecionar **Versão do Checkout** (Padrão / v1 / v2 / v3)
- Gera URL no formato: `{origin}/produto/{slug}?cupom={code}&ck={version}`
- Salva em `data.link_config = { product_id, doctor_id, checkout_version }` e `data.link_url` resolvido
- Remover campos manuais antigos de link customizado

### 3. Condição "qualquer resposta" — esconder lista de palavras
Quando `condition_type === "any_response"`:
- Ocultar completamente o array `options` (palavras-chave por linha)
- Mostrar apenas uma saída única "Qualquer resposta" + saída "Sem resposta (timeout)"
- Quando `condition_type === "keywords"`, manter UI atual de múltiplas linhas

### 4. Visual estilo ManyChat (imagem 2)
Refinar cards dos nós:
- **Header colorido** com ícone + tipo + nome da plataforma ("WhatsApp" em cinza pequeno acima do tipo)
- **Body branco** com preview rico do conteúdo (bolhas de mensagem para `message`, botões para `choice`, etc.)
- **Sombra sutil** `shadow-md` + borda fina `border-2` colorida pelo tipo
- **Handles de saída** como círculos pretos pequenos (8px) na borda direita, com label "Next Step" / nome da opção
- **Múltiplos handles** para `choice` e `condition` — um por opção, alinhados verticalmente com a opção correspondente
- **Hover state** com ring colorido
- Footer mostra contagem de saídas e botão "+" para conectar

### Arquivos modificados
- `src/components/admin/WhatsAppFlowEditor.tsx`

### Detalhes técnicos
```typescript
// Link config reaproveitado
data.link_config = {
  product_id: string;
  doctor_id?: string;
  checkout_version?: "default" | "1" | "2" | "3";
}
// URL resolvida em runtime via products + doctors loaded

// Condition simplificado quando any_response
{condition_type === "keywords" && (
  <KeywordsEditor options={data.options} />
)}

// Card visual ManyChat-style
<div className="bg-white rounded-xl shadow-md border-2 min-w-[280px] max-w-[360px] w-fit">
  <div className={`${meta.bg} px-3 py-2 rounded-t-xl flex items-center gap-2`}>
    <Icon /> <div><p className="text-[10px] text-muted">WhatsApp</p><p className="font-semibold text-sm">{meta.label}</p></div>
  </div>
  <div className="p-3 bg-white">{preview}</div>
  <div className="border-t px-3 py-2 flex justify-between text-xs">
    {outputs.map(o => <Handle label={o.label} />)}
  </div>
</div>
```

