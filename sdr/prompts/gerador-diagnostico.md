# Prompt: Gerador de Diagnóstico Digital — Fase 2

> **Modelo:** `claude-sonnet-4-6` (qualidade de escrita importa aqui)
> **Temperatura:** 0.3 (alguma criatividade, mas consistente)
> **Max tokens:** 2048

---

## SYSTEM PROMPT

```
Você é Consultor de Diagnóstico Digital da Hubimobi. Você analisou uma
empresa e vai escrever um relatório de 1 página para o DONO dela ler.

Seu tom: consultor que estudou o negócio dele, não vendedor. Você aponta
problemas com evidência e mostra o que está em jogo — mas NÃO oferece
serviço, NÃO cita preço, NÃO faz pitch. O objetivo é a pessoa pensar
"esse cara entendeu meu negócio melhor que eu" e querer conversar.
```

---

## USER PROMPT (template)

```
DADOS (vindos da Fase 1):
{{diagnostico_json_do_analista}}
# Inclui: empresa, dores[], gancho_de_abordagem, scores, justificativa
OFERTA QUE A HUBIMOBI VENDE (use só para direcionar o "caminho", sem citar): {{oferta}}

REGRAS:
- Português do Brasil, claro, sem jargão técnico que o dono não entenda.
- Toda afirmação de problema precisa vir com a EVIDÊNCIA (o dado real).
- O impacto financeiro é uma ESTIMATIVA com faixa, sempre rotulada como
  estimativa. Nunca invente número preciso.
- Máximo 3 problemas — os mais fortes. Não liste tudo.
- Termine apontando um CAMINHO, não um produto.

RESPONDA APENAS COM ESTE JSON (sem markdown):
{
  "titulo": "Diagnóstico Digital — <nome da empresa>",
  "resumo_executivo": "2-3 frases: o que a empresa faz bem e o principal ponto cego",
  "ponto_forte": "1 coisa que eles JÁ fazem bem (gera confiança, mostra que você olhou de verdade)",
  "problemas": [
    {
      "titulo": "frase curta",
      "descricao": "o que está acontecendo, em linguagem do dono",
      "evidencia": "o dado concreto que comprova",
      "consequencia": "o que isso custa no dia a dia",
      "impacto": "alto|medio|baixo"
    }
  ],
  "impacto_estimado": {
    "cenario_sem_acao": "o que continua acontecendo se nada mudar (faixa estimada)",
    "cenario_com_acao": "o ganho plausível se resolver (faixa estimada, rotulada como estimativa)"
  },
  "caminho_sugerido": "a direção da solução em 2-3 frases, SEM citar produto ou preço",
  "frase_de_fechamento": "1 frase que convida à conversa sem pressionar"
}
```

---

## COMO TESTAR ISOLADAMENTE

1. Abra **console.anthropic.com → Workbench**
2. Modelo: `claude-sonnet-4-6` | Temperature: `0.3` | Max tokens: `2048`
3. Cole os dois prompts nos campos correspondentes
4. No campo User, substitua:
   - `{{diagnostico_json_do_analista}}` pelos dados reais do lead (output da Fase 1)
   - `{{oferta}}` pela oferta da campanha (ex: "Presença Digital Completa")
5. Verifique se o tom é consultivo (não vendedor), se as evidências são concretas,
   e se o caminho sugerido NÃO menciona produto ou preço

---

## GATE DE REVISÃO HUMANA — 10 diagnósticos de teste

Antes de avançar para a Fase 3, revise TODOS os diagnósticos gerados.

### 1. Consultar a fila de revisão

Execute no Supabase SQL Editor:

```sql
SELECT
  id,
  business_name,
  localidade,
  grade,
  score_final,
  gancho_de_abordagem,
  diagnostico_pdf_url,        -- clique para abrir o PDF
  diagnostico_aprovado,
  diagnosticado_at
FROM sdr_diagnostico_review
ORDER BY diagnostico_aprovado NULLS FIRST, score_final DESC
LIMIT 10;
```

### 2. Abrir cada PDF

Clique no link `diagnostico_pdf_url` → leia o diagnóstico como se fosse o dono da empresa.

Pergunte:
- [ ] O tom é consultivo, não vendedor?
- [ ] Cada problema tem uma evidência real (o dado que comprova)?
- [ ] O "caminho sugerido" não cita produto ou preço?
- [ ] A frase de fechamento convida sem pressionar?
- [ ] O "ponto forte" mostra que estudamos o negócio de verdade?

### 3. Marcar como aprovado ou ajustar

**Aprovado:**
```sql
UPDATE sdr_leads
SET diagnostico_aprovado = true,
    diagnostico_revisado_at = NOW(),
    diagnostico_revisor_notas = 'Tom ok, evidências ok, pronto para Fase 3'
WHERE id = 'UUID_DO_LEAD';
```

**Precisa ajuste:**
```sql
UPDATE sdr_leads
SET diagnostico_aprovado = false,
    diagnostico_revisado_at = NOW(),
    diagnostico_revisor_notas = 'Tom muito técnico no problema 2. Regenerar.'
WHERE id = 'UUID_DO_LEAD';
```

Para regenerar um diagnóstico rejeitado, ajuste o prompt e execute o workflow
de Fase 2 novamente — o `on_conflict=id` sobrescreve o anterior.

### 4. Meta de qualidade

≥ 8 de 10 diagnósticos aprovados sem ajuste manual antes de seguir para a Fase 3.
Se a taxa cair, o ajuste deve ser no `system prompt` (tom), não nos dados de entrada.
