# Etapa 7 — Deploy no servidor Verse

## 7.1 Build local
```bash
bun install
bun run build
# → gera pasta dist/
```

## 7.2 Subir para o servidor
```bash
# Via rsync (mais eficiente)
rsync -avz --delete dist/ usuario@seu-verse-ip:/var/www/d7pharma/

# Ou SCP
scp -r dist/* usuario@seu-verse-ip:/var/www/d7pharma/
```

## 7.3 Instalar nginx (Ubuntu/Debian)
```bash
ssh usuario@seu-verse-ip
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx
```

## 7.4 Config nginx

Criar `/etc/nginx/sites-available/d7pharma`:

```nginx
server {
    listen 80;
    server_name d7pharmabrazil.com.br www.d7pharmabrazil.com.br;

    root /var/www/d7pharma;
    index index.html;

    # SPA fallback — CRÍTICO, senão /admin, /checkout etc. dão 404 no refresh
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache agressivo para assets versionados (Vite gera hash no nome)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # HTML sem cache
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Gzip
    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1000;

    # Segurança básica
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
}
```

Ativar:
```bash
sudo ln -s /etc/nginx/sites-available/d7pharma /etc/nginx/sites-enabled/
sudo nginx -t   # testa config
sudo systemctl reload nginx
```

## 7.5 HTTPS com Let's Encrypt
```bash
sudo certbot --nginx -d d7pharmabrazil.com.br -d www.d7pharmabrazil.com.br
# Renovação automática já vem configurada via systemd timer
```

## 7.6 DNS
No **Registro.br** (ou seu registrador):
- Registro **A** `@` → IP do Verse
- Registro **A** `www` → IP do Verse

Aguarde propagação (5min–2h). Teste:
```bash
dig d7pharmabrazil.com.br +short
# deve mostrar o IP do Verse
```

## 7.7 Script de deploy automatizado (opcional)

Criar `deploy.sh` local:
```bash
#!/bin/bash
set -e
echo "🔨 Building..."
bun run build
echo "📦 Uploading to Verse..."
rsync -avz --delete dist/ usuario@seu-verse-ip:/var/www/d7pharma/
echo "✅ Deploy done: https://d7pharmabrazil.com.br"
```

`chmod +x deploy.sh` e rode `./deploy.sh` a cada mudança.
