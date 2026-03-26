

## Melhoria: CEP de origem configurável no cálculo de frete

### Situação atual

O cálculo de frete via Melhor Envio está **funcionando corretamente**:
- Dimensões e peso dos produtos são lidos do banco de dados
- Valores são consolidados em um pacote único com regras de mínimo/máximo
- O valor do seguro é calculado com base no preço × quantidade
- Opções de frete são retornadas ordenadas por preço

**Problema identificado**: O CEP de origem está fixo como `01001000` (São Paulo) na edge function. Deveria usar o CEP cadastrado nas configurações da loja.

### Plano

#### 1. Atualizar edge function para buscar CEP de origem do banco
- Na `calculate-shipping/index.ts`, consultar `store_settings.address_cep` para usar como CEP de origem
- Manter fallback para `01001000` caso não esteja configurado

#### 2. Nenhuma mudança no frontend necessária
- O `ShippingCalculator` e as páginas de checkout/produto já passam corretamente todos os dados (peso, dimensões, preço, quantidade)

### Arquivo alterado

| Arquivo | Mudança |
|---|---|
| `supabase/functions/calculate-shipping/index.ts` | Buscar `address_cep` de `store_settings` como CEP de origem |

### Detalhes técnicos

Na edge function, antes de montar o body da requisição:
```typescript
// Buscar CEP de origem das configurações
const { data: settings } = await supabaseClient
  .from("store_settings")
  .select("address_cep")
  .limit(1)
  .single();
const originCep = (settings?.address_cep || "01001000").replace(/\D/g, "");
```

Usar `originCep` no campo `from.postal_code` ao invés do valor hardcoded.

