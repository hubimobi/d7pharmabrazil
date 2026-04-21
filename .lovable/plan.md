

## Problemas a corrigir

### 1. Configurações da loja não carrega (403)
A migration anterior fez `security_invoker = on` na view `store_settings_public` **e revogou** SELECT na tabela `store_settings` para `anon`/`authenticated`. Como `security_invoker` faz a view rodar com permissões do chamador, a view também perde acesso à tabela → toda página que usa `useStoreSettings` quebra (Configurações, Home, Header, Footer, Checkout).

**Correção:** voltar a view para `security_invoker = off` (SECURITY DEFINER comportamento padrão), mantendo a tabela `store_settings` revogada de `anon`/`authenticated` e apenas `GRANT SELECT` na view. A view continua escondendo colunas sensíveis (Evolution API key, CNPJ, endereço), e como roda como owner ela mesma faz a leitura. Mantém a segurança e restaura o carregamento.

### 2. Lista de modelos do agente mostra nomes genéricos
Hoje em `AIAgentsPage.tsx` (campo "Modelo de IA" do dialog de edição) o select é populado a partir de constantes hardcoded `LOVABLE_MODELS` / `EXTERNAL_MODELS`. O usuário quer que mostre **somente os provedores LLM já cadastrados e ativos** em "Configuração LLM".

**Correção:**
- Permitir múltiplas linhas ativas em `ai_llm_config` (hoje a UI assume apenas uma; vou suportar várias).
- Adicionar coluna `is_default boolean` em `ai_llm_config` (somente um pode ser default por tenant — garantido por trigger).
- Em `AIAgentsPage`, montar a lista de modelos dinamicamente: para cada provider ativo, listar seu `default_model` (com label `"<Provider> — <Modelo>"`). O primeiro item será o default global (linha com `is_default = true`).
- Em `AILLMConfig`, na tela de cards: permitir ativar **vários provedores** simultaneamente e marcar um como "Padrão" (radio). Lovable AI continua como fallback automático.

### 3. Revisão completa da lógica de IA
Vou padronizar todas as edge functions que usam IA para o mesmo helper `getActiveLLM`:
- Hoje cada função (`product-qa`, `analyze-copy-score`, `generate-ad-copy`, `generate-testimonials`, `generate-profile-copy`, `ai-agent-chat`) tem sua própria cópia do helper. Vou extrair para `supabase/functions/_shared/llm.ts` e fazer todas importarem.
- O helper passa a respeitar: (a) override por agente (`agent.llm_override` quando aplicável), (b) `is_default = true` em `ai_llm_config`, (c) primeiro `active = true`, (d) fallback Lovable AI.
- Sempre logar consumo em `ai_token_usage` com o provider/model realmente usado.
- Mapa atualizado de surfaces que usam IA (manter consistência):
  - **Agentes (chat):** `ai-agent-chat` — chat admin, WhatsApp via flow `ai_reply`.
  - **Ferramentas /admin/tools:** `generate-testimonials`, `generate-image`, `generate-ad-copy`, `analyze-copy-score`, `generate-profile-copy`, gerador de campanha.
  - **Loja pública:** `product-qa` (perguntas no produto).
  - **WhatsApp:** `improve-message-copy` (composer), `ai_reply` (flow step).
  - **Edição:** `remove-background` (logos).

### 4. Default de modelo no editor de Flow WhatsApp
Já corrigido em mensagem anterior (mostra `default_model` do provider ativo). Revisar para usar a mesma fonte unificada.

## Mudanças por arquivo

**Migrations (1 nova):**
1. Reverter `store_settings_public` para `security_invoker = off`; manter REVOKE na tabela; manter GRANT SELECT na view.
2. Adicionar `ai_llm_config.is_default boolean default false`; trigger garantindo no máximo 1 default por tenant; marcar Lovable como default se nenhum existir.

**Edge Functions:**
- Criar `supabase/functions/_shared/llm.ts` com `getActiveLLM(sb, { agentLlmOverride? })` e `logTokenUsage(sb, {...})`.
- Refatorar `ai-agent-chat`, `product-qa`, `analyze-copy-score`, `generate-ad-copy`, `generate-testimonials`, `generate-profile-copy` para usar o helper compartilhado.

**Frontend:**
- `src/components/admin/AILLMConfig.tsx`: substituir lógica "apenas 1 ativo" por múltiplos ativos + radio de Padrão; salvar `is_default`.
- `src/pages/admin/AIAgentsPage.tsx`: montar `availableModels` a partir de **todos** os configs ativos (não só o primeiro externo); ordenar por `is_default` primeiro; rótulos `"<Provider> — <Modelo>"`.
- `src/components/admin/WhatsAppFlowEditor.tsx`: usar mesma fonte de defaults do `AIAgentsPage`.

## Riscos
- Baixo. A correção da view restaura acesso sem expor colunas sensíveis (a view não as projeta). A mudança de `is_default` é aditiva.
- Será necessário re-deploy das edge functions refatoradas (automático).

## Resultado esperado
- `/admin/configuracoes` volta a carregar; Home, Checkout e cabeçalho voltam a buscar branding.
- No dialog do agente: dropdown lista exatamente os provedores/modelos cadastrados e ativos em LLM Config, com o "Padrão" no topo.
- Possível ativar vários provedores e definir qual é o padrão.
- Toda IA do sistema passa por um único caminho de seleção de provedor com logs unificados de tokens.

