
Objetivo: corrigir o comportamento do prescritor no checkout para ficar exatamente como você já tinha pedido, sem mexer no que já está funcionando.

1. O que foi verificado
- A configuração já existe no admin:
  - `src/pages/admin/CheckoutSettingsPage.tsx`
  - campo: `checkout_prescriber_required`
  - descrição atual já diz que, ao desativar, o vínculo deve ocorrer por cupom ou link.
- Nos checkouts V1 e V2:
  - o campo de prescritor só aparece quando a configuração está ativa
  - a validação obrigatória também só acontece quando ativa
- No checkout V3:
  - hoje não segue a mesma regra
  - ele não usa a configuração para decidir exibição/obrigatoriedade
  - ele força `doctor_id` apenas por link (`getActiveRef()?.doctorId`)
  - isso deixa o comportamento inconsistente entre os 3 modelos

2. Problema real encontrado
Hoje a lógica está incompleta:
- V1 e V2 escondem/validam corretamente o campo quando desativado
- mas o vínculo automático por cupom não está garantido no frontend
- V3 está desalinhado com o comportamento dos outros checkouts
- resultado: o requisito “desativar campo obrigatório, mas manter vínculo automático por link ou cupom” não está implementado de forma uniforme

3. Ajuste que vou fazer
Vou padronizar os 3 checkouts com esta regra:

```text
Se "Prescritor obrigatório" = ativo
- mostrar campo de prescritor
- exigir seleção manual ou "não sei"

Se "Prescritor obrigatório" = desativado
- esconder campo de prescritor
- não exigir seleção manual
- manter vínculo automático se vier por:
  - link com prescritor
  - cupom vinculado ao prescritor
```

4. Como isso será aplicado
A. Revisar os 3 checkouts
- `src/pages/CheckoutPage.tsx`
- `src/pages/CheckoutPageV2.tsx`
- `src/pages/CheckoutPageV3.tsx`

Vou alinhar:
- renderização do campo
- validação antes de avançar/finalizar
- montagem do `doctor_id` enviado no pagamento

B. Criar resolução única do prescritor antes do pagamento
Em vez de cada checkout decidir isso de um jeito, vou usar a mesma prioridade lógica:

```text
1. Se veio por link com prescritor: usar esse prescritor
2. Senão, se o usuário selecionou prescritor manualmente: usar o selecionado
3. Senão, se houver cupom aplicado vinculado a prescritor: usar o prescritor do cupom
4. Senão: null
```

5. O que precisa ser ajustado tecnicamente
Frontend
- padronizar uma função/trecho compartilhado de resolução de `doctor_id`
- garantir que V3 respeite `checkout_prescriber_required`
- manter o preenchimento automático por link sem exibir campo quando a configuração estiver desativada
- ao aplicar cupom, permitir obter o `doctor_id` vinculado ao cupom para o envio do pedido

Backend
- revisar `supabase/functions/create-payment/index.ts`
- idealmente garantir uma blindagem extra no backend:
  - se chegar `coupon_code` e não vier `doctor_id`
  - resolver o prescritor do cupom antes de salvar o pedido
- isso evita erro mesmo se algum checkout falhar no frontend

6. Resultado esperado
Depois do ajuste:
- o botão/configuração do prescritor no admin passa a funcionar de verdade nos 3 checkouts
- quando desativado:
  - o campo some
  - o cliente não precisa preencher
  - pedidos por link continuam vinculados
  - pedidos por cupom vinculado também continuam vinculados
- quando ativado:
  - o fluxo continua exigindo prescritor normalmente

7. Arquivos envolvidos
- `src/pages/admin/CheckoutSettingsPage.tsx` (somente conferência, sem mudança estrutural)
- `src/pages/CheckoutPage.tsx`
- `src/pages/CheckoutPageV2.tsx`
- `src/pages/CheckoutPageV3.tsx`
- `supabase/functions/create-payment/index.ts`

8. Observação importante
O problema não é só visual. A interface do admin já sugere um comportamento que hoje o checkout entrega só parcialmente. A correção certa é alinhar regra de negócio + envio do pedido, não apenas esconder o campo.

Detalhes técnicos
- Hoje V1/V2 usam `selectedDoctorId === "sem-prescritor" ? null : selectedDoctorId`.
- V3 hoje usa apenas `getActiveRef()?.doctorId || null`, então está incompleto.
- O vínculo por cupom depende de resolver `doctor_id` a partir da tabela `coupons`, que já possui relação com `doctor_id`.
