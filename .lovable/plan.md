

## Plano: Cashback Avançado + Gestão de Usuários Multi-tenant

Este é um projeto grande com 3 blocos principais. Vou detalhar cada um.

---

### Bloco 1 — Cashback com Comissões de Prescritores e Pagamentos

**O que muda na página Cashback (`CommissionsPage.tsx`):**

- Adicionar tabs: "Por Representante" e "Por Prescritor" para visualizar comissões agrupadas
- Filtro por prescritor individual (dropdown com lista de prescritores)
- Botão "Gerar Pagamentos" que abre tela de conferência:
  - Baseia-se no **mês anterior** (não o vigente)
  - Considera apenas pedidos com status `paid` (exclui cancelados/devolvidos)
  - Lista cada prescritor com valor total, permite aprovar individualmente ou todos
  - Envia ordem de pagamento via Edge Function `pay-commissions` (já existe, adaptar para prescritores também)
- Apenas usuários com role **FINANCEIRO** podem ver/usar o botão de pagamento

**Edge Function `pay-commissions`:**
- Adaptar para aceitar `type: "representative" | "prescriber"` e `pix` do prescritor (campo já existe na tabela `doctors`)

---

### Bloco 2 — Nova Hierarquia de Roles

**Migração de banco de dados:**

```sql
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'suporte';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'administrador';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'gestor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'financeiro';
```

Hierarquia: `SUPER ADMIN > SUPORTE > ADMINISTRADOR > GESTOR > FINANCEIRO > REPRESENTANTE > PRESCRITOR`

**Nova tabela `tenants` (multi-tenant):**

```sql
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  settings JSONB DEFAULT '{}'
);
```

**Nova tabela `tenant_users`:**

```sql
CREATE TABLE public.tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);
```

- Adicionar coluna `tenant_id` nas tabelas principais: `orders`, `products`, `doctors`, `representatives`, `commissions`, `store_settings`, etc.
- RLS policies com `tenant_id` para isolamento
- SUPER ADMIN bypassa filtro de tenant

**`useAuth.tsx`:**
- Expor `roles` completas, adicionar helpers: `isFinanceiro`, `isSuperAdmin`, `isGestor`, etc.

---

### Bloco 3 — Painel de Cadastro de Usuários

**Nova página `/admin/usuarios` (`UsersPage.tsx`):**

- Listagem de todos os usuários do tenant com suas roles
- Cadastro: nome, email, senha, role (dropdown com hierarquia)
- Edição de role
- Ativação/desativação
- SUPER ADMIN vê todos os tenants e pode trocar entre eles
- Sidebar: novo item "Usuários" na seção Sistema (apenas admin+)

**Nova rota em `App.tsx`:**
```
/admin/usuarios → UsersPage
```

---

### Arquivos modificados

| Arquivo | Ação |
|---|---|
| `supabase/migrations/xxx.sql` | Novos roles, tabelas `tenants`, `tenant_users`, coluna `tenant_id` |
| `src/hooks/useAuth.tsx` | Novos helpers de role |
| `src/pages/admin/CommissionsPage.tsx` | Tabs rep/prescritor, pagamento em lote |
| `supabase/functions/pay-commissions/index.ts` | Suporte a pagamento de prescritores |
| `src/pages/admin/UsersPage.tsx` | **Novo** — CRUD de usuários |
| `supabase/functions/create-tenant-user/index.ts` | **Novo** — criar usuário com role |
| `src/components/admin/AdminSidebar.tsx` | Item "Usuários" |
| `src/App.tsx` | Rota `/admin/usuarios` |

---

### Consideração importante sobre Multi-tenant

Adicionar `tenant_id` a todas as tabelas existentes é uma mudança estrutural significativa. Para evitar quebrar funcionalidades existentes, proponho:

1. **Fase 1 (agora):** Criar tabelas `tenants` e `tenant_users`, novos roles, painel de usuários, e cashback avançado. O `tenant_id` será opcional (nullable) nas tabelas, permitindo migração gradual.
2. **Fase 2 (próxima iteração):** Aplicar RLS por tenant e criar o painel SUPER ADMIN de troca de tenant.

Isso permite usar o sistema imediatamente sem risco de quebra.

