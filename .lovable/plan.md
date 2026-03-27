

## Plano: Dashboard Avançado com Métricas Completas

### O que será adicionado ao `DashboardPage.tsx`

**Seção 1 — Cards KPI (já existem, expandir):**
- Manter: Representantes, Prescritores, Pedidos, Faturamento
- Adicionar: **Ticket Médio**, **Pessoas Online** (placeholder — requer Analytics real)

**Seção 2 — Gráficos de Vendas (dados internos do banco):**
- **Vendas por Mês** (já existe — manter)
- **Vendas por Produto** — novo gráfico de barras horizontais, agrupando `order_items` por produto
- **Vendas por Representante** — PieChart (mover da ReportsPage)
- **Top 10 Prescritores** — tabela ranking (mover da ReportsPage)

**Seção 3 — Métricas de Tráfego Pago (placeholders com estrutura pronta):**
- **Meta Ads**: Cards com Valor Investido, CPL, CPA, ROAS, CTR, Impressões, Cliques
- **Google Ads**: Cards com Valor Investido, CPL, CPA, ROAS, CTR, Impressões, Cliques
- Esses dados virão de API futura — por agora mostrar cards com "Conectar API" ou valores zerados
- Nota: você mencionou "API automática" — quando as integrações Meta/Google forem configuradas, esses cards serão alimentados

**Seção 4 — Volume Orgânico e Analytics:**
- Card de **Sessões Orgânicas** (placeholder para Google Analytics)
- Card de **Pessoas Online Agora** (placeholder)
- **Mapa de calor por região** — gráfico simples de vendas por estado (UF) usando dados reais de pedidos, exibido como treemap ou barra horizontal

### Alterações na query de dados

Expandir a query de `orders` para incluir `order_items(product_name, quantity, price)` e `doctors(name, state, representative_id, representatives(name))` para alimentar todos os gráficos com dados reais do banco.

### Arquivos modificados

| Arquivo | Ação |
|---|---|
| `src/pages/admin/DashboardPage.tsx` | Reescrever com todos os gráficos e seções |

### Importante

- Dados de Meta Ads e Google Ads ficam como **placeholders visuais** prontos para receber dados quando as APIs forem integradas
- Vendas por produto, representante e top prescritores usam **dados reais** do banco
- Mapa por região usa o campo `state` dos pedidos/prescritores

