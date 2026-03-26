

## Revisão Completa das Subpáginas Admin — Padronização e Melhorias

### Inconsistências Encontradas

#### 1. Padrão de Header
- **DashboardPage**: usa `<h2>` + `<p>` subtítulo
- **OrdersPage**: usa `<h1>` sem subtítulo
- **CustomersPage**: usa `<h1>` sem subtítulo
- **CommissionsPage**: usa `<h2>` sem subtítulo
- **RecoveryPage**: usa `<h2>` + `<p>` subtítulo
- **CouponsPage**: usa `<h2>` + `<p>` subtítulo
- **DoctorsPage**: usa `<h2>` sem subtítulo
- **RepresentativesPage**: usa `<h2>` sem subtítulo
- **ReportsPage**: usa `<h2>` sem subtítulo
- **LeadsPage**: usa `<h1>` com ícone
- **PopupsPage**: usa `<h1>` com ícone
- **PagesPage**: usa `<h1>` com ícone

**Problema**: mix de `h1`/`h2`, algumas com ícone, algumas com subtítulo, sem padrão.

#### 2. Cards de Stats
- **DashboardPage**: estilo Lunoz (ícone bg arredondado, trend badge, ícone transparente no fundo)
- **OrdersPage**: estilo simples (ícone + texto lado a lado)
- **CustomersPage**: estilo simples (ícone + texto)
- **CommissionsPage**: usa `CardHeader` + `CardTitle` (padrão diferente dos demais)
- **RecoveryPage**: ícone em `rounded-lg` com bg colorido (mais moderno, mas diferente do Lunoz)

**Problema**: 4 estilos diferentes de cards de métricas.

#### 3. Tabela do LeadsPage
- Usa `<table>` nativa em vez do componente `<Table>` do shadcn como todas as outras páginas.

#### 4. Toast inconsistente
- Algumas páginas usam `toast` do sonner (`import { toast } from "sonner"`)
- Outras usam `useToast` do hook (`import { useToast } from "@/hooks/use-toast"`)

#### 5. Loading States
- **LeadsPage/PopupsPage/PagesPage**: full-page spinner centralizado
- **Tabelas**: texto "Carregando..." dentro da célula da tabela
- Sem consistência

### Plano de Implementação

#### 1. Padronizar Headers (todas as 12 páginas)
Todas as páginas terão o mesmo formato:
```
<h2 className="text-2xl font-bold">Título</h2>
<p className="text-sm text-muted-foreground mt-1">Subtítulo descritivo</p>
```
Sem ícones no título (o breadcrumb no AdminLayout já indica a seção). Adicionar subtítulos descritivos onde faltam.

#### 2. Padronizar Cards de Stats no estilo Lunoz
Aplicar o mesmo design do DashboardPage (ícone com bg colorido + label uppercase + trend badge + ícone transparente de fundo) em:
- **OrdersPage** (4 cards)
- **CustomersPage** (3 cards)
- **CommissionsPage** (2 cards → converter de CardHeader para o novo padrão)
- **RecoveryPage** (3 cards → já parecido, ajustar para match exato)

#### 3. Converter LeadsPage para usar componente `<Table>`
Substituir `<table>` nativo por `<Table>`, `<TableHeader>`, `<TableBody>`, `<TableRow>`, `<TableHead>`, `<TableCell>` do shadcn, com `overflow-x-auto` e colunas hidden no mobile.

#### 4. Padronizar toast
Converter todas as páginas que usam `useToast` para usar `toast` do sonner (mais simples, sem hook). Páginas afetadas:
- DoctorsPage
- RepresentativesPage
- RecoveryPage

#### 5. Padronizar Loading States
Tabelas mantêm "Carregando..." na célula. Páginas sem tabela (PopupsPage, PagesPage) mantêm spinner centralizado. LeadsPage ganha o padrão de tabela.

### Arquivos Modificados
- `src/pages/admin/OrdersPage.tsx` — header + cards Lunoz
- `src/pages/admin/CustomersPage.tsx` — header + cards Lunoz
- `src/pages/admin/CommissionsPage.tsx` — header + cards Lunoz
- `src/pages/admin/RecoveryPage.tsx` — header + cards ajuste fino
- `src/pages/admin/DoctorsPage.tsx` — header + toast sonner
- `src/pages/admin/RepresentativesPage.tsx` — header + toast sonner
- `src/pages/admin/CouponsPage.tsx` — header (já bom)
- `src/pages/admin/ReportsPage.tsx` — header
- `src/pages/admin/LeadsPage.tsx` — header + Table shadcn + remover ícone título
- `src/pages/admin/PopupsPage.tsx` — header padrão (remover ícone)
- `src/pages/admin/PagesPage.tsx` — header padrão (remover ícone)

Sem mudanças de banco de dados ou rotas.

