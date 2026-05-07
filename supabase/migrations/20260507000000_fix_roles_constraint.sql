-- Expand the check_tenant_user_roles constraint to include ALL roles used in the app.
-- The original constraint only allowed: super_admin, admin, administrador, suporte,
-- atendente, vendedor, gestor, user.
-- Missing roles that the UsersPage.tsx offers: financeiro, representative, prescriber.
-- Without these, creating users with those profiles would fail with a constraint violation.

-- 1. Drop the old constraint
ALTER TABLE public.tenant_users DROP CONSTRAINT IF EXISTS check_tenant_user_roles;

-- 2. Re-create with the complete set of roles used across frontend + backend
ALTER TABLE public.tenant_users ADD CONSTRAINT check_tenant_user_roles
  CHECK (role IN (
    'super_admin',
    'admin',
    'administrador',
    'suporte',
    'atendente',
    'vendedor',
    'gestor',
    'financeiro',
    'representative',
    'prescriber',
    'user'
  ));
