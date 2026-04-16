

## Mudanças no WhatsAppFlowEditor

### 1. Menu "próxima etapa" ao clicar em handle/+
- Ao clicar no handle de saída de um nó (ou botão "+"), abre popover lateral categorizado:
  - **Conteúdo**: Mensagem, Pergunta, Escolha
  - **Lógica**: Condição, Espera, IA Gerar, Transferir, Ação, Definir Variável, Fim
- Cria nó à direita (+280px) e edge automaticamente.

### 2. Painel de teste lateral (não dialog)
- Remover `Dialog` do `FlowTestDialog` → renderizar como painel fixo `w-[380px]` à direita do canvas.
- Mockup de celular escuro estilo WhatsApp (igual imagem 2).
- Botão "Testar" no toolbar alterna `testPanelOpen`.

### 3. Preview de template no bloco Mensagem
- Quando `content_type="template"` e `template_id` selecionado, exibir no card do nó:
  - Nome do template (badge)
  - Preview dos primeiros ~80 chars do conteúdo do template
- Buscar templates já carregados (`whatsapp_templates`) para resolver o nome/conteúdo.

### 4. Conexão visual drag-to-connect
- Mouse down no handle de saída → inicia drag, desenha linha SVG temporária seguindo o mouse.
- Mouse up sobre handle de entrada de outro nó → cria edge.
- Mouse up no vazio → abre o menu "próxima etapa" naquela posição (cria nó + edge).
- Cancelar com ESC ou click fora.

### Arquivo modificado
- `src/components/admin/WhatsAppFlowEditor.tsx`

### Detalhes técnicos
- Novo state: `connecting: { sourceId: string; mouseX: number; mouseY: number } | null`
- Novo state: `addNodeMenu: { sourceId: string; x: number; y: number } | null`
- Novo state: `testPanelOpen: boolean` (substitui dialog)
- SVG overlay escuta `mousemove` global enquanto `connecting` ativo
- Layout raiz: `flex` — canvas `flex-1` + painel teste `w-[380px]` condicional

