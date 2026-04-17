
## Ajustes no Flow Editor

### 1. Confirmar saída sem salvar
- Adicionar `useUnsavedChangesGuard` no `FlowCanvas`.
- Marcar `dirty=true` em qualquer alteração de `name`, `description`, `triggerEvent`, `triggerValue`, `nodes`, `edges`.
- Interceptar o botão **Voltar** e o `beforeunload`: se sujo, abrir `UnsavedChangesDialog` com 3 ações: **Sair sem salvar / Cancelar / Salvar e sair**.

### 2. Trocar emojis por ícones lucide (padrão do sistema)
**No select "Tipo de conteúdo" (linhas 957-963)** — substituir emojis (💬 📋 📎 🎤 🎬 🔗 🛒) por ícones lucide já importados (`MessageSquare`, `FileText`, `Image`, `Mic`, `Video`, `Link2`, `ShoppingBag`) renderizados dentro de cada `SelectItem` com `flex items-center gap-2`.

**No simulador (FlowTestPanel, linhas 270-356)** — trocar prefixos emoji (📋, 📎, 🎤, 🎬, 🛒, 🔗, ⏰, ⏱, 🤖, 👤, 🏷️, ↗️, ⚡, 🏁, ⚠️, 🔀, ⏳, 📝) por componentes JSX com ícone lucide + texto, mudando `messages` para suportar `icon?: LucideIcon`.

### 3. Corrigir "Melhorar copy" (erro 500)
A edge function `improve-message-copy` usa `@supabase/supabase-js@2.45.0` que **não tem `auth.getClaims`** → daí o erro `userClient.auth.getClaims is not a function`.
- Atualizar import para `@supabase/supabase-js@2.58.0` (versão usada nas outras functions com `getClaims`).
- Ajustar para o padrão correto: `await anonClient.auth.getClaims(token)` passando o token extraído (igual a `restore-backup`, `clone-tenant`).

### 4. Padronizar fontes
- Remover `text-[9px]`, `text-[10px]`, `text-[11px]` ad-hoc nos componentes do canvas/simulador → trocar por `text-xs` (12px) padrão do sistema.
- Remover `font-family` inline `Apple Color Emoji…` dos previews de nó (ícones serão lucide). Manter apenas no `MessageComposer` (textarea) e na bolha de mensagem do simulador (onde o usuário ainda pode digitar emoji).
- Garantir que tudo herda `font-sans` do tema (Inter/Space Grotesk).

### 5. Melhorar visual do "Testar Fluxo"
Reformular `FlowTestPanel`:
- Largura 400px com fundo `bg-background` (não slate-900).
- Header limpo com título + ações (Reiniciar, Fechar) usando `Button variant="ghost" size="icon"` padrão.
- Mockup de telefone mais clean: bordas arredondadas suaves, sombra sutil, fundo WhatsApp `#E5DDD5` mantido.
- Header WhatsApp com avatar circular + nome + status "online" em verde.
- Bolhas de mensagem com:
  - Cauda (tail) nos cantos
  - Timestamp sutil em cada bolha
  - Ícones lucide inline (ao invés de emoji) para tipos especiais (Template/Arquivo/Áudio/etc).
- Painel de variáveis colapsável no topo (accordion) — não polui chat.
- Input de resposta estilo WhatsApp com botão circular verde.
- Mensagens de sistema (ex: "Esperando 5min...") em pílulas centralizadas estilo "system message" do WhatsApp (fundo branco translúcido, centralizadas).

### Arquivos modificados
- `src/components/admin/WhatsAppFlowEditor.tsx`
- `supabase/functions/improve-message-copy/index.ts`
