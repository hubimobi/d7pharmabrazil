

## Logo Horizontal — Tamanho Ideal e Otimização

### Tamanho Recomendado

Para headers de e-commerce, o padrão ideal é **200×50px** (proporção 4:1). O header atual tem `h-16` (64px), e a logo usa `h-10` (40px) — sobrando padding. O tamanho ideal final da imagem é **240×60px** a 2x para telas retina, ou seja, o arquivo deve ter **480×120px** e ser exibido em 240×60.

### Sobre conversão JPG/PNG → SVG

Converter automaticamente fotos/bitmaps para SVG vetorial **não é viável com qualidade confiável**. SVG é ideal para logos criados em vetor — converter um PNG de logo gera traçados imperfeitos. O que podemos fazer:

1. **Redimensionar e comprimir** automaticamente ao upload (canvas resize para 480×120 + export WebP/PNG otimizado)
2. **Aceitar SVG** nativamente (já aceita) — se o usuário tiver o SVG original, é a melhor opção
3. **Crop automático** com aspect ratio fixo 4:1 no upload

### Plano de Implementação

#### 1. `src/pages/admin/StoreSettingsPage.tsx`
- No upload da logo horizontal, abrir o `CropImageDialog` com `aspect={4}` (4:1) antes de fazer upload
- Após o crop, redimensionar o canvas para **480×120px** (2x retina) antes de enviar
- Adicionar texto de ajuda: "Tamanho ideal: 480×120px (4:1). A imagem será recortada automaticamente."

#### 2. `src/components/Header.tsx`
- Ajustar classe da logo: `h-10 max-w-[240px]` → garantir que não estoure em mobile
- Adicionar `w-auto` para manter proporção

#### 3. Função auxiliar `resizeImage`
- Criar no `StoreSettingsPage` uma função que recebe o Blob cropado e redimensiona para 480×120 via canvas, exportando como PNG de alta qualidade

