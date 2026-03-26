

## Por que o Token do Bling Expira

O Bling usa OAuth2 com dois tokens:
- **Access token**: expira em ~6 horas
- **Refresh token**: expira em ~30 dias

Atualmente, o sistema só renova o token quando um pedido é sincronizado (`bling-sync-order`). Se nenhum pedido for feito por 30 dias, o refresh token expira e é necessário reconectar manualmente.

## Solução: Renovação Automática com Cron Job

Criar uma edge function agendada (cron) que roda a cada 12 horas para renovar o token automaticamente, garantindo que ele nunca expire.

### Arquivos

| Arquivo | Ação |
|---------|------|
| `supabase/functions/bling-refresh-token/index.ts` | Criar -- função que verifica se o token expira em menos de 24h e renova proativamente |
| `supabase/config.toml` | Editar -- adicionar schedule cron a cada 12h |
| `src/pages/admin/IntegrationsPage.tsx` | Editar -- mostrar quando o token foi renovado pela última vez e próxima expiração |

### Lógica da função cron

1. Buscar token mais recente da tabela `bling_tokens`
2. Se `expires_at` é dentro das próximas 24 horas, usar o `refresh_token` para obter novos tokens
3. Salvar os novos tokens no banco
4. Se o refresh token falhou (expirado), logar erro para que o admin reconecte

### Config do cron no `config.toml`

```toml
[functions.bling-refresh-token]
schedule = "0 */12 * * *"
verify_jwt = false
```

### Resolução imediata

Para resolver agora: reconectar o Bling pelo painel admin em `/admin/integracoes` clicando no link de convite novamente. Após a reconexão, o cron manterá o token sempre válido.

