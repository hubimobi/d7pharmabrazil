
## Plano: Padronizar ícones, unificar Broadcast (Funil + Flow) e melhorar fila

### 1. Substituir todos os emojis por ícones Lucide
**Onde tem emoji em selects/labels** (busca ampla no admin):
- `WhatsAppPage.tsx` → BroadcastTab: filtros de audiência (📋 Todos, 🏷️ Por Tag, 👤 Por Representante, 👨‍⚕️ Por Prescritor, 📦 Por Produto, 📍 Por Estado/Cidade)
- ContactsTab, FunnelsTab, TemplatesTab, SendingConfigTab, QueueTab — qualquer emoji em `SelectItem`, badges, headers
- `WhatsAppFlowEditor.tsx` — varredura final (qualquer emoji restante em legendas, badges de status, indicadores de delay)
- Outros admin selects que ainda usem emoji (RepurchasePage, abandoned carts, etc.) — fazer pass de busca e trocar.

**Padrão a aplicar:**
```tsx
<SelectItem value="tag">
  <span className="flex items-center gap-2">
    <Tag className="h-4 w-4 text-muted-foreground" /> Por Tag
  </span>
</SelectItem>
```
Mapeamento:
- Todos os contatos → `Users`
- Por Tag → `Tag`
- Por Representante → `Briefcase`
- Por Prescritor → `Stethoscope`
- Por Produto → `Package`
- Por Estado/Cidade → `MapPin`

### 2. Broadcast: suportar Funil OU Flow
Hoje BroadcastTab só lista `whatsapp_funnels`. Adicionar:
- **Toggle no topo**: `[Funil clássico] [Flow visual]` (Tabs/SegmentedControl)
- Quando "Flow": carrega `whatsapp_flows` (active=true) no select.
- No disparo:
  - Funil → mantém lógica atual (insere no `whatsapp_message_queue` por step).
  - Flow → chama edge function existente que dispara flow para um contato (ou cria nova `whatsapp-broadcast-flow` que itera contatos e enfileira start do flow). Verificar se já existe execução de flow por contato; se sim, reaproveitar.
- Preview de contagem de contatos continua igual.

### 3. Redesenhar Fila de Transmissão (estilo ManyChat/BotFlow)
**Problema atual**: lista plana de itens individuais, difícil de entender o que está rolando.

**Novo design (QueueTab):**
- **Header com KPIs em cards**: Pendentes / Enviando agora / Enviadas hoje / Falhas / Próximo envio em (countdown)
- **Agrupamento por Campanha/Funil**: cada broadcast disparado vira um "card de campanha" expansível mostrando:
  - Nome do funil/flow + horário disparo
  - Barra de progresso (X/Y enviadas, %)
  - Status chips: Enviadas (verde), Pendentes (amarelo), Falhas (vermelho)
  - Velocidade estimada (msgs/min) + ETA conclusão
  - Ações: Pausar campanha / Cancelar restantes / Reenviar falhas
- **Lista detalhada** colapsável dentro de cada card: contato, telefone, status, horário agendado, instância usada, último erro
- **Live update**: subscribe via Supabase realtime no `whatsapp_message_queue` para refletir progresso sem reload
- **Filtros no topo**: por status (pendente/enviado/erro), por instância, busca por telefone/nome
- Visual: cards com `Card` shadcn, `Progress` bar, `Badge` para status, ícones Lucide (`Send`, `Clock`, `CheckCheck`, `AlertCircle`, `Pause`, `Play`)

### Arquivos modificados
- `src/pages/admin/WhatsAppPage.tsx` (BroadcastTab + QueueTab + ContactsTab + outros emojis)
- `src/components/admin/WhatsAppFlowEditor.tsx` (varredura final emojis)
- Possível nova edge function `whatsapp-broadcast-flow` se flows ainda não tiverem entrypoint de broadcast (verificar antes)

### Investigação antes de codar
- Verificar se há tabela/coluna que agrupe itens da fila por "broadcast batch" (ex: `broadcast_id`); se não existir, adicionar coluna `broadcast_id uuid` em `whatsapp_message_queue` + migration, e gerar um id ao disparar broadcast.
- Verificar como flows são executados por contato hoje (entrada do flow runner) para reaproveitar no broadcast.
