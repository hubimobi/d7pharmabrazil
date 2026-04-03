

# Plano: Reestruturação Profissional do Copy por Perfil

## Problema Atual
Os prompts atuais são genéricos e produzem copies rasas. As instruções para a IA carecem de profundidade em psicologia comportamental, gatilhos mentais específicos por perfil, e estrutura persuasiva de alto nível. O resultado são perguntas genéricas, respostas previsíveis e CTAs fracos.

---

## O que muda

### 1. System Prompt de Nível Expert (Edge Function)

Reescrever o system prompt com a persona de um copywriter sênior de 20+ anos, incluindo:

- **Mapa de dores e desejos por perfil DISC**: cada perfil tem gatilhos emocionais distintos (D = medo de perder controle, I = medo de ser ignorado, S = medo de mudança, C = medo de errar)
- **Mapa de dores OCEAN**: cada traço com motivadores profundos
- **Regras de persuasão obrigatórias**: especificidade (números, prazos), contraste antes/depois, loops abertos, padrão de interrupção, prova social contextual
- **Score interno**: a IA deve autoavaliar cada copy gerada usando os critérios do Score de Conversão (clareza, emoção, dor/desejo, prova, urgência, fit perfil)

**Arquivo**: `supabase/functions/generate-profile-copy/index.ts`

### 2. Prompt da Caixinha de Perguntas Completamente Reformulado

Substituir o prompt atual por um com:

- **Etapa de Análise Profunda**: antes de gerar, a IA deve mapear 3 dores específicas e 3 desejos do público-alvo baseados no produto
- **Perguntas vinculadas a dores/desejos reais**: cada pergunta deve atacar uma dor ou desejo específico do perfil (não genérica). Ex: Perfil D + Curioso = "Quanto tempo mais você vai aceitar resultados medianos?"
- **Respostas do seguidor autênticas por perfil**: com exemplos de como cada perfil DISC responde (D: curto e assertivo, I: com emoji e emoção, S: cauteloso, C: com dados)
- **Copy da empresa com estrutura de alta conversão**: seguir o framework selecionado com rigor, incluir prova social implícita, usar contraste antes/depois, e finalizar com CTA contextual
- **CTA adaptado ao perfil + jornada**: ex: D+Ready = "Garanta agora", I+Curious = "Descubra como...", S+Unaware = "Saiba se você...", C+Ready = "Veja os dados e decida"

**Arquivo**: `supabase/functions/generate-profile-copy/index.ts`

### 3. Mapas Expandidos de DISC e OCEAN

Expandir os objetos `discMap` e `oceanMap` com:

- Dor principal de cada perfil
- Desejo central
- Gatilhos mentais que funcionam
- Gatilhos que repelem
- Tom de CTA ideal
- Palavras de poder e palavras a evitar

### 4. CTA Dinâmico por Perfil × Jornada

Criar uma matriz `ctaMatrix` que cruza perfil + fase do funil para gerar CTAs de alta conversão automaticamente, que a IA deve usar como referência:

```text
         | Unaware        | Curious           | Ready              | Post
---------|----------------|-------------------|--------------------|------------------
D        | Descubra o que | Veja como outros  | Garanta o seu agora| Renove antes que
I        | Você sabia que | Olha o que achei  | Quero! Como faço?  | Compartilhe com
S        | Entenda por que| Compare e escolha | Peça o seu sem     | Continue cuidando
C        | Dados mostram  | Analise os fatos  | Acesse e comprove  | Veja seu histórico
```

### 5. Prompt de Copy Única e Batch Também Aprimorado

Mesma lógica de profundidade para os modos `all_disc`, `all_ocean` e single profile:
- Incluir campo `pain_addressed` e `desire_addressed` em cada copy
- Incluir `persuasion_technique` usado
- Body blocks com estrutura narrativa (gancho, desenvolvimento, prova, transição, CTA)

### 6. Deploy da Edge Function

Após editar o arquivo, deploy automático.

---

## Arquivos Modificados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/generate-profile-copy/index.ts` | System prompt expert, mapas expandidos, prompts reestruturados, CTA matrix |

Nenhuma mudança no frontend necessária - as melhorias são todas na qualidade do prompt e da instrução para a IA.

