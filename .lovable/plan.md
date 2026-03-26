

## Melhorar Responsividade Mobile do Painel Admin

### Problemas Identificados

1. **Tabelas sem scroll horizontal** — OrdersPage (9 colunas), CustomersPage, ProductsPage, CouponsPage, DoctorsPage, RepresentativesPage, CommissionsPage, RecoveryPage usam `<Table>` dentro de `<Card>` sem `overflow-x-auto`, causando overflow no mobile
2. **Botões de ação no header das páginas** — vários usam `flex` sem wrap adequado, botões ficam cortados
3. **Colunas desnecessárias no mobile** — ex: "Fatura Asaas", "Pedido Bling" na OrdersPage podem ser escondidas em telas pequenas
4. **Dialogs muito largos** — vários `DialogContent` não limitam largura no mobile

### Plano de Implementação

#### 1. Wrapper de scroll horizontal em todas as tabelas admin
Adicionar `<div className="overflow-x-auto">` ao redor de cada `<Table>` nas seguintes páginas:
- `OrdersPage.tsx`
- `CustomersPage.tsx`
- `ProductsPage.tsx`
- `CouponsPage.tsx`
- `DoctorsPage.tsx`
- `RepresentativesPage.tsx`
- `CommissionsPage.tsx`
- `RecoveryPage.tsx`

#### 2. Esconder colunas secundárias no mobile
Em `OrdersPage.tsx`: adicionar `className="hidden md:table-cell"` nas colunas "Fatura Asaas", "Pedido Bling", "Cupom" (TableHead + TableCell), e ajustar `colSpan` dos estados vazios

Em `CustomersPage.tsx`: esconder "Última Compra" no mobile

Em `CouponsPage.tsx`: esconder colunas de datas no mobile

#### 3. Botões responsivos nas headers
Em páginas com múltiplos botões no header (OrdersPage, ProductsPage): usar `flex-wrap` e reduzir texto dos botões no mobile com `hidden sm:inline`

#### 4. Cards de stats responsivos
Garantir que grids de stats cards usem `grid-cols-2` como mínimo (já funciona na maioria)

### Arquivos Modificados
- `src/pages/admin/OrdersPage.tsx`
- `src/pages/admin/CustomersPage.tsx`
- `src/pages/admin/ProductsPage.tsx`
- `src/pages/admin/CouponsPage.tsx`
- `src/pages/admin/DoctorsPage.tsx`
- `src/pages/admin/RepresentativesPage.tsx`
- `src/pages/admin/CommissionsPage.tsx`
- `src/pages/admin/RecoveryPage.tsx`

Sem mudanças de banco de dados — apenas CSS/classes Tailwind.

