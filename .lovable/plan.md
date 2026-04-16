

## Fix: cadastro de prescritor (`/cadastrar`) sem tenant_id

### Diagnóstico

A Edge Function `register-prescriber` retorna `success: true`, mas insere os registros em `doctors` e `coupons` com `tenant_id = NULL`. Resultado:
- O prescritor não aparece em nenhum painel admin (filtros RLS por `tenant_id`).
- O cupom gerado não funciona em checkout (não pertence ao tenant).
- Da perspectiva do admin/usuário, o cadastro "deu erro" porque desaparece.

Confirmado em teste real:
```
psql> SELECT id, email, tenant_id FROM doctors WHERE email = 'teste-...';
→ tenant_id = NULL
```

A função `create-prescriber-signup` (passo 2, criar usuário) também não atribui `tenant_id` ao registro de `user_roles` nem garante vínculo com o tenant.

### Correção

**1. `supabase/functions/register-prescriber/index.ts`**
- Aceitar `tenant_id` no body (obrigatório).
- Fallback: resolver via hostname (`req.headers.get("origin")` → consulta `tenants` por `domain`/`subdomain`).
- Inserir `tenant_id` em `doctors` E em `coupons`.
- Verificar email duplicado **escopado ao tenant** (`.eq("email", email).eq("tenant_id", tenantId)`).
- Validar que `representative_id` pertence ao mesmo tenant antes de inserir.

**2. `src/pages/PrescriberSignupPage.tsx`**
- Importar `useTenant()` e enviar `tenant_id: tenantId` no body de `register-prescriber`.
- Enviar também `tenant_id` na chamada `create-prescriber-signup`.

**3. `supabase/functions/create-prescriber-signup/index.ts`**
- Aceitar `tenant_id` no body.
- Buscar doctor com `.eq("email", email).eq("tenant_id", tenant_id)` para evitar colisão entre tenants.
- Inserir em `tenant_users` (vincular novo user ao tenant) além de `user_roles`.

### Arquivos modificados
- `supabase/functions/register-prescriber/index.ts`
- `supabase/functions/create-prescriber-signup/index.ts`
- `src/pages/PrescriberSignupPage.tsx`

