

## Upload de Logo e Favicon via Arquivo

### Problema
Atualmente, logo e favicon são configurados por URL. O correto é permitir upload de arquivo direto para o servidor.

### Solução

1. **Criar bucket de storage** `store-assets` (público) via migration
2. **Atualizar `StoreSettingsPage.tsx`** — substituir os inputs de URL por inputs de arquivo (`<input type="file">`) com:
   - Preview da imagem atual
   - Botão de upload que envia para o bucket `store-assets`
   - Após upload, salva a URL pública gerada no campo `logo_url` / `favicon_url`
   - Botão para remover a imagem

### Detalhes técnicos

| Arquivo | Ação |
|---------|------|
| Migration SQL | Criar bucket `store-assets` com política pública de leitura e escrita para admins |
| `src/pages/admin/StoreSettingsPage.tsx` | Substituir inputs de texto por file upload com preview |

### Fluxo de upload

1. Usuário seleciona arquivo (PNG, JPG, SVG, ICO)
2. Arquivo é enviado para `store-assets/logo.png` ou `store-assets/favicon.png`
3. URL pública é gerada e salva em `store_settings.logo_url` / `favicon_url`
4. Preview atualiza imediatamente
5. Header, Footer e favicon do site usam a URL normalmente (sem mudanças nesses componentes)

