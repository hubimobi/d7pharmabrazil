

## Fix: mensagem cortada nos blocos

Dois pontos cortando o conteúdo no bloco Mensagem:

### 1. Template truncado em 80 caracteres (linha 854)
Atualmente:
```tsx
<p className="text-[10px] text-slate-600 line-clamp-2 italic">
  {String(tpl.content).substring(0, 80)}{...length > 80 ? "..." : ""}
</p>
```
Trocar por preview completo:
```tsx
<p className="text-[11px] text-slate-600 italic whitespace-pre-wrap break-words">
  {tpl.content}
</p>
```

### 2. maxWidth do nó limita templates a 320px (linha 1614)
Atualmente só mensagens tipo `text` recebem 500px. Estender para todos os subtipos de mensagem (text, template, link):
```tsx
maxWidth: node.type === "message" ? 520 : 320,
```

### 3. Preview de mensagem texto também tem `max-w-[460px]` rígido (linha 870)
Remover esse cap interno — deixar herdar do container do nó:
```tsx
<div className="flex items-start gap-1.5">
```

### 4. Link preview com `line-clamp-2` (linha 865)
Trocar por `break-all` sem clamp para mostrar URL inteira.

### Arquivo modificado
- `src/components/admin/WhatsAppFlowEditor.tsx`

