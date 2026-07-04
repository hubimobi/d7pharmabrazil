## Diagnóstico

O erro `DNS_PROBE_FINISHED_NXDOMAIN` em `d7pharmabrazil.com.br` **não é um erro de publicação nem de código**. É um problema de DNS: o navegador não conseguiu resolver o domínio para nenhum IP.

A publicação em si funcionou — o site está no ar em:
- https://d7pharmabrazil.lovable.app (URL Lovable)
- https://id-preview--e7f9d910-27bc-4ff1-ad19-9df48deec852.lovable.app (preview)

O que falha é apenas o domínio customizado `d7pharmabrazil.com.br`.

## Causas possíveis

1. **Registros DNS removidos/expirados** no registrador (Registro.br ou outro) — o mais comum. Os registros A precisam apontar para `185.158.133.1`.
2. **Domínio expirado** — verificar validade no registrador.
3. **Nameservers alterados** para outro provedor (Cloudflare, etc.) sem replicar os registros.
4. **Propagação DNS** — se você acabou de configurar, pode levar até 72h (mas normalmente < 1h).

## Como verificar e corrigir

### Passo 1 — Confirmar via DNS público
Abrir https://dnschecker.org e consultar `d7pharmabrazil.com.br` (tipo A). Se vier vazio em todos os servidores → registros ausentes no registrador.

### Passo 2 — Reconfigurar DNS no registrador
No painel do registrador do domínio, garantir:

```text
Tipo   Nome      Valor
A      @         185.158.133.1
A      www       185.158.133.1
TXT    _lovable  <token exibido em Project Settings → Domains>
```

Remover registros A antigos que apontem para outros IPs.

### Passo 3 — Reverificar no Lovable
Em **Project Settings → Project → Domains**, clicar em **Verificar** no domínio `d7pharmabrazil.com.br`. Aguardar status ficar **Active**.

### Passo 4 — Se comprou o domínio pela Lovable
Se o domínio foi comprado dentro da Lovable, gerenciar DNS em: **Domains → ⋯ → Configure → Manage DNS records** e conferir se os registros A ainda existem.

## O que NÃO vou fazer

- Nenhuma alteração de código — o problema é infraestrutura DNS externa à aplicação.
- Não vou republicar — a última publicação está saudável no domínio `.lovable.app`.

## Próximo passo

Você quer que eu:
- (a) apenas te oriente a corrigir o DNS no seu registrador (recomendado), ou
- (b) investigue algo específico no código/publicação que você suspeita estar quebrado?

<presentation-actions>
<presentation-link url="https://docs.lovable.dev/features/custom-domain">Docs: Custom Domain</presentation-link>
</presentation-actions>
