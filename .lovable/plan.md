
## Adicionar IA ao MessageComposer: Ortografia + Melhorar Copy

### Onde
`src/components/admin/MessageComposer.tsx` — adicionar 2 botões na toolbar (ao lado de Emoji/Variável/Spintax):

1. **"Corrigir"** (ícone `SpellCheck`) — corrige ortografia/gramática mantendo emojis, variáveis `{...}` e spintax intactos. Substitui o texto direto.
2. **"Melhorar"** (ícone `Sparkles`) — abre dialog com a ferramenta de copy avançada.

### Backend
Nova edge function `improve-message-copy`:
- Input: `{ text, mode: "spell" | "improve", context? }`
- Usa Lovable AI (`google/gemini-3-flash-preview`)
- System prompt preserva `{variáveis}`, `{spin|tax}` e emojis
- Modo `spell`: só corrige erros, mantém estilo
- Modo `improve`: reescreve para conversão (WhatsApp tone)
- Retorna `{ improved_text }`
- Auth admin + log em `ai_token_usage`

### Dialog "Melhorar Copy"
Novo componente inline no `MessageComposer` (não reaproveita `ProfileCopyGenerator` inteiro pra evitar acoplamento — é overkill p/ msg curta de WhatsApp). Dialog com:
- Texto original (readonly)
- Selects: Tom (amigável/urgente/profissional/empolgado), Objetivo (vender/agendar/recuperar/avisar), Tamanho (curto/médio/longo)
- Botão "Gerar variações" → chama `improve-message-copy` com `mode: "improve"` + contexto, retorna 3 variações
- Cada variação tem botão "Usar esta" (substitui o texto do composer e fecha dialog)

### Arquivos
- `src/components/admin/MessageComposer.tsx` (toolbar + dialog)
- `supabase/functions/improve-message-copy/index.ts` (nova)
- `supabase/config.toml` (registrar função se necessário)

Funciona automaticamente em ambos os locais que já usam o composer (Templates + FlowEditor).
