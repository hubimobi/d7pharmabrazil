

## Problema

Na aba **WhatsApp → Disparos em Massa** (Broadcasts), a coluna/campo "Número" da lista de instâncias mostra o `instance_name` técnico (ex: `d7pharma_1776107871039`) em vez do nome do dono e do telefone real conectado (ex: `Luciano Leal — 55 47 8482-6726`).

A informação correta já existe no banco — a tabela `whatsapp_instances` tem as colunas `owner_name` (ou `profile_name`) e `owner_jid`/`phone_number` que são preenchidas pelo webhook da Evolution quando a conexão é estabelecida (vimos esses dados na lista principal: "Luciano Leal / 554784826726").

## Solução

Trocar a renderização do seletor/lista de instâncias do módulo de Broadcasts para mostrar:

```text
┌──────────────────────────────────────────┐
│ ☑  Luciano Leal                          │
│    +55 47 8482-6726                      │
│    🟢 Conectado                           │
└──────────────────────────────────────────┘
```

em vez do atual:

```text
┌──────────────────────────────────────────┐
│ ☑  d7pharma_1776107871039                │
└──────────────────────────────────────────┘
```

### Detalhes de implementação

1. **Localizar o componente de seleção de instâncias do Broadcast**  
   Provavelmente em `src/components/admin/` (ex: `BroadcastDialog.tsx` / dentro de `WhatsAppPage.tsx` aba broadcasts). Vou inspecionar para confirmar antes de editar.

2. **Atualizar a query** que carrega as instâncias para também trazer:
   - `owner_name` (ou `profile_name` — o que estiver populado)
   - `phone_number` (ou derivar de `owner_jid` removendo `@s.whatsapp.net`)
   - `connection_state` / `status`

3. **Helper de formatação** — criar uma função pequena `formatInstanceLabel(inst)`:
   - Nome: `inst.owner_name || inst.profile_name || "Sem nome"`
   - Telefone: formatado como `+55 (47) 8482-6726` a partir de `phone_number` ou `owner_jid.split("@")[0]`
   - Fallback: se nenhum dos dois estiver preenchido, mostra o `instance_name` em cinza com aviso "Aguardando dados do WhatsApp"

4. **Aplicar nos três pontos onde a instância aparece no Broadcast:**
   - Lista de seleção de "Números participantes" (checkboxes/multi-select).
   - Resumo "X instâncias selecionadas" (tooltip ou chips).
   - Coluna de origem nos logs/relatórios da campanha (se aparecer o ID).

5. **Sem mudança de schema nem migration.** Apenas leitura de colunas já existentes.

## Resultado esperado

Ao abrir a tela de Broadcasts, o usuário vê os WhatsApps disponíveis identificados pelo nome do dono + número de telefone real conectado, igual aparece no celular, em vez do ID interno. Se algum número ainda não tiver os metadados sincronizados, o nome técnico aparece com aviso visual para o usuário saber que precisa reconectar/aguardar.

