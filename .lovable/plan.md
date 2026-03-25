

## Integração Bling V3 (OAuth2)

O Bling V3 usa OAuth2 — não tem "API Key" simples. Os dados da sua tela (Client ID, Client Secret, Link de convite) são exatamente o que precisamos.

### Fluxo OAuth2 do Bling

```text
1. Admin clica "Conectar Bling" no painel
2. Redireciona para Bling (link de convite)
3. Bling redireciona de volta com ?code=XXXXX
4. Edge function troca o code por access_token + refresh_token
5. Tokens salvos no banco (bling_tokens)
6. A cada pedido, usa access_token para enviar ao Bling (com refresh automático)
```

### O que será criado

**1. Tabela `bling_tokens`** — armazena access_token, refresh_token, expires_at

**2. Secrets** — `BLING_CLIENT_ID` e `BLING_CLIENT_SECRET` (os valores da sua tela)

**3. Edge Function `bling-callback`** — recebe o `?code=` após autorização e troca pelo token

**4. Edge Function `bling-sync-order`** — envia pedido ao Bling V3 usando os campos SKU, NCM, GTIN, Unidade já cadastrados nos produtos

**5. Página admin "Integrações"** — botão "Conectar Bling" que abre o link de autorização, e mostra status da conexão

**6. Disparo automático** — após pagamento confirmado, chama `bling-sync-order`

### Pré-requisito do usuário

Antes de implementar, preciso que você:
1. Vá em "Dados básicos" do app no Bling
2. Configure a **URL de callback** como: `https://xufiemrhlmirkrdrcxox.supabase.co/functions/v1/bling-callback`
3. Confirme aqui que configurou

Depois vou solicitar que salve o Client ID e Client Secret como secrets seguros.

