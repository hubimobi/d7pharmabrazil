# Migração Lovable Cloud → Seu Supabase + Servidor Verse

Este diretório contém tudo que você precisa para migrar o projeto para fora do Lovable Cloud.

## Ordem de execução

1. **`01-preparar-supabase.md`** — Criar projeto, habilitar extensões, pegar credenciais.
2. **`02-exportar-dados.md`** — Exportar schema + dados do Lovable Cloud.
3. **`03-migrar-storage.mjs`** — Script Node para copiar todos os arquivos de storage.
4. **`04-edge-functions.md`** — Deploy das 51 edge functions no seu Supabase via CLI.
5. **`05-secrets.md`** — Guia detalhado de cada secret: onde obter, como cadastrar.
6. **`06-frontend-adapter.md`** — Adaptar client.ts, .env e types para seu projeto.
7. **`07-deploy-verse-nginx.md`** — Build, upload e configuração do servidor Verse.
8. **`08-webhooks-externos.md`** — Reconfigurar URLs em Asaas, Bling, Evolution, GHL.
9. **`09-checklist-final.md`** — Validação rota a rota.

## Estimativa
- Trabalho manual seu: 3–5 horas (painéis, DNS, secrets).
- Trabalho técnico: 4–8 horas (a maior parte já está pronta neste diretório).

## Suporte
Se travar em qualquer etapa, me avise o número da etapa que ajusto o script/guia.
