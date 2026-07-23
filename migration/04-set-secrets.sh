#!/usr/bin/env bash
# Script para cadastrar todos os secrets no seu Supabase novo.
#
# Pré-requisitos:
#   1. Supabase CLI instalada (supabase --version)
#   2. Projeto linkado: supabase link --project-ref ecvmnfiewsovcpvviklz
#
# Uso:
#   1. Preencha os valores abaixo (entre aspas)
#   2. chmod +x 04-set-secrets.sh
#   3. ./04-set-secrets.sh
#
# ⚠️ NUNCA commite este arquivo com valores reais. Adicione ao .gitignore.

set -euo pipefail

PROJECT_REF="ecvmnfiewsovcpvviklz"

# ============================================================
# 🔑 INTEGRAÇÕES EXTERNAS — pegue no painel de cada serviço
# ============================================================
ASAAS_API_KEY=""              # painel Asaas → Integrações → API
BLING_CLIENT_ID=""            # Bling → Aplicativos → seu app
BLING_CLIENT_SECRET=""        # Bling → Aplicativos → seu app
GHL_API_KEY=""                # GoHighLevel → Settings → API Keys
GHL_LOCATION_ID=""            # GoHighLevel → Settings → Company
MELHOR_ENVIO_TOKEN=""         # Melhor Envio → Aplicativos
CLOUDFLARE_API_TOKEN=""       # Cloudflare → My Profile → API Tokens
CLOUDFLARE_ZONE_ID=""         # Cloudflare → domínio → Overview (direita)
XAI_API_KEY=""                # console.x.ai → API Keys

# ============================================================
# 🧠 IA (opcional — só se for usar generate-image via DALL-E)
# ============================================================
OPENAI_API_KEY=""             # platform.openai.com → API keys

# ============================================================
# 📱 WHATSAPP / EVOLUTION API — do seu servidor Evolution
# ============================================================
EVOLUTION_API_URL=""          # ex: https://evolution.seudominio.com
EVOLUTION_API_KEY=""          # apikey global configurada no Evolution

# ============================================================
# 🎲 SECRETS ALEATÓRIOS — gerados automaticamente se vazios
# ============================================================
ASAAS_WEBHOOK_TOKEN="${ASAAS_WEBHOOK_TOKEN:-$(openssl rand -hex 32)}"
WHATSAPP_WEBHOOK_SECRET="${WHATSAPP_WEBHOOK_SECRET:-$(openssl rand -hex 32)}"
CRON_SECRET="${CRON_SECRET:-$(openssl rand -hex 32)}"

# ============================================================
# EXECUÇÃO
# ============================================================
set_secret() {
  local name="$1"
  local value="$2"
  if [ -z "$value" ]; then
    echo "⚠️  $name está vazio — pulando"
    return
  fi
  echo "→ setando $name"
  supabase secrets set "$name=$value" --project-ref "$PROJECT_REF" >/dev/null
}

echo "=== Cadastrando secrets no projeto $PROJECT_REF ==="

set_secret ASAAS_API_KEY            "$ASAAS_API_KEY"
set_secret BLING_CLIENT_ID          "$BLING_CLIENT_ID"
set_secret BLING_CLIENT_SECRET      "$BLING_CLIENT_SECRET"
set_secret GHL_API_KEY              "$GHL_API_KEY"
set_secret GHL_LOCATION_ID          "$GHL_LOCATION_ID"
set_secret MELHOR_ENVIO_TOKEN       "$MELHOR_ENVIO_TOKEN"
set_secret CLOUDFLARE_API_TOKEN     "$CLOUDFLARE_API_TOKEN"
set_secret CLOUDFLARE_ZONE_ID       "$CLOUDFLARE_ZONE_ID"
set_secret XAI_API_KEY              "$XAI_API_KEY"
set_secret OPENAI_API_KEY           "$OPENAI_API_KEY"
set_secret EVOLUTION_API_URL        "$EVOLUTION_API_URL"
set_secret EVOLUTION_API_KEY        "$EVOLUTION_API_KEY"
set_secret ASAAS_WEBHOOK_TOKEN      "$ASAAS_WEBHOOK_TOKEN"
set_secret WHATSAPP_WEBHOOK_SECRET  "$WHATSAPP_WEBHOOK_SECRET"
set_secret CRON_SECRET              "$CRON_SECRET"

echo ""
echo "✅ Concluído."
echo ""
echo "📋 Guarde estes valores gerados (você vai precisar deles):"
echo "   ASAAS_WEBHOOK_TOKEN     = $ASAAS_WEBHOOK_TOKEN"
echo "   WHATSAPP_WEBHOOK_SECRET = $WHATSAPP_WEBHOOK_SECRET"
echo "   CRON_SECRET             = $CRON_SECRET"
echo ""
echo "Confira em: https://supabase.com/dashboard/project/$PROJECT_REF/settings/functions"
