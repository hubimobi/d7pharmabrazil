

## Problema

Quando o usuário escaneia o QR Code, a instância conecta na Evolution (aparece como "open"/"connected" nos logs e no WhatsApp do celular), mas o modal do QR Code **continua aberto** sem nenhum feedback. O usuário não sabe se deu certo e precisa fechar manualmente e clicar em "Status" para confirmar.

## Causa

O `Dialog` de QR Code em `WhatsAppPage.tsx` (linhas 561-573) só mostra a imagem estática. Não existe:
- Polling que verifique o status da instância enquanto o QR está exibido.
- Feedback visual de "aguardando conexão" / "conectado".
- Auto-fechamento após conexão bem-sucedida.

## Solução

Transformar o modal do QR Code em um fluxo autoguiado com polling ativo:

### 1. Polling a cada 3 segundos enquanto o modal estiver aberto
- Ao abrir o `qrDialog`, inicia um `setInterval` que chama `whatsapp-instance` com `action: "status"` para a instância em questão.
- Para o polling quando o modal fechar, o componente desmontar ou o status virar `connected`.

### 2. Estados visuais no modal

```text
┌─ Escanear QR Code ─────────────┐
│                                │
│     [imagem do QR 256x256]     │
│                                │
│  ⏳ Aguardando escaneamento...  │   ← estado inicial (raw_state = "connecting" / close)
│                                │
│  Abra WhatsApp → Dispositivos  │
│  Conectados → Conectar         │
└────────────────────────────────┘

┌─ Conectando... ────────────────┐
│                                │
│     [imagem do QR esmaecida]   │
│                                │
│  🔄 Pareando com WhatsApp...    │   ← intermediário (raw_state = "connecting" após scan)
└────────────────────────────────┘

┌─ ✅ Pronto! ───────────────────┐
│                                │
│       ✔ (ícone grande verde)   │
│                                │
│   WhatsApp conectado com       │   ← final (raw_state = "open")
│   sucesso!                     │
│                                │
│   Fechando em 2s...            │
└────────────────────────────────┘
```

### 3. Auto-fechamento
- Quando o polling detectar `raw_state === "open"` ou `status === "connected"`:
  - Mostra tela de sucesso por 2 segundos.
  - Fecha o modal automaticamente.
  - Chama `loadInstances()` para atualizar a lista.
  - Dispara toast `"WhatsApp conectado com sucesso!"`.

### 4. Timeout e expiração do QR
- Se após 60 segundos ainda não conectou, exibir botão **"Gerar novo QR"** que re-invoca `action: "qrcode"`.
- QR Codes da Evolution expiram rapidamente — botão de refresh manual evita ficar preso.

### 5. Badge de status em tempo real na lista
Na lista de instâncias (já existente), aproveitar que `loadInstances()` é chamado após a conexão para refletir o badge de "Conectado" imediatamente sem exigir refresh da página.

## Arquivos afetados

- `src/pages/admin/WhatsAppPage.tsx`
  - Estado `qrDialog` ganha novos campos: `pollStatus: "waiting" | "connecting" | "connected"`, `pollStartedAt: number`.
  - Novo `useEffect` com `setInterval` disparado pela abertura do modal.
  - JSX do `Dialog` (linhas 561-573) refatorado para mostrar os três estados + botão "Gerar novo QR".
  - Função `getQR(inst)` e o sucesso do `createInstance()` resetam os campos de polling ao abrir.

Nenhuma mudança em edge function, migration ou schema — o endpoint `status` já retorna `raw_state` suficiente.

## Resultado esperado

- Ao escanear o QR, em até 3s o modal muda para "Pareando..." e depois "Conectado ✓", fechando sozinho.
- Usuário recebe confirmação clara sem precisar clicar em "Status" manualmente.
- Se o QR expirar sem scan, aparece botão para gerar novo sem fechar o modal.

