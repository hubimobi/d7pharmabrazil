import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── DISC Profile Deep Map ──
const discDeep: Record<string, { label: string; pain: string; desire: string; triggers: string; repels: string; tone: string; cta_tone: string; power_words: string; avoid_words: string; response_style: string }> = {
  D: {
    label: "Dominância",
    pain: "Perder o controle, depender dos outros, ficar para trás, resultados lentos",
    desire: "Resultados rápidos, autonomia, status, ser o primeiro, vantagem competitiva",
    triggers: "Autoridade, exclusividade, escassez real, desafio, prova de resultado rápido",
    repels: "Enrolação, excesso de detalhes, tom passivo, falta de objetividade",
    tone: "Direto, assertivo, imperativo, sem rodeios. Frases curtas. Comando.",
    cta_tone: "Imperativo e urgente: 'Garanta agora', 'Ative hoje', 'Decida antes que acabe'",
    power_words: "exclusivo, primeiro, resultado, agora, controle, liderar, dominar, garantido",
    avoid_words: "talvez, quem sabe, aos poucos, devagar, com calma",
    response_style: "Curto, assertivo, sem emoji. Ex: 'Sim, preciso disso', 'Já quero'"
  },
  I: {
    label: "Influência",
    pain: "Ser ignorado, ficar de fora, perder relevância social, monotonia",
    desire: "Reconhecimento, pertencimento, novidade, ser admirado, diversão",
    triggers: "Novidade, prova social, FOMO, comunidade, storytelling emocional",
    repels: "Tom frio, dados excessivos, linguagem técnica, falta de emoção",
    tone: "Empolgante, emocional, entusiasta, usa exclamações e histórias pessoais",
    cta_tone: "Entusiasta e social: 'Vem comigo!', 'Descubra o que todo mundo está amando', 'Você merece!'",
    power_words: "incrível, amei, tendência, todo mundo, novidade, imperdível, transformação, brilhar",
    avoid_words: "tecnicamente, dados indicam, estatisticamente, procedimento",
    response_style: "Emotivo, com emoji. Ex: 'Aiii preciso!! 😍', 'Meu Deus, quero!'"
  },
  S: {
    label: "Estabilidade",
    pain: "Mudança brusca, risco, perder segurança, decisão precipitada, conflito",
    desire: "Segurança, estabilidade, garantia, rotina melhorada, confiança",
    triggers: "Garantia, depoimentos reais, sem risco, passo a passo, aprovação de outros",
    repels: "Pressão excessiva, urgência artificial, mudanças radicais, tom agressivo",
    tone: "Calmo, acolhedor, seguro, empático. Frases que transmitem confiança e cuidado",
    cta_tone: "Suave e seguro: 'Experimente sem risco', 'Comece quando se sentir pronto', 'Cuide de você'",
    power_words: "seguro, garantia, confiança, tranquilidade, comprovado, cuidado, proteção, sem risco",
    avoid_words: "urgente, última chance, corra, não perca, agora ou nunca",
    response_style: "Cauteloso, ponderado. Ex: 'Será que funciona mesmo?', 'Parece bom, mas tenho medo'"
  },
  C: {
    label: "Conformidade",
    pain: "Errar, tomar decisão sem dados, ser enganado, falta de lógica, desperdício",
    desire: "Precisão, eficiência, dados concretos, custo-benefício, processo claro",
    triggers: "Dados, estudos, comparativos, ROI, processo detalhado, transparência",
    repels: "Apelo emocional exagerado, promessas vagas, falta de evidência, hype",
    tone: "Lógico, técnico, preciso, estruturado. Usa números e evidências",
    cta_tone: "Analítico: 'Veja os dados', 'Compare e decida', 'Acesse o estudo completo'",
    power_words: "comprovado, estudo, eficiência, precisão, dados, análise, otimizado, método",
    avoid_words: "acredite, confie, sinta, mágica, milagre, inacreditável",
    response_style: "Analítico, pergunta detalhes. Ex: 'Quais são os ingredientes?', 'Tem estudo clínico?'"
  }
};

// ── OCEAN Trait Deep Map ──
const oceanDeep: Record<string, { label: string; pain: string; desire: string; triggers: string; repels: string; tone: string; cta_tone: string; power_words: string; avoid_words: string }> = {
  openness: {
    label: "Abertura à Experiência",
    pain: "Rotina, estagnação, falta de novidade, previsibilidade, limitação criativa",
    desire: "Inovação, descoberta, experiências únicas, originalidade, crescimento",
    triggers: "Novidade, exclusividade, conceito diferente, experiência sensorial, história por trás",
    repels: "Convencional, genérico, 'mais do mesmo', fórmula batida",
    tone: "Criativo, inspirador, provocador de curiosidade",
    cta_tone: "'Descubra algo novo', 'Experimente o diferente', 'Explore agora'",
    power_words: "inovador, único, revolucionário, descobrir, explorar, original, criativo",
    avoid_words: "tradicional, convencional, comum, básico, padrão"
  },
  conscientiousness: {
    label: "Conscienciosidade",
    pain: "Desorganização, desperdício, falta de método, ineficiência, improvisação",
    desire: "Organização, método, eficiência, planejamento, resultado previsível",
    triggers: "Passo a passo, método comprovado, organização, lista de benefícios, ROI",
    repels: "Desordem, promessas vagas, falta de estrutura, impulsividade",
    tone: "Estruturado, metódico, organizado, com listas e passos claros",
    cta_tone: "'Siga o método', 'Organize sua rotina', 'Comece o plano hoje'",
    power_words: "método, passo a passo, organizado, eficiente, planejado, disciplina, sistema",
    avoid_words: "improvise, sem regras, qualquer jeito, tanto faz"
  },
  extraversion: {
    label: "Extroversão",
    pain: "Isolamento, tédio, falta de conexão, invisibilidade social",
    desire: "Conexão, energia, reconhecimento social, experiências compartilhadas",
    triggers: "Comunidade, depoimentos, experiência social, energia, celebração",
    repels: "Tom introspectivo, solitário, técnico demais, silencioso",
    tone: "Energético, social, vibrante, com chamadas para interação",
    cta_tone: "'Junte-se a nós!', 'Compartilhe com quem ama', 'Faça parte!'",
    power_words: "juntos, comunidade, energia, celebrar, compartilhar, vibrar, conectar",
    avoid_words: "sozinho, silenciosamente, isolado, discreto"
  },
  agreeableness: {
    label: "Amabilidade",
    pain: "Conflito, egoísmo, desarmonia, falta de empatia, agressividade",
    desire: "Harmonia, cuidado com o outro, empatia, ajudar, bem-estar coletivo",
    triggers: "Empatia, causa social, cuidado, presente para alguém, impacto positivo",
    repels: "Tom agressivo, competição, individualismo, pressão, manipulação",
    tone: "Acolhedor, empático, gentil, focado no bem do outro",
    cta_tone: "'Cuide de quem você ama', 'Faça o bem', 'Presente que transforma'",
    power_words: "cuidar, presente, amor, bem-estar, ajudar, gentileza, harmonia, carinho",
    avoid_words: "esmague, domine, vença, destrua, supere todos"
  },
  neuroticism: {
    label: "Neuroticismo",
    pain: "Incerteza, ansiedade, medo de errar, perda, arrependimento, exposição",
    desire: "Segurança, prevenção, controle de riscos, tranquilidade, proteção",
    triggers: "Prevenção de perda, garantia, sem risco, proteção, depoimentos de segurança",
    repels: "Risco, aventura, incerteza, 'confie e pule', pressão de tempo",
    tone: "Seguro, preventivo, protetor, com foco em eliminar medos",
    cta_tone: "'Proteja-se agora', 'Sem risco de arrependimento', 'Garantia total'",
    power_words: "seguro, protegido, garantia, sem risco, tranquilidade, prevenção, blindado",
    avoid_words: "arrisque, aposte, aventure-se, sem garantias, confie"
  }
};

// ── Funnel Stage Map ──
const funnelDeep: Record<string, { label: string; objective: string; technique: string }> = {
  descoberta: { label: "Descoberta", objective: "O cliente ainda não sabe que tem um problema. Revelar a dor de forma sutil, criar consciência e despertar curiosidade.", technique: "Padrão de interrupção, pergunta retórica, revelação surpreendente, conteúdo educativo" },
  reconhecimento: { label: "Reconhecimento", objective: "O cliente reconhece que tem um problema. Aprofundar a consciência da dor e mostrar que existe solução.", technique: "Storytelling de identificação, dados impactantes, comparação antes/depois, prova social" },
  consideracao: { label: "Consideração", objective: "O cliente pesquisa e considera soluções possíveis. Posicionar o produto como a melhor opção.", technique: "Comparativos, diferenciais únicos, autoridade, demonstração de valor, stack de benefícios" },
  decisao: { label: "Decisão de Compra", objective: "O cliente está pronto para decidir. Urgência real, escassez, decisão imediata.", technique: "Escassez genuína, ancoragem de preço, stack de valor, risco reverso, garantia" },
  pos_venda: { label: "Pós-Venda", objective: "O cliente já comprou. Relacionamento, confiança, fidelização e recompra.", technique: "Exclusividade de cliente, resultado acumulado, comunidade VIP, indicação" }
};

// ── CTA Matrix: Profile × Funnel ──
const ctaMatrix: Record<string, Record<string, string>> = {
  D: { descoberta: "Descubra o que está te travando", reconhecimento: "Você já sabe o problema — agora resolva", consideracao: "Veja como líderes resolvem isso", decisao: "Garanta o seu agora — estoque limitado", pos_venda: "Renove antes que acabe — cliente tem prioridade" },
  I: { descoberta: "Você sabia que existe algo incrível?", reconhecimento: "Olha o que pode mudar tudo pra você! 😍", consideracao: "Olha o que todo mundo está usando!", decisao: "Eu quero! Como faço? 😍", pos_venda: "Compartilhe essa descoberta com quem ama!" },
  S: { descoberta: "Entenda por que tanta gente está mudando", reconhecimento: "Você não está sozinha nessa — veja depoimentos", consideracao: "Compare e escolha com tranquilidade", decisao: "Peça o seu sem risco — garantia total", pos_venda: "Continue cuidando de você com segurança" },
  C: { descoberta: "Os dados mostram algo preocupante", reconhecimento: "Veja os números que comprovam o problema", consideracao: "Analise os fatos antes de decidir", decisao: "Acesse, comprove e ative com 100% de garantia", pos_venda: "Veja seu histórico de resultados" }
};

// ── Copy Method Map ──
const copyMethodMap: Record<string, string> = {
  venda: `V.E.N.D.A — Estrutura OBRIGATÓRIA:
1. Validação (valide a dor/desejo do seguidor com empatia)
2. Explicação (explique POR QUE o problema existe — 1 frase)
3. Nova visão (apresente a solução de forma inesperada)
4. Direção (diga exatamente o que fazer — passo a passo)
5. Abertura (convite suave, sem pressão)
Tom: Humano, simples, como conversa de amigo. SEM linguagem de vendedor.`,
  aida: `A.I.D.A — Estrutura OBRIGATÓRIA:
1. Atenção (gancho que para o scroll — máx 8 palavras)
2. Interesse (dado surpreendente ou história)
3. Desejo (antes vs depois, benefício tangível)
4. Ação (CTA claro e direto)
Tom: Progressivo, envolvente. Cada linha puxa para a próxima.`,
  corte: `C.O.R.T.E — Estrutura OBRIGATÓRIA:
1. Confronto (confronte a crença limitante do seguidor)
2. Oportunidade (mostre que existe solução)
3. Risco (o que acontece se NÃO agir)
4. Transição (como é a vida COM a solução)
5. Engajamento (CTA de alta conversão)
Tom: Direto, firme, persuasivo. Ideal para remarketing.`,
  ccp: `C.C.P — Estrutura OBRIGATÓRIA:
1. Cabeça (captura atenção, MÁX 12 palavras, gancho forte)
2. Corpo (explica problema + quebra crença, MÁX 3 linhas)
3. Pés (CTA claro e direto, MÁX 1 linha)
Tom: Adaptável. Focado em dor, desejo ou resultado.`
};

// ── Helper Functions ──

async function getActiveLLM(sb: any) {
  const { data: configs } = await sb.from("ai_llm_config").select("*").eq("active", true).limit(1);
  const ext = configs?.[0];
  if (ext && ext.provider !== "lovable") {
    const extKey = Deno.env.get(ext.api_key_name);
    if (extKey) {
      let url = "https://ai.gateway.lovable.dev/v1/chat/completions";
      if (ext.provider === "xai") url = "https://api.x.ai/v1/chat/completions";
      else if (ext.provider === "openai") url = "https://api.openai.com/v1/chat/completions";
      return { apiUrl: url, apiKey: extKey, model: ext.default_model || "grok-3-mini-fast" };
    }
  }
  return { apiUrl: "https://ai.gateway.lovable.dev/v1/chat/completions", apiKey: Deno.env.get("LOVABLE_API_KEY") || "", model: "google/gemini-2.5-flash" };
}

async function getCustomPrompt(sb: any, toolKey: string) {
  const { data } = await sb.from("ai_system_prompts").select("system_prompt, temperature").eq("tool_key", toolKey).single();
  return data;
}

// ── Expert System Prompt ──

function buildExpertSystemPrompt(customPrompt?: string): string {
  if (customPrompt) return customPrompt;

  return `Você é um copywriter sênior com 20+ anos de experiência em marketing direto digital no Brasil. Especialista em psicologia comportamental aplicada (DISC e OCEAN), neuromarketing, e frameworks de alta conversão.

## SUA IDENTIDADE
- Você já gerou mais de R$50 milhões em vendas com copy
- Estudou sob David Ogilvy, Gary Halbert, Eugene Schwartz e Ícaro de Carvalho
- Domina persuasão psicológica profunda — não superficial

## MAPA PSICOLÓGICO DISC (USE OBRIGATORIAMENTE)
${Object.entries(discDeep).map(([k, v]) => `### ${k} — ${v.label}
- DOR CENTRAL: ${v.pain}
- DESEJO CENTRAL: ${v.desire}
- GATILHOS QUE CONVERTEM: ${v.triggers}
- O QUE REPELE: ${v.repels}
- TOM IDEAL: ${v.tone}
- CTA IDEAL: ${v.cta_tone}
- PALAVRAS DE PODER: ${v.power_words}
- PALAVRAS A EVITAR: ${v.avoid_words}`).join("\n\n")}

## MAPA PSICOLÓGICO OCEAN (USE OBRIGATORIAMENTE)
${Object.entries(oceanDeep).map(([k, v]) => `### ${v.label}
- DOR: ${v.pain}
- DESEJO: ${v.desire}
- GATILHOS: ${v.triggers}
- REPELE: ${v.repels}
- TOM: ${v.tone}
- CTA: ${v.cta_tone}
- PODER: ${v.power_words}
- EVITAR: ${v.avoid_words}`).join("\n\n")}

## REGRAS INEGOCIÁVEIS DE PERSUASÃO
1. ESPECIFICIDADE MATA GENERALIDADE — Use números, prazos, porcentagens reais. "97% das mulheres" > "muitas mulheres"
2. CONTRASTE ANTES/DEPOIS — Sempre mostre a transformação. Dor → Solução → Resultado
3. LOOP ABERTO — Crie curiosidade que só se resolve lendo até o final
4. PADRÃO DE INTERRUPÇÃO — A primeira frase deve PARAR o scroll. Surpreenda.
5. PROVA SOCIAL CONTEXTUAL — Não genérica. Específica ao perfil. "Gestoras como você" > "milhares de pessoas"
6. EMOÇÃO ANTES DE LÓGICA — Conecte emocionalmente PRIMEIRO, depois justifique com dados
7. UM ÚNICO FOCO POR COPY — Uma dor, um desejo, uma ação. Nunca dilua a mensagem.
8. CTA CONTEXTUAL — O CTA deve ser consequência natural do texto, não um apêndice

## ESTRUTURA NARRATIVA OBRIGATÓRIA (para body_blocks)
1. GANCHO (padrão de interrupção — para o scroll)
2. DESENVOLVIMENTO (aprofunda dor/desejo com empatia e especificidade)
3. PROVA (social, dados, ou contraste antes/depois)
4. TRANSIÇÃO (ponte para a solução — "E se existisse...")
5. CTA (ação clara, alinhada ao perfil e fase)

## AUTOAVALIAÇÃO OBRIGATÓRIA
Para CADA copy gerada, avalie internamente (não inclua no JSON):
- Clareza (0-10): A mensagem é imediatamente compreensível?
- Emoção (0-10): Gera reação emocional forte?
- Dor/Desejo (0-10): Ataca uma dor real ou desejo profundo?
- Prova (0-10): Inclui evidência ou prova social?
- Urgência (0-10): Cria senso de ação imediata?
- Fit Perfil (0-10): Está perfeitamente alinhada ao perfil?
Se qualquer item < 7, REESCREVA antes de incluir no resultado.

## FORMATO DE SAÍDA
- Responda SEMPRE em JSON válido
- NUNCA inclua markdown, explicações ou texto fora do JSON
- Cada copy deve ser PRONTA PARA COPIAR E COLAR — sem placeholders`;
}

// ── Prompt Builders ──

function buildCaixinhaPrompt(params: any): string {
  const { productName, productDescription, benefits, discProfile, oceanTrait, funnelStage, copyMethod, ctaType } = params;

  const profileCount = discProfile === "all" ? 4 : oceanTrait === "all" ? 5 : 1;
  const stageCount = funnelStage === "all" ? 4 : 1;
  const total = profileCount * stageCount;

  const profileType = discProfile === "all" ? "DISC" : oceanTrait === "all" ? "OCEAN" : "específico";
  const profiles = discProfile === "all"
    ? Object.entries(discDeep).map(([k, v]) => `${k} (${v.label}): Dor=${v.pain} | Desejo=${v.desire} | Responde assim: ${v.response_style}`).join("\n")
    : oceanTrait === "all"
    ? Object.entries(oceanDeep).map(([k, v]) => `${v.label}: Dor=${v.pain} | Desejo=${v.desire}`).join("\n")
    : `DISC ${discProfile}: ${discDeep[discProfile]?.pain || ""} | OCEAN ${oceanTrait}: ${oceanDeep[oceanTrait]?.pain || ""}`;

  const stages = funnelStage === "all"
    ? Object.entries(funnelDeep).map(([k, v]) => `${v.label}: Objetivo=${v.objective} | Técnica=${v.technique}`).join("\n")
    : `${funnelDeep[funnelStage]?.label}: ${funnelDeep[funnelStage]?.objective}`;

  const methodText = copyMethod && copyMethodMap[copyMethod] ? copyMethodMap[copyMethod] : copyMethodMap["venda"];
  const ctaInstruction = ctaType ? `\nCTA PRINCIPAL OBRIGATÓRIO: "${ctaType}" — adapte ao perfil e jornada.` : "";

  return `## BRIEFING DO PRODUTO
PRODUTO: ${productName}
DESCRIÇÃO: ${productDescription || "N/A"}
BENEFÍCIOS: ${benefits || "N/A"}
PLATAFORMA: Instagram Stories — Caixinha de Perguntas

## PERFIS COMPORTAMENTAIS (${profileType})
${profiles}

## FASES DO FUNIL
${stages}

## MÉTODO DE COPY OBRIGATÓRIO PARA A RESPOSTA DA EMPRESA
${methodText}
${ctaInstruction}

## ETAPA 1: ANÁLISE PROFUNDA (faça internamente antes de gerar)
Antes de gerar qualquer pergunta, analise:
1. Quais são as 3 DORES ESPECÍFICAS que o produto resolve?
2. Quais são os 3 DESEJOS PROFUNDOS que o produto ativa?
3. Quais OBJEÇÕES o público tem?
4. Qual a TRANSFORMAÇÃO antes/depois?

## ETAPA 2: GERAÇÃO — ${total} PERGUNTAS (1 por combinação perfil × fase)

### REGRAS PARA A PERGUNTA (caixinha do Stories):
- Máximo 12 palavras
- DEVE atacar uma DOR ou DESEJO ESPECÍFICO do perfil naquela fase
- NÃO pode ser genérica (ex: "O que você acha?" é PROIBIDO)
- Deve usar PADRÃO DE INTERRUPÇÃO — surpreender, provocar, gerar identificação
- Deve fazer o seguidor PARAR e pensar "isso sou eu"
- Exemplos de BOAS perguntas:
  - Perfil D + Unaware: "Quanto você já perdeu por não agir rápido?"
  - Perfil I + Curious: "Qual foi o último produto que te fez sentir incrível?"
  - Perfil S + Ready: "O que te impede de cuidar de você sem medo?"
  - Perfil C + Unaware: "Você sabe quantos % do que usa é comprovado?"

### REGRAS PARA A RESPOSTA DO SEGUIDOR:
- Máximo 80 caracteres
- Deve parecer DIGITADA POR UMA PESSOA REAL no Instagram
- DEVE refletir o comportamento do perfil:
${discProfile === "all" || (!oceanTrait || oceanTrait === "all") ? `  - D: direto, sem emoji, assertivo. Ex: "Preciso disso ontem"
  - I: emotivo, com emoji. Ex: "Amei!! Onde compro? 😍"
  - S: cauteloso, pergunta. Ex: "Parece bom... tem garantia?"
  - C: analítico, pede dados. Ex: "Quais os ingredientes?"` : "  - Adapte ao perfil selecionado"}
- NÃO pode ser genérica (ex: "Sim, concordo" é PROIBIDO)
- Deve demonstrar a DOR ou o DESEJO do perfil

### REGRAS PARA A COPY DA EMPRESA (resposta nos Stories):
- Máximo 5 linhas curtas (ideal para Stories)
- SEGUIR O MÉTODO ${(copyMethod || "venda").toUpperCase()} COM RIGOR
- Deve incluir PROVA SOCIAL IMPLÍCITA (ex: "milhares de gestoras já...")
- Deve usar CONTRASTE ANTES/DEPOIS
- Deve ter TOM HUMANO — como se uma pessoa real estivesse respondendo
- CTA no final ALINHADO ao perfil + fase do funil
- A copy deve ser baseada no conteúdo/benefícios do produto fornecido
- CADA copy deve tirar nota 8+ no Score de Conversão

### REGRAS PARA O CTA:
- Deve ser CONSEQUÊNCIA NATURAL da copy
- Alinhado ao perfil comportamental e fase do funil
- Referência de CTAs por perfil × fase:
${discProfile === "all" ? Object.entries(ctaMatrix).map(([p, stages]) => `  ${p}: ${Object.entries(stages).map(([s, cta]) => `${s}="${cta}"`).join(" | ")}`).join("\n") : "  Adapte ao perfil e fase selecionados"}

## FORMATO DE SAÍDA — JSON EXATO:
{
  "analise_previa": {
    "dores_especificas": ["dor 1", "dor 2", "dor 3"],
    "desejos_profundos": ["desejo 1", "desejo 2", "desejo 3"],
    "objecoes": ["objeção 1", "objeção 2"],
    "transformacao": "antes → depois"
  },
  "questions": [
    {
      "perfil": "nome do perfil (ex: D - Dominância)",
      "jornada": "fase do funil (ex: Curioso)",
      "pergunta": "pergunta de até 12 palavras que ataca dor/desejo específico",
      "resposta": "resposta curta do seguidor (máx 80 chars), autêntica ao perfil",
      "copy": "copy da empresa seguindo o método ${(copyMethod || "venda").toUpperCase()}, máx 5 linhas, alta conversão",
      "cta_copy": "CTA contextual alinhado ao perfil e fase",
      "pain_addressed": "qual dor específica essa pergunta ataca",
      "desire_addressed": "qual desejo específico essa pergunta ativa"
    }
  ],
  "publico_alvo": "descrição detalhada do público-alvo",
  "principal_dor": "dor #1 identificada",
  "desejo_central": "desejo #1 identificado"
}

GERE EXATAMENTE ${total} perguntas. Cada combinação perfil × fase deve ter EXATAMENTE 1 pergunta. NÃO repita combinações. NÃO omita nenhuma.`;
}

function buildQuizzPrompt(params: any): string {
  const { productName, productDescription, benefits, discProfile, oceanTrait, funnelStage } = params;
  const profileCount = discProfile === "all" ? 4 : oceanTrait === "all" ? 5 : 1;
  const stageCount = funnelStage === "all" ? 4 : 1;
  const total = profileCount * stageCount;

  return `Gere ${total} perguntas para um Quizz de Conversão interativo.

PRODUTO: ${productName}
DESCRIÇÃO: ${productDescription || "N/A"}
BENEFÍCIOS: ${benefits || "N/A"}

Cada pergunta deve:
- Ativar dor ou desejo ESPECÍFICO do perfil
- Ter opções que revelam o perfil do respondente
- Direcionar sutilmente para o produto/solução
- Máximo 12 palavras por pergunta

Retorne JSON:
{
  "questions": [
    {
      "perfil": "nome do perfil",
      "jornada": "fase do funil",
      "pergunta": "pergunta até 12 palavras",
      "resposta": "resposta que direciona para conversão",
      "pain_addressed": "dor atacada",
      "desire_addressed": "desejo ativado"
    }
  ],
  "publico_alvo": "...",
  "principal_dor": "...",
  "desejo_central": "..."
}

Gere EXATAMENTE ${total} perguntas, uma para cada combinação perfil × fase.`;
}

function buildAllDiscPrompt(params: any): string {
  const { productName, productDescription, benefits, platform, funnelStage, ctaType } = params;
  const funnelText = funnelStage === "all"
    ? "TODAS as fases"
    : (funnelDeep[funnelStage]?.label || funnelStage);

  return `## MISSÃO
Gere UMA copy de ALTA CONVERSÃO para CADA perfil DISC (D, I, S, C).

## BRIEFING
PRODUTO: ${productName}
DESCRIÇÃO: ${productDescription || "N/A"}
BENEFÍCIOS: ${benefits || "N/A"}
PLATAFORMA: ${platform || "geral"}
FASE DO FUNIL: ${funnelText}
${ctaType ? `CTA OBRIGATÓRIO: "${ctaType}"` : ""}

## INSTRUÇÕES POR PERFIL
${Object.entries(discDeep).map(([k, v]) => `### ${k} — ${v.label}
- Atacar DOR: ${v.pain}
- Ativar DESEJO: ${v.desire}
- Usar GATILHOS: ${v.triggers}
- EVITAR: ${v.repels}
- TOM: ${v.tone}
- PALAVRAS DE PODER: ${v.power_words}`).join("\n\n")}

## ESTRUTURA DE CADA COPY
1. headline: Gancho com padrão de interrupção (máx 12 palavras)
2. subheadline: Aprofunda a dor ou desejo (1 frase)
3. body_blocks: 3 blocos seguindo [Gancho → Prova → Transição/CTA]
4. cta: Alinhado ao perfil e fase

## FORMATO JSON:
{
  "profiles": {
    "D": {
      "profile_summary": "como a copy foi adaptada",
      "headline": "...",
      "subheadline": "...",
      "body_blocks": ["bloco 1", "bloco 2", "bloco 3"],
      "cta": "...",
      "triggers_used": ["gatilho 1", "gatilho 2"],
      "pain_addressed": "dor específica atacada",
      "desire_addressed": "desejo específico ativado",
      "persuasion_technique": "técnica principal usada",
      "estimated_performance": 85,
      "tone": "tom usado"
    },
    "I": { "...mesmo formato..." },
    "S": { "...mesmo formato..." },
    "C": { "...mesmo formato..." }
  },
  "best_profile": "perfil com maior potencial",
  "comparison_notes": "análise comparativa entre os 4"
}`;
}

function buildAllOceanPrompt(params: any): string {
  const { productName, productDescription, benefits, platform, funnelStage, ctaType } = params;
  const funnelText = funnelStage === "all" ? "TODAS as fases" : (funnelDeep[funnelStage]?.label || funnelStage);

  return `## MISSÃO
Gere UMA copy de ALTA CONVERSÃO para CADA traço OCEAN.

## BRIEFING
PRODUTO: ${productName}
DESCRIÇÃO: ${productDescription || "N/A"}
BENEFÍCIOS: ${benefits || "N/A"}
PLATAFORMA: ${platform || "geral"}
FASE DO FUNIL: ${funnelText}
${ctaType ? `CTA OBRIGATÓRIO: "${ctaType}"` : ""}

## INSTRUÇÕES POR TRAÇO
${Object.entries(oceanDeep).map(([k, v]) => `### ${v.label}
- DOR: ${v.pain}
- DESEJO: ${v.desire}
- GATILHOS: ${v.triggers}
- EVITAR: ${v.repels}
- TOM: ${v.tone}`).join("\n\n")}

## FORMATO JSON:
{
  "profiles": {
    "openness": {
      "profile_summary": "...", "headline": "...", "subheadline": "...",
      "body_blocks": ["...", "...", "..."], "cta": "...",
      "triggers_used": ["..."], "pain_addressed": "...", "desire_addressed": "...",
      "persuasion_technique": "...", "estimated_performance": 85, "tone": "..."
    },
    "conscientiousness": { "...mesmo formato..." },
    "extraversion": { "...mesmo formato..." },
    "agreeableness": { "...mesmo formato..." },
    "neuroticism": { "...mesmo formato..." }
  },
  "best_profile": "qual traço tem maior potencial",
  "comparison_notes": "análise comparativa"
}`;
}

function buildSingleProfilePrompt(params: any): string {
  const { productName, productDescription, benefits, discProfile, oceanTrait, funnelStage, platform, ctaType } = params;
  const funnelText = funnelStage === "all" ? "TODAS as fases" : (funnelDeep[funnelStage]?.label || funnelStage);
  const disc = discDeep[discProfile];
  const ocean = oceanDeep[oceanTrait];

  return `## MISSÃO
Gere 3 variações de copy de ALTA CONVERSÃO personalizadas para o perfil abaixo.

## BRIEFING
PRODUTO: ${productName}
DESCRIÇÃO: ${productDescription || "N/A"}
BENEFÍCIOS: ${benefits || "N/A"}
PLATAFORMA: ${platform || "geral"}
FASE DO FUNIL: ${funnelText}
${ctaType ? `CTA OBRIGATÓRIO: "${ctaType}"` : ""}

## PERFIL COMPORTAMENTAL
DISC — ${disc?.label || discProfile}:
- DOR: ${disc?.pain || "N/A"}
- DESEJO: ${disc?.desire || "N/A"}
- GATILHOS: ${disc?.triggers || "N/A"}
- EVITAR: ${disc?.repels || "N/A"}
- TOM: ${disc?.tone || "N/A"}

OCEAN — ${ocean?.label || oceanTrait}:
- DOR: ${ocean?.pain || "N/A"}
- DESEJO: ${ocean?.desire || "N/A"}
- GATILHOS: ${ocean?.triggers || "N/A"}
- TOM: ${ocean?.tone || "N/A"}

## FORMATO JSON:
{
  "profile_summary": "resumo de como a copy foi adaptada ao perfil",
  "copies": [
    {
      "label": "Copy Principal",
      "headline": "gancho com padrão de interrupção",
      "subheadline": "aprofunda dor/desejo",
      "body_blocks": ["gancho emocional", "prova/contraste", "transição para CTA"],
      "cta": "CTA contextual",
      "triggers_used": ["gatilho 1", "gatilho 2"],
      "pain_addressed": "dor atacada",
      "desire_addressed": "desejo ativado",
      "persuasion_technique": "técnica usada"
    },
    { "label": "Variação A", "...mesmo formato..." },
    { "label": "Variação B", "...mesmo formato..." }
  ],
  "tone_guide": "guia de tom para esse perfil",
  "avoid_words": ["palavras a evitar"],
  "power_words": ["palavras de poder"]
}`;
}

function buildUserPrompt(params: any): string {
  const { mode } = params;

  if (mode === "caixinha_pergunta") return buildCaixinhaPrompt(params);
  if (mode === "quizz_conversao") return buildQuizzPrompt(params);
  if (mode === "all_disc") return buildAllDiscPrompt(params);
  if (mode === "all_ocean") return buildAllOceanPrompt(params);
  return buildSingleProfilePrompt(params);
}

// ── Main Handler ──

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await sb.auth.getUser(token);
    if (authErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: roles } = await sb.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles || []).some((r: any) => ["admin","super_admin","administrador","suporte","gestor","financeiro"].includes(r.role));
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    if (!body.productName) {
      return new Response(JSON.stringify({ error: "Nome do produto é obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const llm = await getActiveLLM(sb);
    const customPrompt = await getCustomPrompt(sb, "generate_profile_copy");

    const systemPrompt = buildExpertSystemPrompt(customPrompt?.system_prompt);
    const userPrompt = buildUserPrompt(body);
    const temperature = customPrompt?.temperature || 0.8;

    let response = await fetch(llm.apiUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${llm.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: llm.model, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], temperature }),
    });

    if (!response.ok && llm.apiUrl !== "https://ai.gateway.lovable.dev/v1/chat/completions") {
      console.error("External AI failed:", response.status, "— falling back to Lovable AI");
      const fallbackKey = Deno.env.get("LOVABLE_API_KEY") || "";
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${fallbackKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], temperature }),
      });
    }

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit. Tente novamente." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("Erro ao gerar copy");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const usage = data.usage;

    try {
      const inputTokens = usage?.prompt_tokens || Math.ceil((systemPrompt.length + userPrompt.length) / 4);
      const outputTokens = usage?.completion_tokens || Math.ceil(content.length / 4);
      await sb.from("ai_token_usage").insert({
        agent_name: "Copy por Perfil",
        provider: llm.apiUrl.includes("lovable") ? "lovable" : llm.apiUrl.includes("x.ai") ? "xai" : "openai",
        model: llm.model,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
        function_name: "generate-profile-copy",
      });
    } catch (logErr) { console.error("Token log error:", logErr); }

    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: content };
    } catch { parsed = { raw: content }; }

    return new Response(JSON.stringify({ success: true, data: parsed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
