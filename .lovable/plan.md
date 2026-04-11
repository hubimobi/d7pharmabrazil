

# Fase 7 — Restauração de Backups

## Arquivos

| Arquivo | Ação |
|---|---|
| `supabase/functions/restore-backup/index.ts` | Criar |
| `src/pages/superboss/SuperbossBackups.tsx` | Reescrever |

## 7.1 — Edge Function `restore-backup`

Nova função em `supabase/functions/restore-backup/index.ts`:

- CORS + OPTIONS handling (mesmo padrão do clone-tenant)
- Recebe `POST { backup_id }`
- Cria cliente anon com token do caller para validar JWT
- Verifica `super_admin` via query em `tenant_users`
- Busca backup por ID em `tenant_config_backups`
- Extrai `id` (recordId) do `data` JSONB

**Fluxo de restauração (UPDATE-first com fallback INSERT):**
1. Busca estado atual do registro (`SELECT * WHERE id = recordId AND tenant_id`)
2. Se encontrou, salva como `pre_restore` em `tenant_config_backups`
3. Extrai campos restauráveis: remove `id`, `tenant_id`, `created_at`, `updated_at` do backup data
4. Tenta `UPDATE ... SET fieldsToRestore WHERE id = recordId AND tenant_id`
5. Se UPDATE não encontrou registro (count = 0), faz `INSERT` com dados completos do backup como fallback
6. Retorna `{ success, table_name, record_id }`

Usa `service_role` client para as operações de dados (bypass RLS).

## 7.2 — SuperbossBackups.tsx (reescrita completa)

**Backup manual (direto no frontend):**
- Select com tabelas suportadas (store_settings, products, hero_banners, etc. — mesma lista do clone-tenant)
- Campo de notas opcional
- Botão "Criar Backup Manual"
- Busca registros da tabela para o tenant selecionado via `useTenant()`
- Insere cada registro como backup com `backup_type: 'manual'`

**Restauração:**
- Botão "Restaurar" funcional (não mais disabled)
- AlertDialog de confirmação antes de restaurar
- Chama `supabase.functions.invoke("restore-backup", { body: { backup_id } })`
- Toast de sucesso/erro
- Recarrega lista após restauração

**Preview de dados:**
- Coluna com preview truncado do JSON do backup (primeiros 80 chars)
- Tooltip ou expand para ver JSON completo

## 7.3 — Deploy e teste

- Deploy da edge function `restore-backup`
- Build limpo (tsc --noEmit)
- Verificação visual do painel

