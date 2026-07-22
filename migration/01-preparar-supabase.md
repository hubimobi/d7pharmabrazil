# Etapa 1 — Preparar seu Supabase

## 1.1 Criar projeto
1. Acesse https://supabase.com/dashboard
2. **New project** → nome: `d7pharma` (ou o que preferir)
3. **Region**: `South America (São Paulo)` — `sa-east-1`
4. **Database password**: gere uma senha forte (salve num gerenciador — vai precisar depois)
5. Plano: **Free** (você pode subir para Pro depois se estourar limites)

## 1.2 Anotar credenciais
Após criado, vá em **Project Settings → API** e anote:

```
Project URL:        https://xxxxxxxxxxxxx.supabase.co
anon public key:    eyJhbGciOi... (longa)
service_role key:   eyJhbGciOi... (SECRETA, nunca vai no frontend)
Project Ref:        xxxxxxxxxxxxx (só o subdomínio)
```

Em **Project Settings → Database → Connection string** anote também:
```
Direct connection: postgresql://postgres:[SUA_SENHA]@db.xxxxx.supabase.co:5432/postgres
```

## 1.3 Habilitar extensões
**Database → Extensions**, habilitar:
- `pgcrypto` (geralmente já vem)
- `pg_cron` — para os jobs de whatsapp
- `pg_net` — para HTTP requests do banco
- `uuid-ossp` (opcional, `gen_random_uuid` do pgcrypto já resolve)

## 1.4 Instalar Supabase CLI (na sua máquina local)
```bash
# macOS
brew install supabase/tap/supabase

# Linux/WSL
curl -fsSL https://supabase.com/cli/install.sh | sh

# Verificar
supabase --version   # precisa ser >= 1.150
```

Login:
```bash
supabase login
```

## Pronto
Quando tiver as 3 credenciais anotadas e a CLI instalada, avance para **Etapa 2**.
