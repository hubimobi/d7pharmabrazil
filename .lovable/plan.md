
## Fix: Emojis e marcadores em templates/mensagens do Flow

### Problemas identificados

1. **Emojis não funcionam no template de mensagem**: Provavelmente o editor/textarea de templates não tem picker de emoji, ou os emojis salvos não renderizam no preview do nó (encoding/CSS).

2. **Editor de mensagem no Flow não tem os marcadores** ({produto}, {nome}, etc.) e nem picker de emoji que existe no editor de templates.

### Investigação necessária

Antes de planejar mudanças concretas, preciso ver:
- Como o editor de templates atual (`TemplatesTab` em `WhatsAppPage.tsx`) implementa o picker de emoji e a inserção de variáveis ({Nome}, {produto}, etc.)
- Como o `WhatsAppFlowEditor` renderiza o painel de propriedades do nó tipo `message` (subtipo `text`)
- Se há algum `font-family` no preview que não suporta emoji

### Plano de correção

**1. Extrair componente reutilizável `MessageComposer`**
Criar `src/components/admin/MessageComposer.tsx` com:
- Textarea para conteúdo
- Toolbar superior com:
  - **Picker de emoji** (usar `emoji-picker-react` ou lista curada de emojis comuns WhatsApp em popover)
  - **Dropdown "Inserir variável"** com os marcadores padrão:
    - `{Nome}`, `{Primeiro_Nome}`, `{telefone}`, `{email}`
    - `{produto}`, `{preco}`, `{link}`, `{cidade}`
    - `{cupom}`, `{desconto}`
    - `{Nome_da_Empresa}`, `{Atendente}`
  - **Spintax helper**: botão que insere `{opção1|opção2|opção3}` no cursor
- Inserção respeita posição do cursor (`selectionStart`)
- Preview renderizado abaixo com emoji e variáveis destacadas

**2. Usar o componente em dois lugares**
- `src/pages/admin/WhatsAppPage.tsx` → `TemplatesTab` (substitui textarea atual)
- `src/components/admin/WhatsAppFlowEditor.tsx` → painel de propriedades do nó `message` subtipo `text` (substitui textarea simples)

**3. Garantir renderização de emoji no preview do nó**
- Adicionar `font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', system-ui, sans-serif` ao preview da bolha de mensagem no canvas.
- Garantir UTF-8 (já está via Vite por padrão, mas verificar se algum `substring` quebra surrogate pairs de emoji).

### Arquivos modificados
- `src/components/admin/MessageComposer.tsx` (novo)
- `src/components/admin/WhatsAppFlowEditor.tsx`
- `src/pages/admin/WhatsAppPage.tsx`
