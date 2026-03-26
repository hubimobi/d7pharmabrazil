

## Adicionar Crop e Remoção de Fundo na Imagem Principal do Produto

### O que será feito

Adicionar dois botões ao lado do upload da imagem destaque do produto no admin: **Recortar (Crop)** e **Remover Fundo**, usando os mesmos componentes já existentes (`CropImageDialog` e edge function `remove-background`).

### Plano

#### 1. `src/pages/admin/ProductsPage.tsx`
- Importar `CropImageDialog` e ícones `Crop`, `ImageMinus`, `Loader2`
- Adicionar states: `cropOpen`, `cropImageUrl`, `removingBg`
- Após selecionar a imagem, mostrar preview com botões de **Crop** e **Remover Fundo**
- Crop: abre `CropImageDialog`, ao aplicar gera novo `File` a partir do blob e atualiza `imageFile`
- Remover Fundo: se a imagem já tem URL (edição), usa direto; se é arquivo novo, cria object URL temporário, faz upload temporário ao storage, chama edge function `remove-background`, converte resultado base64 em `File` e atualiza `imageFile`
- Mostrar preview da imagem selecionada (thumbnail) na seção de imagem destaque

### Arquivo alterado

| Arquivo | Mudança |
|---|---|
| `src/pages/admin/ProductsPage.tsx` | Botões crop + remover fundo na imagem destaque, preview da imagem |

