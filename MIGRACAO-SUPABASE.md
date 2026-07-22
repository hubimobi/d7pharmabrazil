# Migração Supabase — Lovable → projeto novo (d7pharmabrazil)

Migra o banco do projeto **antigo (Lovable)** para o **novo**, além de schema,
dados, edge functions e secrets.

| | Projeto | Ref |
|---|---|---|
| **Origem** (Lovable) | antigo | `xufiemrhlmirkrdrcxox` |
| **Destino** (novo) | d7pharmabrazil | `ecvmnfiewsovcpvviklz` |

> ⚠️ Rode tudo isto **na sua máquina** (Windows/Mac/Linux com internet aberta).
> O ambiente do Claude Code na web **não** tem acesso de rede ao Postgres do Supabase,
> por isso esta etapa é manual.

---

## 0. Pré-requisitos

Instale os dois:

1. **Supabase CLI** — https://supabase.com/docs/guides/local-development/cli/getting-started
   - Windows (scoop): `scoop install supabase`
   - Mac (brew): `brew install supabase/tap/supabase`
2. **Client do PostgreSQL 17** (traz `psql` e `pg_dump`):
   - Windows: instalador do PostgreSQL 17 (https://www.postgresql.org/download/windows/)
   - Mac: `brew install postgresql@17`

Confira: `psql --version` (precisa ser **15 ou maior**, de preferência 17).

---

## 1. Pegar as connection strings (URI) dos dois projetos

**Projeto ANTIGO (Lovable):**
- Abra o painel do Supabase daquele projeto (pelo Lovable ou em supabase.com).
- `Project Settings → Database → Connection string → URI` (aba **Direct connection**).
- Se não souber a senha, use `Reset database password` ali mesmo.
- Fica assim:
  `postgresql://postgres:SENHA_ANTIGA@db.xufiemrhlmirkrdrcxox.supabase.co:5432/postgres`

**Projeto NOVO (d7pharmabrazil):**
- https://supabase.com/dashboard/project/ecvmnfiewsovcpvviklz
- Botão `Connect → Direct connection` (URI).
- `postgresql://postgres:SENHA_NOVA@db.ecvmnfiewsovcpvviklz.supabase.co:5432/postgres`

Exporte nas variáveis (troque as senhas):

```bash
export OLD_DB_URL="postgresql://postgres:SENHA_ANTIGA@db.xufiemrhlmirkrdrcxox.supabase.co:5432/postgres"
export NEW_DB_URL="postgresql://postgres:SENHA_NOVA@db.ecvmnfiewsovcpvviklz.supabase.co:5432/postgres"
```
(No Windows PowerShell use `$env:OLD_DB_URL="..."`)

---

## 2. Exportar do ANTIGO e importar no NOVO (schema + dados)

```bash
mkdir -p dump-supabase && cd dump-supabase

# --- Exporta do projeto ANTIGO ---
# Estrutura (tabelas, views, funções, RLS, etc.)
supabase db dump --db-url "$OLD_DB_URL" -f schema.sql

# Dados (conteúdo das tabelas, incluindo auth.users e storage)
supabase db dump --db-url "$OLD_DB_URL" --data-only --use-copy -f data.sql

# --- Importa no projeto NOVO ---
psql "$NEW_DB_URL" --single-transaction --variable ON_ERROR_STOP=1 -f schema.sql
psql "$NEW_DB_URL" --single-transaction --variable ON_ERROR_STOP=1 -f data.sql
```

> Se `data.sql` falhar por conflito com linhas já existentes no projeto novo
> (ex.: um usuário seed), rode antes um reset limpo do destino ou remova as linhas
> conflitantes. Como o projeto novo está vazio, normalmente não há conflito.

Confira no dashboard do projeto novo se as tabelas e os dados apareceram.

---

## 3. Migrar as Edge Functions (estão neste repositório)

O repositório já contém as ~54 functions em `supabase/functions/`.

```bash
# na raiz do repositório
supabase link --project-ref ecvmnfiewsovcpvviklz
supabase functions deploy   # faz deploy de todas de uma vez
```

`supabase/config.toml` já está apontando para o projeto novo, então o `verify_jwt`
das functions de webhook (asaas, whatsapp, signup-tenant) já vai correto.

---

## 4. Recadastrar os SECRETS das Edge Functions

As functions usam chaves que **não** vêm no dump do banco. Recadastre no projeto novo
as que forem usadas (Asaas, Bling, WhatsApp/Evolution, OpenAI, etc.):

```bash
supabase secrets set NOME_DA_CHAVE="valor" --project-ref ecvmnfiewsovcpvviklz
# ou em lote a partir de um arquivo:
supabase secrets set --env-file ./supabase/functions/.env --project-ref ecvmnfiewsovcpvviklz
```

Liste o que a versão antiga tinha no painel antigo: `Edge Functions → Secrets`.

---

## 5. Chave anon do projeto novo (para o site conectar)

No `.env` deste repositório troque o placeholder pela **anon public** do projeto novo:

- `Dashboard (ecvmnfiewsovcpvviklz) → Project Settings → API → Project API keys → anon public`
- Cole em `SUPABASE_PUBLISHABLE_KEY` **e** `VITE_SUPABASE_PUBLISHABLE_KEY` no `.env`.

Depois commite e faça merge para `main` — o GitHub Actions builda e publica no KingHost.

---

## 6. Conferir (advisors / RLS)

No dashboard do projeto novo, rode o **Advisor** (Security + Performance) e confirme
que as políticas RLS vieram corretas antes de abrir o site ao público.
