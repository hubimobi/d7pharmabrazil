

## Modernizar Admin Panel — Inspirado no Lunoz

Baseado na referência do Lunoz, vamos aplicar melhorias visuais mantendo a estrutura funcional existente.

### Mudanças Planejadas

#### 1. Sidebar Dark (`AdminSidebar.tsx`)
- Fundo escuro (slate-900) como no Lunoz, com texto claro
- Logo "D7 Pharma" estilizada no topo com fundo destacado
- Itens agrupados em seções com labels sutis: **Menu**, **Catálogo**, **Marketing**, **Financeiro**, **Sistema**
- Item ativo com fundo highlight (primary) e bordas arredondadas
- Ícones com cor sutil, destaque no hover
- Footer com avatar/iniciais do usuário + email

#### 2. Header Limpo (`AdminLayout.tsx`)
- Fundo branco com sombra sutil (shadow-sm) em vez de border-b
- Breadcrumb à direita mostrando caminho atual (ex: "D7 Pharma > Menu > Dashboard")
- Título da página dinâmico baseado na rota
- Notificações mantidas, com visual mais limpo

#### 3. Dashboard Cards Estilo Lunoz (`DashboardPage.tsx`)
- Cards com borda leve, ícone grande semitransparente no canto direito (como no Lunoz)
- Label em uppercase pequeno (ex: "PEDIDOS"), valor grande abaixo
- Badge de variação colorido (verde +X%, vermelho -X%) — visual estático por enquanto
- Layout 4 colunas responsivo

#### 4. CSS Variables (`index.css`)
- Atualizar sidebar palette: `--sidebar-background` para tom escuro (220 20% 18%), texto claro
- `--sidebar-primary` highlight visível sobre fundo escuro
- `--sidebar-accent` tom intermediário para hover

### Arquivos Modificados
- `src/components/admin/AdminSidebar.tsx` — sidebar dark + agrupamento + logo
- `src/components/admin/AdminLayout.tsx` — header com shadow + breadcrumb
- `src/pages/admin/DashboardPage.tsx` — cards estilo Lunoz
- `src/index.css` — sidebar CSS variables

Sem mudancas de banco ou rotas.

