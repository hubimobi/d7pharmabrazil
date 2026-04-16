

# Diagnóstico: Evolution API — Erro de Conexão

## O que está acontecendo

A Evolution API **está funcionando** — confirmei isso chamando a edge function diretamente. O servidor `evolution.d7pharmabrazil.com.br` respondeu normalmente com estado `"connecting"` para a instância Bia.

Existem **3 problemas combinados** causando a impressão de erro:

### 1. URL errada no `store_settings`
A tabela `store_settings` tem uma URL de ngrok antiga (`jenni-unelongated-messily.ngrok-free.dev`) em vez de `evolution.d7pharmabrazil.com.br`. O botão "Testar Conexão" na página de Integrações chama essa URL **direto do navegador**, que falha porque o ngrok está offline.

### 2. Status "connecting" resetando instâncias
As 3 instâncias estão com estado `"connecting"` na Evolution (não `"open"`). Isso significa que elas precisam ser escaneadas via QR code. Além disso, a ação `status` na edge function `whatsapp-instance` **ainda mapeia `connecting` → `qr_ready`** e sobrescreve o banco, desfazendo as correções anteriores.

### 3. `tenant_users` com recursão infinita
A tabela `tenant_users` tem uma policy com recursão infinita (erro `42P17`), e `store_settings_public` não tem coluna `tenant_id`. Esses são bugs separados que afetam toda a aplicação.

## Plano de implementação

### Etapa 1: Atualizar URL no store_settings (migration SQL)
- Alterar `evolution_api_url` de `jenni-unelongated-messily.ngrok-free.dev` para `evolution.d7pharmabrazil.com.br`

### Etapa 2: Corrigir mapeamento de status na edge function
**Arquivo**: `supabase/functions/whatsapp-instance/index.ts`
- Na ação `status` (linha 205), aplicar a mesma lógica do webhook: só atualizar o banco para estados definitivos (`open` → `connected`, `close` → `disconnected`). Para `connecting`, manter o status atual do banco.

### Etapa 3: Corrigir recursão em `tenant_users`
- Identificar e corrigir a policy RLS que causa recursão infinita na tabela `tenant_users`
- Isso resolve os erros 500 que aparecem em toda a aplicação

### Etapa 4: Corrigir `store_settings_public` 
- A view `store_settings_public` não tem coluna `tenant_id`, mas o código filtra por ela. Recriar a view incluindo `tenant_id`.

## Arquivos que serão modificados
- `supabase/functions/whatsapp-instance/index.ts` — status mapping fix
- Nova migration SQL — URL fix, tenant_users policy, store_settings_public view

