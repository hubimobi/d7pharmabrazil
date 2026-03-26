

## Configurações de Posição e Aparição dos Widgets

### O que será feito

Adicionar ao painel admin (Integrações) e aos componentes do site opções para:

1. **Alinhamento** (direita ou esquerda) -- para Webchat e WhatsApp
2. **Delay de aparição** (X segundos) -- para ambos
3. **Aparecer após rolagem** (alternativa ao delay) -- para ambos

### Mudanças no banco

Migration adicionando 6 colunas na `store_settings`:

```sql
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS whatsapp_position text DEFAULT 'right',
  ADD COLUMN IF NOT EXISTS whatsapp_delay_seconds integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS whatsapp_show_on_scroll boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS webchat_position text DEFAULT 'right',
  ADD COLUMN IF NOT EXISTS webchat_delay_seconds integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS webchat_show_on_scroll boolean DEFAULT false;
```

### Mudanças nos arquivos

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useStoreSettings.tsx` | Adicionar os 6 novos campos na interface |
| `src/pages/admin/IntegrationsPage.tsx` | Adicionar controles de posição (Select direita/esquerda), delay (Input numérico em segundos), e toggle "aparecer após rolagem" nos cards de Webchat e WhatsApp |
| `src/components/WhatsAppButton.tsx` | Usar `useState` + `useEffect` para controlar visibilidade com delay ou scroll listener; aplicar classe `left-6` ou `right-6` dinamicamente |
| `src/components/WebchatWidget.tsx` | Aplicar mesma lógica de delay/scroll e posicionamento CSS via classe injetada |

### Lógica de aparição

- Se `show_on_scroll = true`: componente aparece quando o usuário rolar mais de 300px
- Se `delay_seconds > 0`: componente aparece após X segundos
- Se ambos estiverem desativados (delay=0, scroll=false): aparece imediatamente
- Se ambos estiverem ativados: aparece quando qualquer condição for satisfeita primeiro

