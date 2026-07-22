# Etapa 9 — Checklist Final

## Frontend
- [ ] `https://d7pharmabrazil.com.br` carrega (200 OK, HTTPS válido)
- [ ] `https://www.d7pharmabrazil.com.br` redireciona OK
- [ ] Refresh em `/admin` não dá 404 (SPA fallback OK)
- [ ] Refresh em `/checkout` não dá 404
- [ ] Console do browser: **zero** erros de CORS ou de Supabase URL undefined

## Autenticação
- [ ] Login admin (`superadmin@d7pharma.com`) funciona
- [ ] Session persiste após refresh
- [ ] Logout limpa sessão

## Multi-tenant
- [ ] `resolve-tenant` retorna o tenant correto para `d7pharmabrazil.com.br`
- [ ] `tenant_domains` tem o registro do domínio novo

## Storage
- [ ] Imagens de produtos aparecem na home
- [ ] Banners aparecem
- [ ] Upload novo de produto funciona

## Checkout
- [ ] Adiciona produto ao carrinho
- [ ] Aplica cupom `DESCONTO10-XXXX-YYYY`
- [ ] Frete calcula (Melhor Envio)
- [ ] Cria PIX (Asaas responde)
- [ ] Testa `?ck=1`, `?ck=2`, `?ck=3`

## Webhook Asaas (fluxo crítico)
1. Criar pedido de teste no admin
2. Marcar como pago manualmente no painel Asaas OU pagar de fato
3. Verificar em `orders`: `status = 'paid'`
4. Verificar em `commissions`: linha criada com `commission_value = subtotal * 0.20`

## WhatsApp
- [ ] Broadcasts mostra instâncias com nome + número (não ID)
- [ ] Status "Conectado" atualiza sozinho
- [ ] Envio de mensagem individual funciona
- [ ] Campanha em massa dispara (`whatsapp-process-queue` rodando via cron)

## Bling
- [ ] OAuth reconecta em `/admin/integracoes/bling`
- [ ] Novo pedido pago sincroniza como venda no Bling

## Cron Jobs
```sql
SELECT jobid, jobname, schedule,
  (SELECT MAX(start_time) FROM cron.job_run_details WHERE jobid = j.jobid) AS last_run,
  (SELECT status FROM cron.job_run_details WHERE jobid = j.jobid ORDER BY start_time DESC LIMIT 1) AS last_status
FROM cron.job j;
```
Todos devem ter `last_status = 'succeeded'` nos últimos minutos.

## Contagem de dados (validar migração)
```sql
SELECT 'products' t, COUNT(*) FROM products
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'doctors', COUNT(*) FROM doctors
UNION ALL SELECT 'representatives', COUNT(*) FROM representatives
UNION ALL SELECT 'whatsapp_contacts', COUNT(*) FROM whatsapp_contacts
UNION ALL SELECT 'commissions', COUNT(*) FROM commissions;
```
Comparar com contagem antes da migração.

## Performance
- [ ] Home carrega em < 2s
- [ ] LCP < 2.5s (Lighthouse)
- [ ] Sem erro no console

## Rollback
Se algo quebrar críticamente nas primeiras 48h, **reverta o DNS** para o IP do Lovable Cloud (ele fica de pé mais 30 dias por default). Todos os dados originais continuam intactos no Lovable Cloud.
