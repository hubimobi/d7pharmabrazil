# Etapa 5 — Guia de Secrets

Todos vão em: **Seu Supabase → Project Settings → Edge Functions → Secrets** (ou `supabase secrets set NAME=value` via CLI).

## Como cadastrar via CLI (mais rápido)
```bash
supabase secrets set ASAAS_API_KEY="$aact_..."
supabase secrets set ASAAS_WEBHOOK_TOKEN="$(openssl rand -hex 32)"
# ... etc
```

## Lista completa

### 🟢 Você gera aleatório (rode `openssl rand -hex 32`)
| Secret | Uso |
|---|---|
| `ASAAS_WEBHOOK_TOKEN` | Autentica callbacks do Asaas. Precisa colar o MESMO valor no painel Asaas → Integrações → Webhooks → Token. |
| `WHATSAPP_WEBHOOK_SECRET` | Autentica callbacks da Evolution API. Colar na config do webhook da instância. |
| `CRON_SECRET` | Autentica os jobs `pg_cron` que chamam edge functions (ver Etapa 4.3). |

### 🔵 Você pega em painéis de terceiros
| Secret | Onde obter |
|---|---|
| `ASAAS_API_KEY` | https://www.asaas.com → **Integrações → API** → botão "Gerar nova chave". Começa com `$aact_prod_` ou `$aact_hml_`. |
| `BLING_CLIENT_ID` | https://developer.bling.com.br → **Meus Aplicativos** → seu app → "Client ID". |
| `BLING_CLIENT_SECRET` | Mesma tela do Bling → "Client Secret". Após deploy, você refaz o OAuth em `/admin/integracoes/bling`. |
| `GHL_API_KEY` | https://app.gohighlevel.com → **Settings → Business Profile → API Keys** → "Create API Key". |
| `GHL_LOCATION_ID` | GHL → **Settings → Company** → copie o ID da localização (URL: `.../location/XXXX/...`). |
| `MELHOR_ENVIO_TOKEN` | https://melhorenvio.com.br → **Configurações → Tokens** → "Gerar novo token" com scopes `shipping-calculate`, `orders-read`. |
| `CLOUDFLARE_API_TOKEN` | https://dash.cloudflare.com → **My Profile → API Tokens** → "Create Token" → template **Edit zone DNS** ou permissões `Zone: Cache Purge`. |
| `CLOUDFLARE_ZONE_ID` | Cloudflare → sua zona (domínio) → **Overview** (lado direito, "Zone ID"). |
| `XAI_API_KEY` | https://console.x.ai → **API Keys** → "Create". |

### 🟡 Opcionais (só se for adaptar funções de IA)
| Secret | Onde obter |
|---|---|
| `OPENAI_API_KEY` | https://platform.openai.com → **API Keys** (só se for usar `generate-image`). |
| `EVOLUTION_API_URL` | URL da sua instância Evolution API (ex.: `https://evo.d7pharma.com`). |
| `EVOLUTION_API_KEY` | API key da sua instância Evolution. |

### 🔴 Não migrar
| Secret | Motivo |
|---|---|
| `LOVABLE_API_KEY` | Não funciona fora do Lovable. Substitua por XAI/OpenAI. |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_DB_URL` / `SUPABASE_JWKS` | O Supabase cria automaticamente na sua nova instância. |
| `SUPABASE_PUBLISHABLE_KEY(S)` / `SUPABASE_SECRET_KEYS` | Formato novo do Lovable — irrelevante fora daqui. |

## Verificar
```bash
supabase secrets list
```
Deve listar ~11 secrets seus + os 5 padrão do Supabase.
