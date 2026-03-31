

# 3 Correções: Home Sections, Regras de Acesso e CSV de Leads

---

## 1. Banner Destaque e Oferta Relâmpago — Respeitar Ordem e Toggle

**Problema**: Em `Index.tsx`, `section_highlight_banner` e `section_flash_sale` têm `alwaysShow: true`, ignorando o toggle de ativo/desativo. Em `DesignSettingsPage.tsx`, `ALWAYS_SHOW_SECTIONS` impede que o switch apareça para essas seções.

**Correção**:
- **`src/pages/Index.tsx`**: Remover `alwaysShow: true` de ambas as seções para que obedeçam `s?.[key] !== false`
- **`src/pages/admin/DesignSettingsPage.tsx`**: Remover `ALWAYS_SHOW_SECTIONS` ou esvaziar o array, exibindo o Switch para todas as seções

---

## 2. Regras de Acesso — Sincronizar com Menus Atuais

**Problema**: O `MENU_SECTIONS` em `UsersPage.tsx` não contempla todos os menus do sidebar. Faltam:

| Menu no Sidebar | Chave que falta em MENU_SECTIONS |
|---|---|
| Recuperação | `recovery` |
| Recompra (+LTV) | `repurchase` |
| Combos | `combos` |
| WhatsApp | `whatsapp` |
| Ferramentas | `tools` |
| Feedbacks | `feedbacks` |

**Correção** em `src/pages/admin/UsersPage.tsx`:
- Adicionar as 6 entradas faltantes ao array `MENU_SECTIONS`
- Atualizar `DEFAULT_ACCESS` para cada role com as permissões adequadas (ex: `financeiro` não vê `tools`/`whatsapp`, `representative` não vê nenhum desses novos)

---

## 3. Importação CSV com Pareação de Colunas + Exportar/Excluir Lista

**Problema**: A importação atual tenta detectar colunas automaticamente pelo nome do cabeçalho, sem permitir ao usuário confirmar ou ajustar o mapeamento. Não existe funcionalidade de agrupar leads por importação para exportar ou excluir em lote.

**Correção** em `src/pages/admin/LeadsPage.tsx`:

### 3a. Pareação de colunas antes de importar
- Após o upload/colagem do CSV, exibir um **passo intermediário** com:
  - Preview das primeiras 3 linhas do CSV
  - Para cada coluna do CSV, um `<Select>` para mapear ao campo: Nome, E-mail, Telefone, Cidade, Estado, Ignorar
  - Botão "Confirmar e Importar" que usa o mapeamento manual
- Adicionar estado `importStep: "upload" | "mapping" | "importing"` para controlar o fluxo em 2 etapas dentro do mesmo dialog

### 3b. Rastreamento de lote de importação
- Ao importar, gerar um `batch_id` (UUID ou timestamp) e salvar em cada lead importado via campo `source` como `csv_import_BATCH_ID`
- Adicionar um filtro por "Fonte" no painel de leads

### 3c. Exportar e Excluir lista importada
- Adicionar um dropdown ou seção "Importações" que lista as importações feitas (agrupando por `source` que contém `csv_import`)
- Cada grupo mostra: data, quantidade de leads, botão "Exportar" e "Excluir Todos"
- Excluir Todos deleta todos os leads com aquele `source`/batch

**Nota**: Não será necessária migração de banco — o campo `source` já existe na tabela `popup_leads`.

---

## Resumo técnico

| Arquivo | Mudança |
|---|---|
| `src/pages/Index.tsx` | Remover `alwaysShow` de highlight_banner e flash_sale |
| `src/pages/admin/DesignSettingsPage.tsx` | Remover `ALWAYS_SHOW_SECTIONS` ou esvaziar |
| `src/pages/admin/UsersPage.tsx` | Adicionar menus faltantes + atualizar DEFAULT_ACCESS |
| `src/pages/admin/LeadsPage.tsx` | Fluxo de pareação CSV em 2 etapas, batch tracking, exportar/excluir por lote |

