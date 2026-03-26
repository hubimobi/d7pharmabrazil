

## Correção: "Unexpected end of JSON input" no Bling Callback e Asaas Webhook

### Problema

Dois problemas identificados:

1. **Bling Callback** (`bling-callback/index.ts` linha 42): `tokenRes.json()` falha se o Bling retornar resposta vazia ou não-JSON (ex: HTML de erro, body vazio). Isso causa o crash "Unexpected end of JSON input" no `catch`, que retorna apenas "Erro interno."

2. **Asaas Webhook** (`asaas-webhook/index.ts` linha 16): `req.json()` falha quando acessado via browser (GET sem body) — isso é o que aparece no screenshot. Embora seja comportamento esperado para webhooks, deve retornar erro amigável.

### Solução

#### 1. `bling-callback/index.ts`
- Ler resposta como texto primeiro (`tokenRes.text()`)
- Tentar parsear JSON com try/catch
- Se falhar, logar o texto raw e retornar mensagem de erro descritiva
- Adicionar log do status HTTP para debug

#### 2. `asaas-webhook/index.ts`
- Verificar se o método é GET/HEAD e retornar mensagem amigável ("Webhook ativo")
- Envolver `req.json()` em try/catch separado para tratar body vazio/inválido

### Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/bling-callback/index.ts` | Safe JSON parsing com `text()` + `JSON.parse()` e logs detalhados |
| `supabase/functions/asaas-webhook/index.ts` | Tratar GET requests e safe JSON parsing do body |

