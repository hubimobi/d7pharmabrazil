

# Templates e Funis Sumiram — Diagnóstico e Correção

## Problema
Os dados estão no banco de dados (9 templates, 4 funis), mas não aparecem no painel. A causa é um problema de **permissões (RLS)**.

As tabelas `whatsapp_templates`, `whatsapp_funnels` e `whatsapp_funnel_steps` têm RLS ativa com uma única policy: `is_admin()`. Essa função só aceita o role exato `admin`. Usuários com roles como `administrador`, `super_admin`, `gestor` etc. são bloqueados.

Por exemplo, o usuário "BOSS" tem role `administrador` — que não é reconhecido pela policy atual.

## Solução

### 1. Migração SQL — Atualizar policies das 3 tabelas WhatsApp

Substituir a policy `is_admin()` por uma que aceite todos os roles administrativos e super_admin:

```sql
-- whatsapp_templates
DROP POLICY "Admins can manage whatsapp_templates" ON whatsapp_templates;
CREATE POLICY "staff_manage_templates" ON whatsapp_templates FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','super_admin','administrador','gestor']::app_role[]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','super_admin','administrador','gestor']::app_role[]));

-- whatsapp_funnels (mesma lógica)
-- whatsapp_funnel_steps (mesma lógica)
```

Isso usa a função `has_any_role()` que já existe no projeto, cobrindo todos os roles relevantes.

### 2. Nenhuma alteração de código necessária

O frontend já faz `select("*")` normalmente — o bloqueio é 100% na camada de banco.

## Detalhes técnicos
- **Causa raiz**: Policy RLS restrita a `is_admin()` que verifica apenas role `admin` exato
- **Afetadas**: `whatsapp_templates`, `whatsapp_funnels`, `whatsapp_funnel_steps`
- **Correção**: Trocar policy para `has_any_role()` com array de roles administrativos
- **Risco**: Zero — só amplia acesso para roles que já são administrativos

