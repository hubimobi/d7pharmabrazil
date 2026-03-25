

## Status das Implementações Solicitadas

### FEITO

| # | Funcionalidade | Status |
|---|----------------|--------|
| 1 | **Loja virtual com design farmacêutico** (fundo branco, paleta azul/verde, tipografia) | Completo |
| 2 | **Catálogo de produtos** com cards, preço, desconto, badge, estoque | Completo |
| 3 | **Página de detalhe do produto** com galeria, benefícios, adicionar ao carrinho | Completo |
| 4 | **Carrinho de compras** com cupom de desconto | Completo |
| 5 | **Checkout completo** com dados pessoais, endereço, seleção de doutor (autocomplete do banco) e pagamento (Pix/Cartão) | Completo |
| 6 | **Pedidos salvos no banco** vinculados ao doutor selecionado | Completo |
| 7 | **Login administrativo** com autenticação via Lovable Cloud | Completo |
| 8 | **Painel admin** com sidebar, dashboard com KPIs e gráfico de vendas | Completo |
| 9 | **CRUD de Representantes** (criar, editar, ativar/desativar) | Completo |
| 10 | **CRUD de Doutores** vinculados a representantes | Completo |
| 11 | **Relatórios** com gráficos por mês, por representante, top doutores e exportação CSV | Completo |
| 12 | **RBAC (controle de acesso)** — admin vê tudo, representante vê só seus dados (RLS) | Completo |
| 13 | **Reset de senha** (esqueci senha + página /reset-password) | Completo |
| 14 | **Header responsivo** com carrinho, menu mobile | Completo |
| 15 | **Footer, WhatsApp flutuante, seções de confiança** | Completo |
| 16 | **Produtos estáticos** (Protein Kids, TCF4, EAA) com imagens | Completo |

---

### FALTA IMPLEMENTAR

| # | Funcionalidade | Descrição |
|---|----------------|-----------|
| 1 | **Integração de pagamento real** (Stripe/PagSeguro/Mercado Pago) | Atualmente o checkout simula o pagamento. Falta integrar um gateway real para processar Pix e cartão |
| 2 | **Integração Bling (ERP)** | Enviar pedidos automaticamente para o Bling via API para emissão de NF e controle de estoque |
| 3 | **Integração Melhor Envio (frete)** | Calcular frete real por CEP com transportadoras (Correios, Jadlog etc.) e gerar etiquetas |
| 4 | **Integração GoHighLevel (CRM/automação)** | Enviar leads e pedidos para o GHL para automações de marketing (emails, WhatsApp etc.) |
| 5 | **Produtos dinâmicos no banco** | Atualmente os produtos são estáticos em código. Falta CRUD de produtos no painel admin com imagens no storage |
| 6 | **Sistema de comissionamento** | Calcular e exibir comissões por representante/doutor baseado nos pedidos |
| 7 | **Rastreio de pedidos** | Página para o cliente acompanhar status do pedido (pendente → pago → enviado → entregue) |
| 8 | **Notificações por email** | Confirmação de pedido, atualização de status, boas-vindas |
| 9 | **Cadastro de doutores de teste** | A tabela de doutores está vazia — precisa popular com dados para o autocomplete funcionar no checkout |
| 10 | **SEO e meta tags** | Tags Open Graph, título dinâmico por página, sitemap |

