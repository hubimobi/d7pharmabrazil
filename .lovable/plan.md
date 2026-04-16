

# Melhorias Profundas no Editor de Fluxos WhatsApp

## Resumo
Reescrever o `WhatsAppFlowEditor.tsx` com funcionalidades avancadas inspiradas no Typebot e ManyChat, incluindo novos tipos de blocos, configuracoes ricas de mensagem, teste visual estilo WhatsApp, e logica de condicoes/escolhas completa.

## Mudancas

### 1. Novos tipos de blocos (alem dos existentes)

- **Escolha (choice)**: Apresenta opcoes ao usuario (ex: "1 - Sim", "2 - Nao"). Cada opcao vira uma saida separada com handle proprio. Opcoes podem vincular uma tag ao lead.
- **Acao (action)**: Pode executar: adicionar tag, ir para outro fluxo, acionar bloco especifico, remover tag, marcar como convertido.

### 2. Bloco Espera (wait) — aprimorado

- Unidade selecionavel: minutos, horas, dias
- Opcao "ate data/hora especifica" (ex: segunda 9h)
- Campo para escolher dia da semana + horario

### 3. Bloco Condicao (condition) — aprimorado

- Tipo de condicao: "por opcao" (lista de palavras-chave por linha) ou "respondeu algo" (qualquer resposta)
- No modo por opcao: se a resposta *contem* uma das palavras da linha, segue aquele caminho
- Saida "Default/Nenhuma" para quando nenhuma condicao bate

### 4. Bloco Mensagem — rico

- Escolher template existente (dropdown de `whatsapp_templates`)
- Texto livre com variaveis ({Nome}, {Produto}, etc.)
- Anexar arquivo (URL de arquivo/imagem)
- Anexar link (com opcao de link personalizado de produto com variaveis de prescritor/checkout)
- Enviar audio pre-salvo (URL)
- Enviar video (URL)
- Catalogo do WhatsApp (flag booleana)

### 5. Vincular/desvincular nos

- Ao clicar no handle de saida, entrar em modo "conectando" com highlight visual
- Ao clicar em edge existente, mostrar opcao de excluir (ja existe, manter)
- Botao "Desvincular tudo" no painel de propriedades para remover todas as conexoes de um no

### 6. Testar Fluxo

- Botao "Testar" na toolbar do canvas
- Abre dialog com mockup de WhatsApp (reutilizar visual do teste de funil existente)
- Simula a execucao sequencial do fluxo, seguindo as edges
- Mostra mensagens aparecendo na timeline do celular
- Campos de variaveis para preencher (Nome, Telefone, etc.)

### 7. Excluir no

- Ja existe, manter funcional
- Ao excluir, remover todas as edges conectadas (ja implementado)

## Arquivo modificado

- `src/components/admin/WhatsAppFlowEditor.tsx` — reescrita significativa (~1200 linhas)

### Detalhes tecnicos

**NODE_TYPES atualizado:**
```
start, message, condition, wait, input, ai_gen, transfer, set_variable, choice, action, end
```

**Dados de bloco Escolha:**
```json
{
  "type": "choice",
  "data": {
    "question": "O que deseja?",
    "options": [
      { "label": "Ver produtos", "tag": "interesse_produtos" },
      { "label": "Falar com atendente", "tag": "" },
      { "label": "Outro", "tag": "" }
    ]
  }
}
```

**Dados de bloco Acao:**
```json
{
  "type": "action",
  "data": {
    "action_type": "add_tag" | "remove_tag" | "go_to_flow" | "trigger_block",
    "tag": "lead_quente",
    "flow_id": "uuid",
    "block_id": "node_id"
  }
}
```

**Dados de bloco Mensagem enriquecido:**
```json
{
  "type": "message",
  "data": {
    "content_type": "text" | "template" | "file" | "audio" | "video" | "catalog" | "link",
    "content": "texto...",
    "template_id": "uuid",
    "file_url": "",
    "audio_url": "",
    "video_url": "",
    "link_url": "",
    "link_type": "custom" | "product",
    "product_link_config": { "product_id": "", "include_prescriber": true, "checkout_version": "3" },
    "use_catalog": false
  }
}
```

**Wait aprimorado:**
```json
{
  "delay_value": 5,
  "delay_unit": "m" | "h" | "d",
  "wait_type": "delay" | "specific_date",
  "specific_day": "monday",
  "specific_time": "09:00"
}
```

**Condition aprimorado:**
```json
{
  "condition_type": "keywords" | "any_response",
  "options": [
    { "label": "Interessado", "keywords": ["sim", "quero", "interesse"] },
    { "label": "Nao quer", "keywords": ["nao", "cancelar"] }
  ]
}
```

## Sem mudancas no banco
A tabela `whatsapp_flows` ja armazena `nodes` e `edges` como JSONB, entao toda a logica nova cabe na estrutura existente.

