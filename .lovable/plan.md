

## Plano: Evolução Completa do Sistema de Agentes de IA

Este plano transforma o painel de agentes em um sistema completo com base de conhecimento, chat individual, sala de reunião multi-agente, e suporte a LLM externas.

---

### Bloco 1 — Base de Conhecimento Compartilhada

**Novas tabelas (migration):**

- `ai_knowledge_bases` — id, name, created_at, updated_at
- `ai_kb_items` — id, knowledge_base_id (FK), type (enum: 'url', 'faq', 'text', 'table'), content (jsonb), status ('pending', 'trained', 'error'), created_at, updated_at
- `ai_agent_knowledge_bases` — agent_id (FK ai_agents), knowledge_base_id (FK ai_knowledge_bases) — tabela de junção N:N

**Coluna nova em ai_agents:**
- `allowed_panels` (jsonb, default []) — lista de paineis do admin que o agente pode consultar quando canal = "admin"

**UI — Nova aba "Base de Conhecimento" na página de Agentes:**
- CRUD de bases com nome
- Dentro de cada base, 4 tipos de itens (como no GHL):
  - **Web Crawler**: input de URL, status "Treinado/Pendente"
  - **FAQ**: pares pergunta/resposta manuais
  - **Texto Rico**: campo de texto livre
  - **Tabela**: input tabular (CSV ou campos)
- Seletor multi-base no edit do agente (vincular até 7 bases)

**Edge function `ai-kb-crawl`**: recebe URL, usa fetch para extrair markdown do site, salva em `ai_kb_items`.

---

### Bloco 2 — Chat Individual com Agente + Feedback

**Nova edge function `ai-agent-chat`:**
- Recebe: agent_id, messages[], knowledge_base_ids[]
- Monta system prompt do agente + contexto da base de conhecimento (FAQ + textos + URLs crawlados)
- Suporta streaming SSE
- Verifica se existe chave LLM externa configurada; se sim, usa ela; senão, usa Lovable AI (LOVABLE_API_KEY)

**UI — Botão "Chat" em cada card de agente:**
- Abre dialog fullscreen com interface de chat
- Histórico de mensagens com markdown rendering
- Botão de feedback (thumbs up/down) em cada resposta do agente
- Ao clicar "thumbs down": abre modal para corrigir a resposta → salva como novo FAQ na base de conhecimento vinculada ao agente (igual ao GHL)

**Nova tabela:**
- `ai_chat_messages` — id, agent_id, user_id, role ('user'|'assistant'), content, feedback ('liked'|'disliked'|null), session_id, created_at

---

### Bloco 3 — Sala de Reunião Multi-Agente

**Nova rota**: `/admin/agentes-ia/reuniao`

**Nova tabela:**
- `ai_meetings` — id, title, agent_ids (jsonb array), messages (jsonb array), summary (text), user_id, created_at

**UI:**
- Botão "Sala de Reunião" no topo da página de agentes
- Ao criar: escolhe titulo + seleciona 2+ agentes participantes
- Interface de chat grupal: você envia mensagem, cada agente responde na vez (round-robin ou dirigido com @menção)
- Cada agente responde com seu system prompt + base de conhecimento
- Botão "Gerar Resumo" ao final: chama a IA para sumarizar toda a conversa como ata de reunião
- Lista de reuniões anteriores com resumos salvos

---

### Bloco 4 — Integração LLM Externa (OpenAI / Anthropic)

**Nova seção em Integrações ou no próprio painel de Agentes:**
- Campos: Provider (OpenAI, Anthropic, Custom), API Key, Modelo padrão
- Salvo como secrets via `add_secret` (EXTERNAL_LLM_API_KEY, EXTERNAL_LLM_PROVIDER)

**Tabela:**
- `ai_llm_config` — id, provider ('openai'|'anthropic'|'lovable'), api_key_name (nome do secret), default_model, active, created_at

**Lógica na edge function:**
- Se `ai_llm_config` tem provider externo ativo → usa endpoint da OpenAI/Anthropic com a key configurada
- Senão → fallback para Lovable AI Gateway
- Cada agente pode sobrescrever o provider global (campo opcional `llm_override` em ai_agents)

---

### Bloco 5 — Paineis Permitidos (Canal Admin)

No edit do agente, quando "Painel Interno" está marcado nos canais:
- Aparece checklist de paineis: Vendas, Clientes, Produtos, Prescritores, Comissões, Relatórios, etc.
- Salvo em `allowed_panels` no agente
- Na edge function, quando canal = admin, a IA só recebe dados dos paineis autorizados

---

### Arquivos Impactados

| Arquivo | Ação |
|---|---|
| Migration SQL | Criar tabelas ai_knowledge_bases, ai_kb_items, ai_agent_knowledge_bases, ai_chat_messages, ai_meetings, ai_llm_config + coluna allowed_panels em ai_agents |
| `src/pages/admin/AIAgentsPage.tsx` | Refatorar com Tabs: Agentes, Base de Conhecimento, Sala de Reunião, Configuração LLM |
| `src/components/admin/AIAgentChat.tsx` | Novo — chat individual com streaming + feedback |
| `src/components/admin/AIKnowledgeBase.tsx` | Novo — CRUD de bases + itens (URL, FAQ, Texto, Tabela) |
| `src/components/admin/AIMeetingRoom.tsx` | Novo — sala de reunião multi-agente |
| `src/components/admin/AILLMConfig.tsx` | Novo — configuração de provider LLM |
| `supabase/functions/ai-agent-chat/index.ts` | Novo — chat com contexto de KB + suporte multi-provider |
| `supabase/functions/ai-kb-crawl/index.ts` | Novo — web crawler simples para extrair conteúdo de URLs |
| `src/App.tsx` | Rota para sala de reunião |
| `src/components/admin/AdminSidebar.tsx` | Sem mudança (já tem Agentes de IA) |

### Ordem de implementação

1. Migration (todas as tabelas de uma vez)
2. Base de Conhecimento (UI + edge function crawl)
3. Chat Individual + Feedback (UI + edge function chat)
4. Sala de Reunião
5. Configuração LLM Externa

