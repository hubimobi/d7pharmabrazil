
## Plano: Auditoria e correção multi-tenant

### Problema raiz do erro "Tenant não encontrado"
`SendingConfigTab` (e BroadcastTab) em `WhatsAppPage.tsx` resolvem o tenant lendo `tenant_users` direto (`select tenant_id where user_id = auth.uid`). Isso falha para:
- **Super admins** que não têm linha em `tenant_users` (estão em `user_roles`).
- **Super boss** ao trocar de tenant via `TenantSelector` (o hook `useTenant` muda, mas o código ignora).
- Usuários com múltiplos tenants (pega o primeiro qualquer).

A solução: usar **`useTenant().tenantId`** (que já trata todos esses casos) em vez de re-consultar.

### Correções pontuais (causa do erro reportado)
**`src/pages/admin/WhatsAppPage.tsx`** — substituir os 3 trechos que leem `tenant_users` por `const { tenantId } = useTenant()`:
- `SendingConfigTab` (load + save) — corrige o erro "Tenant não encontrado"
- `BroadcastTab` (disparo) — usa o tenant ativo do contexto
- Adicionar fallback: se `tenantId` for `DEFAULT_TENANT_ID` e não houver row em config, criar com esse default

### Auditoria multi-tenant — gaps encontrados

**1. Inserts SEM `tenant_id` (RLS pode bloquear / dados vazam entre tenants):**
- `WhatsAppPage.tsx`:
  - `whatsapp_templates.insert(payload)` (linha 595)
  - `whatsapp_template_folders.insert(...)` (linha 632)
  - `whatsapp_funnels.insert(form)` (linha 926)
  - `whatsapp_funnel_steps.insert(...)` (linha 943)
- `WhatsAppFlowEditor.tsx`:
  - `whatsapp_flows.insert(...)` em `duplicateFlow` (linha 171) e `save` (linha 729)
- `RepresentativesPage.tsx`: `representatives.insert(form)` (linha 81)
- `DoctorsPage.tsx`: `doctors.insert(payload)` (linha 143) + `coupons.insert(...)` (linha 152)
- `LinksPage.tsx`: `short_links.insert(insertData)` (linha 124)
- `AIAgentsPage.tsx`: `ai_agents` insert + `ai_agent_knowledge_bases.insert(...)` (sem tenant)
- `AIKnowledgeBase.tsx`: `ai_kb_items.insert(...)` (linha 109) sem tenant
- `AIMeetingRoom.tsx`: `ai_meetings.insert(...)` sem tenant
- `CampaignConfigTool.tsx`: insert sem tenant
- `LeadsPage.tsx` (manual add linha 168): sem tenant
- `BannerPage.tsx` (`hero_banners.insert` linha 459): sem tenant
- `TestimonialGenerator.tsx`: ok (já tem tenant_id)

**2. Pages que NÃO usam `useTenant()` mas fazem queries/inserts:**
- `OrdersPage`, `DoctorsPage`, `RepresentativesPage`, `LinksPage`, `AIAgentsPage`, `RecoveryPage`, `PagesPage`, `PopupsPage`, `FeedbackApprovalPage`, `ReportsPage`, `IntegrationsPage`, `UsersPage`, `DashboardPage`, `CommissionsPage`, `RepCommissionsPage`, `CustomersPage`
- A maioria depende de RLS para filtrar no SELECT, mas **inserts sem `tenant_id`** vão falhar ou cair no tenant errado quando RLS exigir match.

**3. Edge functions com hardcode `DEFAULT_TENANT_ID = "00000000..."`:**
- `create-prescriber-signup`, `register-prescriber` etc — usam fallback aceitável (resolvem por hostname). OK.
- `whatsapp-process-queue`, `whatsapp-send`, `whatsapp-webhook` — já tenant-aware via `tenant_users` ou `instance.tenant_id`. OK.

### Plano de execução

**Fase 1 — Fix imediato do erro (alta prioridade)**
- Refatorar `SendingConfigTab` e `BroadcastTab` em `WhatsAppPage.tsx` para usar `const { tenantId } = useTenant()` ao invés de `tenant_users` lookup.
- Trocar todas as queries `.eq("tenant_id", tu.tenant_id)` por `.eq("tenant_id", tenantId)`.

**Fase 2 — Adicionar `tenant_id` em todos os inserts admin**
- Em cada arquivo listado acima:
  1. Adicionar `const { tenantId } = useTenant()` no componente.
  2. Incluir `tenant_id: tenantId` no objeto inserido.
- Tabelas atingidas: `whatsapp_templates`, `whatsapp_template_folders`, `whatsapp_funnels`, `whatsapp_funnel_steps`, `whatsapp_flows`, `representatives`, `doctors`, `coupons`, `short_links`, `ai_agents`, `ai_agent_knowledge_bases`, `ai_kb_items`, `ai_meetings`, `campaign_config`, `popup_leads`, `hero_banners`.

**Fase 3 — (Opcional, defesa em profundidade) trigger DB**
- Criar trigger `BEFORE INSERT` nas tabelas tenant-scoped que faz `NEW.tenant_id := COALESCE(NEW.tenant_id, public.current_tenant_id())`. Garante que mesmo código antigo nunca insere sem tenant. Não bloqueia super admin (que pode passar tenant explicitamente).

### Arquivos a modificar
- `src/pages/admin/WhatsAppPage.tsx` (principal)
- `src/components/admin/WhatsAppFlowEditor.tsx`
- `src/pages/admin/RepresentativesPage.tsx`
- `src/pages/admin/DoctorsPage.tsx`
- `src/pages/admin/LinksPage.tsx`
- `src/pages/admin/AIAgentsPage.tsx`
- `src/components/admin/AIKnowledgeBase.tsx`
- `src/components/admin/AIMeetingRoom.tsx`
- `src/components/admin/tools/CampaignConfigTool.tsx` (verificar — já parece ok)
- `src/pages/admin/LeadsPage.tsx` (add manual)
- `src/pages/admin/BannerPage.tsx` (hero_banners)
- (opcional) nova migration com trigger de defesa
