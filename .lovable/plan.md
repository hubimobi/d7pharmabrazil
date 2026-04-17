
## Diagnóstico: O que falta para virar um SaaS multi-domínio vendável

O sistema **já tem a base multi-tenant** (RLS, `resolve-tenant`, clonagem, superboss). O que falta são camadas de **operação comercial, onboarding self-service, billing e isolamento total** para vender como SaaS.

---

### 🔴 Crítico (sem isso não vende)

**1. Onboarding self-service**
- Hoje: criar loja exige Superboss manual via `/superboss/clonar`.
- Falta: página pública `/criar-loja` → cadastro do dono → escolha de plano → criação automática (signup + tenant + clone do template + admin user + `tenant_users role=admin`) via edge function `signup-tenant`.

**2. Billing / Cobrança recorrente**
- Hoje: campo `plan` em `tenants` é texto solto, sem cobrança.
- Falta: integração Stripe/Asaas Subscriptions, tabela `tenant_subscriptions` (status, plano, próximo vencimento, trial_ends_at), webhook que **suspende automaticamente** tenant inadimplente (`tenants.status='suspended'` → `resolve-tenant` já bloqueia), página `/admin/assinatura` para o lojista ver fatura/cancelar/trocar plano.

**3. Conexão de domínio próprio self-service**
- Hoje: `tenant_domains` existe e `resolve-tenant` resolve por hostname, mas adicionar domínio é manual (insert direto no DB).
- Falta: UI em `/admin/dominios` onde o lojista digita `lojadele.com.br`, o sistema mostra os DNS records (A 185.158.133.1 + TXT verificação), faz polling de verificação, e provisiona SSL via Cloudflare for SaaS API (Custom Hostnames). Edge function `verify-custom-domain` + cron de renovação.

**4. Limites por plano (enforcement)**
- Hoje: `allowed_modules` jsonb existe mas não é checado em quase nenhum lugar.
- Falta: hook `usePlanLimits()` que lê plano + uso (qtd produtos, pedidos/mês, contatos WhatsApp, mensagens IA) e bloqueia ações quando estoura. Banner "Upgrade pra plano X". Tabela `plan_definitions` com limites declarativos.

---

### 🟡 Importante (pra escalar/profissionalizar)

**5. Isolamento de credenciais por tenant**
- Hoje (memória `global-api-tokens-constraint`): tokens Bling e TikTok Shop são **globais cross-tenant** — bug grave em SaaS. Asaas, Evolution API, GHL também precisam ser por tenant.
- Falta: tabela `tenant_integrations(tenant_id, provider, credentials jsonb encrypted, active)` substituindo secrets globais. Edge functions devem ler do tenant, não de `Deno.env`.

**6. Storage isolado por tenant**
- Hoje: buckets `product-images`, `store-assets`, `images` são compartilhados (paths livres).
- Falta: convenção `tenant_id/...` em todos os uploads + RLS de storage por path prefix. Auditar todos os `supabase.storage.from(...).upload(...)`.

**7. E-mails transacionais por tenant**
- Hoje: e-mails de auth do Supabase são globais (um remetente único).
- Falta: cada loja com seu Resend/SMTP próprio + templates personalizáveis (logo, cores, remetente). Tabela `tenant_email_config`.

**8. Branding completo por tenant**
- Hoje: `store_settings` cobre cores, logo, fonte. `index.html` tem favicon/título estáticos.
- Falta: edge function `seo-meta` ou SSR mínimo que injete `<title>`, `<meta>`, favicon e Open Graph dinâmicos por hostname (hoje todos os tenants compartilham o mesmo `<title>`/favicon do `index.html`).

**9. Painel Superboss com métricas SaaS**
- Hoje: `SuperbossLojas` lista tenants e suspende.
- Falta: MRR, churn, tenants ativos vs trial, uso por tenant, top consumidores de IA/WhatsApp, login-as-tenant ("impersonar" pra suporte).

---

### 🟢 Nice to have (diferencial competitivo)

**10. Plano Trial automático** — `trial_ends_at`, banner countdown, downgrade automático.
**11. Marketplace de templates** — múltiplos `is_template=true` (farmácia, suplementos, cosméticos), lojista escolhe no signup.
**12. Whitelabel total** — esconder marca "D7Pharma/Lovable" do admin quando `tenant.whitelabel=true`.
**13. Logs de auditoria por tenant** — quem fez o quê, exportável.
**14. API pública por tenant** — chave de API tenant-scoped pra integrações externas dos lojistas.
**15. Limites de Edge Functions** — rate limit por tenant pra IA/WhatsApp não estourar custo.

---

### Roadmap sugerido (ordem)

```text
Fase 1 (MVP vendável):  1 + 2 + 3 + 4
Fase 2 (escala segura): 5 + 6 + 8
Fase 3 (profissional):  7 + 9 + 10
Fase 4 (diferencial):   11–15
```

### Pergunta antes de avançar
Quer que eu detalhe + implemente alguma fase específica? Sugiro começar pela **Fase 1** (especialmente #4 — limites por plano — porque sem isso o #2 billing não tem o que cobrar diferenciado).
