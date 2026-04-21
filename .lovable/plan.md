

## Problema

O painel da Evolution API em `/admin/integracoes` está dizendo "desconectado" / "não configurado", mesmo com as instâncias rodando e aparecendo corretamente na lista de WhatsApp. Em paralelo, ao salvar as integrações aparece o erro **"permission denied for table store_settings"** (visto no session replay).

## Causa raiz

A migration que revogou SELECT/UPDATE em `store_settings` para `anon`/`authenticated` foi longe demais. O card "Evolution API" em `IntegrationsPage.tsx` lê e grava **diretamente na tabela `store_settings`** as chaves:
- `evolution_api_url`
- `evolution_api_key`

Como as permissões foram removidas, o SELECT volta vazio (aparece como "não configurado") e o UPDATE falha com "permission denied" — exatamente o erro mostrado no toast. A tabela `whatsapp_instances` tem policies próprias e por isso as instâncias continuam aparecendo normalmente.

Além disso há erros de TypeScript/Deno nas edge functions (build quebrado) que precisam ser limpos para permitir deploys futuros.

## Plano de correção

### 1. Restaurar acesso controlado ao `store_settings` (migration)
- Conceder `SELECT, INSERT, UPDATE` em `store_settings` para `authenticated` **somente**.
- Garantir policies RLS para que apenas usuários com papel administrativo (`has_any_role(auth.uid(), ARRAY['admin','superadmin','suporte']::app_role[])`) possam ler/gravar as linhas do próprio tenant.
- Manter `anon` sem acesso direto (vitrine pública continua usando a view `store_settings_public`).
- Nenhum dado sensível fica exposto: a view continua escondendo `evolution_api_key`, CNPJ, endereço — as chaves só são visíveis para admins logados.

### 2. Reconectar a Evolution API no UI
Depois da migration, o card "Evolution API" em `/admin/integracoes` volta a ler `evolution_api_url` e `evolution_api_key` da tabela. O usuário só precisa reabrir a página.

Vou também:
- Adicionar um botão **"Testar conexão"** que chama `GET /instance/fetchInstances` na URL configurada e mostra quantas instâncias responderam (feedback visual de saúde).
- Exibir badge verde "Conectado — N instâncias ativas" quando houver sucesso.

### 3. Limpar erros de build das edge functions
Os erros `TS18046 'err' is of type unknown` e `TS2451 Cannot redeclare` estão impedindo novos deploys. Correções cirúrgicas:

- Trocar `catch (err)` → `catch (err: any)` em: `bling-sync-order`, `check-payment-status`, `create-prescriber-signup`, `create-prescriber-user`, `create-tenant-user`, `get-order`, `ghl-sync`, `pay-commissions`, `recent-orders`, `register-prescriber`, `restore-backup`, `sitemap-xml`, e demais funções listadas.
- Remover declarações duplicadas de `sb`, `supabaseUrl`, `supabaseKey` em `ai-kb-crawl/index.ts` e `generate-image/index.ts`.
- Adicionar import faltante de `createClient` em `remove-background/index.ts` e converter `Uint8Array` → `ArrayBuffer` antes do `base64Encode`.
- Alinhar versões `@supabase/supabase-js@2.104.0` em `cloudflare-purge/index.ts` e `create-payment/index.ts` (conflito com `tenant-credentials.ts`).

### 4. Validação
- Reabrir `/admin/integracoes` → confirmar que Evolution API aparece como "Conectada" e que botão "Testar conexão" retorna as instâncias ativas.
- Abrir `/admin/configuracoes` → confirmar que carrega (já corrigido antes, mas valida novamente sem o erro de permissão).
- Verificar que webhook continua recebendo eventos (os logs mostram que está OK — `connection.update state="open" → "connected"` para `d7pharma_1776107871039`).

## Arquivos afetados

**Migration nova:**
- GRANT `SELECT, INSERT, UPDATE` em `store_settings` para `authenticated`.
- Policy RLS restrita por `has_any_role` + `tenant_id = get_current_tenant_id()`.

**Frontend:**
- `src/pages/admin/IntegrationsPage.tsx` — adicionar botão "Testar conexão" no card Evolution e badge de saúde.

**Edge functions (correções de tipos):**
- ~14 arquivos listados acima (somente `catch (err: any)` + dedupe de `const`).

## Resultado esperado

- Painel de Integrações volta a mostrar a Evolution API como **Conectada**, com a URL `https://evolution.d7pharmabrazil.com.br` e chaves preservadas.
- Salvar configurações deixa de dar "permission denied".
- Builds das edge functions voltam a passar, permitindo futuros deploys automáticos.

