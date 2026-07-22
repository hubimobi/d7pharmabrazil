# Etapa 2 — Exportar dados do Lovable Cloud

## 2.1 Exportar via painel Lovable
1. No projeto Lovable, abra o **Cloud** (menu lateral).
2. **Advanced settings → Export data**.
3. Clique em **Prepare export**. Aguarde o e-mail/notificação (5–20 min dependendo do tamanho).
4. Baixe o arquivo `.zip` — contém dumps `.sql` do schema `public` + dados.

## 2.2 Importar no seu Supabase
Extraia o zip. Você terá arquivos como `schema.sql` e `data.sql` (ou similar).

```bash
# Extrair
unzip lovable-export.zip -d ./export

# Importar schema primeiro
psql "postgresql://postgres:[SENHA]@db.[SEU_REF].supabase.co:5432/postgres" \
  -f ./export/schema.sql

# Depois os dados
psql "postgresql://postgres:[SENHA]@db.[SEU_REF].supabase.co:5432/postgres" \
  -f ./export/data.sql
```

## 2.3 Recriar policies, functions e triggers manualmente (se o export não incluir)

Se o export **não** trouxer functions/triggers/policies (alguns exports só trazem tabelas), rode este SQL adicional. Peça pra mim gerar o arquivo `bootstrap.sql` completo com:
- Todas as 34 funções listadas em `<db-functions>`
- Todas as RLS policies das ~60 tabelas
- Todos os triggers de audit/updated_at/etc.

**Diga só "gera o bootstrap.sql" e eu monto o arquivo completo aqui.**

## 2.4 Validar
```bash
psql "postgresql://..." -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1;"
# Deve listar ~65 tabelas
```

```bash
psql "postgresql://..." -c "SELECT COUNT(*) FROM public.products;"
# Deve bater com a contagem no Lovable Cloud
```

## Pronto
Banco migrado. Avance para **Etapa 3** (storage).
