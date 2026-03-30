
## Personalizar Páginas de Erro (404 e similares)

### O que será feito

Redesenhar a página `NotFound.tsx` para seguir o padrão visual da loja, com textos em português, logo dinâmica carregada das configurações da loja, e visual alinhado ao design system existente.

### Alterações

**`src/pages/NotFound.tsx`** — Reescrever completamente:
- Importar `useStoreSettings` para obter `logo_url`, `store_name` e cores da loja
- Exibir a logo da loja centralizada acima do código de erro
- Traduzir todos os textos para português ("Página não encontrada", "Voltar para a loja", etc.)
- Aplicar o visual editorial da loja: glassmorphism card, gradientes, tipografia Space Grotesk
- Adicionar botões para "Voltar à Página Inicial" e "Ver Produtos"
- Incluir uma mensagem amigável e humanizada
- Usar as CSS variables do tema (`--design-title`, `--design-text`, etc.)

### Estrutura visual

```text
┌─────────────────────────────┐
│                             │
│        [Logo da Loja]       │
│                             │
│           404               │
│   Página não encontrada     │
│                             │
│  "Parece que esta página    │
│   não existe ou foi movida" │
│                             │
│  [Voltar ao Início]  [Produtos] │
│                             │
└─────────────────────────────┘
```

### Detalhes técnicos
- Um único arquivo modificado: `src/pages/NotFound.tsx`
- Usa hooks existentes (`useStoreSettings`) — sem dependências novas
- Fallback para texto "Loja" caso as settings não carreguem
