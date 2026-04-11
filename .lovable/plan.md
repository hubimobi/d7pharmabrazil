

## Fase 0 — Execução

### Migration SQL (1 migration com todos os passos)

```sql
-- 1. Add role column to tenant_users
ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'admin';

-- 2. Insert default tenant
INSERT INTO tenants (id, name, slug, active, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000000', 'D7 Pharma Brasil', 'main', true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 3. Associate admins to default tenant as super_admin
INSERT INTO tenant_users (user_id, tenant_id, role, created_at)
VALUES 
  ('1387a8df-9aa7-4ba6-b67e-acdff37dfd12', '00000000-0000-0000-0000-000000000000', 'super_admin', now()),
  ('80a6372a-7896-42bc-812a-367714ec9a94', '00000000-0000-0000-0000-000000000000', 'super_admin', now())
ON CONFLICT (tenant_id, user_id) DO NOTHING;

-- 4. Add super_admin role in user_roles
INSERT INTO user_roles (user_id, role)
VALUES 
  ('1387a8df-9aa7-4ba6-b67e-acdff37dfd12', 'super_admin'),
  ('80a6372a-7896-42bc-812a-367714ec9a94', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. Backfill tenant_id in 6 existing tables
UPDATE orders SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE products SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE doctors SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE representatives SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE commissions SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE store_settings SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
```

### Arquivo novo

**`src/constants/tenant.ts`**
```typescript
export const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';
export const SUPERBOSS_ROUTE_PREFIX = '/superboss';
```

### Verificação pós-execução

Retornarei imediatamente os 4 SELECTs:
1. `SELECT * FROM tenants`
2. `SELECT * FROM tenant_users`
3. `SELECT COUNT(*), tenant_id FROM orders GROUP BY tenant_id`
4. `SELECT COUNT(*), tenant_id FROM products GROUP BY tenant_id`

### Impacto
- Zero alteração em código existente
- Dados preservados e vinculados ao tenant principal
- Base pronta para Fase 1

