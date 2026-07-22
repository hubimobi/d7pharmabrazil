# Etapa 6 — Adaptar Frontend

## 6.1 Criar `.env.production` local

Na raiz do projeto (clonado):
```bash
cat > .env.production <<EOF
VITE_SUPABASE_URL=https://SEU_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SEU_ANON_KEY
VITE_SUPABASE_PROJECT_ID=SEU_REF
EOF
```

⚠️ **Não commitar.** Adicione ao `.gitignore` se ainda não estiver.

## 6.2 Substituir o client Supabase

O arquivo `src/integrations/supabase/client.ts` é auto-gerado pelo Lovable. Fora daqui, substitua por:

```typescript
// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const url = import.meta.env.VITE_SUPABASE_URL!;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

if (!url || !key) throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY');

export const supabase = createClient<Database>(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: localStorage,
  },
});
```

## 6.3 Regenerar types.ts

```bash
supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

## 6.4 Testar localmente

```bash
bun install
bun run build
bun run preview   # abre http://localhost:4173
```

Teste:
- Home carrega
- Checkout abre
- Admin login funciona

Se houver erro de tenant, temporariamente force o `tenant_id` no `useTenant.tsx` para o UUID do seu tenant principal (você vai ver no `SELECT id FROM tenants LIMIT 1`).

## 6.5 Ajustar `resolve-tenant`

O `resolve-tenant` compara hostname com `tenant_domains`. Insira o domínio do Verse:

```sql
INSERT INTO public.tenant_domains (tenant_id, domain, verified)
VALUES ('SEU_TENANT_UUID', 'd7pharmabrazil.com.br', true),
       ('SEU_TENANT_UUID', 'www.d7pharmabrazil.com.br', true);
```
