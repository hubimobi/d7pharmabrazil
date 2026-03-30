import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Video, Sparkles, Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProducts } from "@/hooks/useProducts";
import { toast } from "sonner";

// --- Platform configs ---
const platforms: Record<string, { label: string; icon: string; specs: string; tips: string[] }> = {
  reels: {
    label: "📱 Instagram Reels",
    icon: "📱",
    specs: "9:16 vertical • 15-30s • legendas obrigatórias • música trending",
    tips: [
      "Hook nos primeiros 1-2 segundos (pergunta chocante ou resultado visual)",
      "Texto na tela durante TODO o vídeo (85% assistem sem som)",
      "Transições rápidas a cada 2-3 segundos para reter atenção",
      "CTA no final: 'Salve para não esquecer' ou 'Comenta SIM'",
      "Use trending audio para ganhar alcance orgânico",
    ],
  },
  tiktok: {
    label: "🎵 TikTok",
    icon: "🎵",
    specs: "9:16 vertical • 15-60s • ritmo acelerado • tendências",
    tips: [
      "Hook em 0.5s — TikTok penaliza skip rápido",
      "Estilo nativo: parecer UGC, NÃO anúncio polido",
      "Pattern interrupt a cada 3s (zoom, corte, texto pop-up)",
      "Narração em primeira pessoa funciona 3x melhor que terceira",
      "Hashtags: 3-5 relevantes + 1 trending",
    ],
  },
  stories: {
    label: "📲 Stories (IG/FB)",
    icon: "📲",
    specs: "9:16 vertical • 5-15s por story • sequência de 3-5 cards",
    tips: [
      "Card 1: Hook visual impactante (resultado ou problema)",
      "Cards intermediários: jornada rápida antes → depois",
      "Card final: CTA direto (arrastar, link, DM)",
      "Enquetes e stickers aumentam engajamento 40%",
      "Fonte grande e centralizada (área segura do story)",
    ],
  },
  youtube_shorts: {
    label: "▶️ YouTube Shorts",
    icon: "▶️",
    specs: "9:16 vertical • até 60s • SEO no título • thumbnail automática",
    tips: [
      "Primeiros 3s decidem retenção — abra com resultado ou promessa",
      "Loop: final conecta com início para replay automático",
      "Título SEO: use palavra-chave principal no início",
      "Menos cortes que TikTok — YouTube premia watch time",
      "Descreva o produto naturalmente, sem forçar venda",
    ],
  },
  feed_video: {
    label: "🖥️ Feed (FB/IG) 1:1",
    icon: "🖥️",
    specs: "1:1 quadrado ou 4:5 • 15-60s • autoplay silencioso",
    tips: [
      "Barra de texto no topo desde o frame 1 (autoplay mudo)",
      "Formato problema → solução → prova → CTA",
      "Legendas embutidas grandes e contrastantes",
      "Cores vibrantes nos 3 primeiros segundos",
      "Thumbnail frame: escolha um frame impactante para preview",
    ],
  },
  ads: {
    label: "🎯 Anúncio Pago (Meta/TikTok)",
    icon: "🎯",
    specs: "9:16 ou 1:1 • 15-30s • foco em conversão • teste A/B",
    tips: [
      "Framework AIDA: Atenção → Interesse → Desejo → Ação",
      "Hook: 'Você sabia que...' ou resultado visual chocante",
      "Prova social no meio (depoimento real ou número)",
      "Urgência no final: oferta limitada, estoque acabando",
      "Teste 3 hooks diferentes para o mesmo corpo de vídeo",
    ],
  },
  whatsapp_status: {
    label: "💬 Status WhatsApp",
    icon: "💬",
    specs: "9:16 vertical • até 30s • visual simples e direto",
    tips: [
      "Texto grande e legível (telas pequenas)",
      "Mensagem direta: sem rodeios, 1 benefício por status",
      "Visual clean sem muitos elementos",
      "CTA: 'Chama no direct' ou 'Responda este status'",
      "Postar em horários de pico: 7h, 12h, 19h",
    ],
  },
};

// --- Video types ---
const videoTypes: Record<string, { label: string; structure: string }> = {
  testimonial: {
    label: "🗣️ Depoimento / Prova Social",
    structure: "Pessoa falando sobre experiência real com o produto. Estilo selfie/talking head. Mostra emoção genuína, resultado percebido. Inclui nome, cidade e tempo de uso na tela.",
  },
  before_after: {
    label: "🔄 Antes e Depois",
    structure: "Split screen ou sequência mostrando transformação. Primeiro mostra a dor/problema, depois o resultado usando o produto. Transição dramática no meio.",
  },
  unboxing: {
    label: "📦 Unboxing / Review",
    structure: "Mãos abrindo embalagem, mostrando produto de perto, primeira impressão genuína. Estilo casual e autêntico. Zoom nos detalhes do produto.",
  },
  tutorial: {
    label: "📋 Como Usar / Tutorial",
    structure: "Passo a passo visual mostrando como usar o produto. Texto na tela com cada etapa. Resultado final visível ao término.",
  },
  ugc_ad: {
    label: "🤳 UGC para Anúncio",
    structure: "Pessoa real falando para câmera estilo 'descobri esse produto'. Tom casual e espontâneo. Não parece anúncio, parece recomendação de amigo.",
  },
  product_showcase: {
    label: "✨ Vitrine do Produto",
    structure: "Produto filmado em ângulos diferentes com iluminação premium. Transições suaves entre ângulos. Texto com benefícios aparecendo. Visual aspiracional.",
  },
  problem_solution: {
    label: "⚡ Problema → Solução",
    structure: "Cena mostrando frustração/dor do público. Corte para descoberta do produto. Demonstração da solução. Reação positiva. CTA final.",
  },
  comparison: {
    label: "⚖️ Comparação / VS",
    structure: "Lado a lado comparando alternativas genéricas vs. seu produto. Destaque visual claro mostrando superioridade em cada critério.",
  },
};

// --- Visual styles ---
const visualStyles: Record<string, string> = {
  ugc_casual: "Estilo UGC casual: filmado com celular, iluminação natural, ângulo levemente torto, sem edição pesada, autêntico e espontâneo como stories real",
  cinematic: "Estilo cinematográfico: iluminação dramática, profundidade de campo, câmera lenta em momentos-chave, color grading quente/frio, aspecto premium",
  clean_minimal: "Estilo clean e minimalista: fundo sólido ou gradiente suave, tipografia grande, muito espaço negativo, transições simples e elegantes",
  energetic: "Estilo energético: cortes rápidos, zoom ins, efeitos glitch, cores vibrantes, música upbeat, ritmo acelerado, motion graphics",
  editorial: "Estilo editorial/revista: composição sofisticada, paleta de cores muted, fontes serif elegantes, movimento sutil e refinado",
  meme_viral: "Estilo meme/viral: formato reconhecível de trend, texto em formato de meme, referências culturais, humor sutil, estilo 'feito pra compartilhar'",
};

const visualStyleLabels: Record<string, string> = {
  ugc_casual: "🤳 UGC Casual (Autêntico)",
  cinematic: "🎬 Cinematográfico (Premium)",
  clean_minimal: "✨ Clean & Minimalista",
  energetic: "⚡ Energético (Fast Cuts)",
  editorial: "📰 Editorial (Sofisticado)",
  meme_viral: "😂 Meme / Viral (Trend)",
};

export default function VideoGenerator() {
  const [selectedProductId, setSelectedProductId] = useState("");
  const [platform, setPlatform] = useState("reels");
  const [videoType, setVideoType] = useState("testimonial");
  const [visualStyle, setVisualStyle] = useState("ugc_casual");
  const [extraDetails, setExtraDetails] = useState("");
  const [generatedScripts, setGeneratedScripts] = useState<GeneratedScript[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const { data: products } = useProducts();

  const selectedProduct = products?.find((p) => p.id === selectedProductId);
  const currentPlatform = platforms[platform];

  interface GeneratedScript {
    platform: string;
    videoType: string;
    script: string;
    hookVariations: string[];
  }

  const buildVideoScript = (): GeneratedScript => {
    const p = platforms[platform];
    const vt = videoTypes[videoType];
    const vs = visualStyles[visualStyle];

    const sections: string[] = [];

    // Header
    sections.push(`🎬 ROTEIRO DE VÍDEO — ${vt.label}`);
    sections.push(`📱 Plataforma: ${p.label}`);
    sections.push(`📐 Specs: ${p.specs}`);
    sections.push(`🎨 Estilo: ${vs}`);
    sections.push("");

    // Product context
    if (selectedProduct) {
      sections.push("━━━ PRODUTO ━━━");
      sections.push(`Nome: ${selectedProduct.name}`);
      if (selectedProduct.shortDescription) sections.push(`Descrição: ${selectedProduct.shortDescription}`);
      if (selectedProduct.benefits?.length) {
        sections.push(`Benefícios (usar como DORES RESOLVIDAS):`);
        selectedProduct.benefits.forEach((b, i) => sections.push(`  ${i + 1}. ${b}`));
      }
      if (selectedProduct.price) sections.push(`Preço: R$ ${selectedProduct.price.toFixed(2)}`);
      sections.push("");
    }

    // Script structure
    sections.push("━━━ ESTRUTURA DO ROTEIRO ━━━");
    sections.push("");

    // Build script based on video type
    const scriptParts = buildScriptByType(videoType, platform);
    sections.push(scriptParts);

    // Platform tips
    sections.push("");
    sections.push("━━━ DICAS DA PLATAFORMA ━━━");
    p.tips.forEach((tip, i) => sections.push(`${i + 1}. ${tip}`));

    // Extra details
    if (extraDetails.trim()) {
      sections.push("");
      sections.push("━━━ DETALHES ADICIONAIS ━━━");
      sections.push(extraDetails);
    }

    // Hook variations
    const hooks = generateHookVariations(videoType, selectedProduct);

    return {
      platform: p.label,
      videoType: vt.label,
      script: sections.join("\n"),
      hookVariations: hooks,
    };
  };

  const buildScriptByType = (type: string, plat: string): string => {
    const isVertical = ["reels", "tiktok", "stories", "youtube_shorts", "whatsapp_status"].includes(plat);
    const productName = selectedProduct?.name || "[NOME DO PRODUTO]";
    const benefit1 = selectedProduct?.benefits?.[0] || "[BENEFÍCIO PRINCIPAL]";
    const benefit2 = selectedProduct?.benefits?.[1] || "[BENEFÍCIO SECUNDÁRIO]";

    const scripts: Record<string, string> = {
      testimonial: `⏱️ 0-2s — HOOK (Gancho de Atenção)
  → Pessoa olhando para câmera com expressão de surpresa/alívio
  → TEXTO NA TELA: "Eu não acreditava até testar..."
  → Fundo: ambiente caseiro natural (sala, cozinha)

⏱️ 2-7s — ANTES (A Dor)
  → "Gente, eu sofria muito com [problema relacionado a ${benefit1}]"
  → Expressão de frustração real
  → TEXTO: mostra o problema em palavras grandes

⏱️ 7-15s — VIRADA (Descoberta)
  → "Aí uma amiga me indicou o ${productName}..."
  → Mostrar produto na mão (close-up)
  → Transição suave para o produto

⏱️ 15-22s — DEPOIS (Resultado)
  → "Em [tempo], já percebi diferença em ${benefit1}"
  → Expressão genuína de alívio/felicidade
  → TEXTO: resultado em números ou tempo

⏱️ 22-28s — PROVA + CTA
  → "Recomendo demais, sério!"
  → TEXTO FINAL: "Link na bio" ou "Arrasta pra cima"
  → ${isVertical ? "Produto centralizado na tela" : "Produto à direita, texto à esquerda"}`,

      before_after: `⏱️ 0-2s — HOOK VISUAL
  → Tela dividida: ANTES (cinza/apagado) | DEPOIS (vibrante/colorido)
  → TEXTO: "A diferença é REAL 👇"
  → Música: suspense leve

⏱️ 2-8s — ANTES (Problema)
  → Cena mostrando situação SEM o produto
  → Visual mais escuro, expressão de desconforto
  → TEXTO: "${benefit1} era meu maior problema"

⏱️ 8-10s — TRANSIÇÃO DRAMÁTICA
  → Efeito de virada/wipe/zoom
  → Som de impacto
  → Flash breve para branco

⏱️ 10-20s — DEPOIS (Transformação)
  → Mesma cena, mas com resultado positivo
  → Iluminação mais quente, expressão positiva
  → TEXTO: "Depois de usar ${productName}..."
  → Mostrar ${benefit1} e ${benefit2} resolvidos

⏱️ 20-28s — REVEAL + CTA
  → Produto em destaque
  → TEXTO: "Quer o mesmo resultado?"
  → CTA: "Link na bio" | "Comenta EU QUERO"`,

      unboxing: `⏱️ 0-2s — HOOK
  → Close nas mãos com caixa fechada
  → TEXTO: "Chegou! 📦 Vem ver comigo"
  → Som de ASMR/abertura

⏱️ 2-8s — ABERTURA
  → Abrir embalagem lentamente (ASMR)
  → Zoom nos detalhes da embalagem
  → Reação genuína: "Que embalagem linda!"

⏱️ 8-15s — PRIMEIRO CONTATO
  → Tirar produto da caixa
  → Mostrar de todos os ângulos
  → "Olha a textura/qualidade/tamanho..."

⏱️ 15-22s — DETALHES
  → Close-up nos diferenciais
  → "${productName} promete ${benefit1}"
  → Mostrar ingredientes/composição se relevante

⏱️ 22-30s — VEREDICTO + CTA
  → "Primeira impressão: aprovado!"
  → TEXTO: "Vou testar por [X dias] e conto pra vocês"
  → CTA: "Salva pra acompanhar"`,

      tutorial: `⏱️ 0-2s — HOOK
  → TEXTO GRANDE: "Como usar ${productName} do jeito CERTO"
  → Close no produto

⏱️ 2-5s — PASSO 1
  → "Primeiro, [ação 1]..."
  → TEXTO: "PASSO 1: [instrução]"
  → Visual demonstrando

⏱️ 5-10s — PASSO 2
  → "Depois, [ação 2]..."
  → TEXTO: "PASSO 2: [instrução]"
  → Zoom na aplicação/uso

⏱️ 10-18s — PASSO 3 + DICA EXTRA
  → "A dica que ninguém conta: [dica]"
  → TEXTO: "DICA PRO ⭐"
  → Esse é o diferencial do conteúdo

⏱️ 18-25s — RESULTADO
  → Mostrar resultado final
  → "Olha a diferença que faz usar certo!"
  → Comparação rápida

⏱️ 25-30s — CTA
  → "Salva esse vídeo pra não esquecer!"
  → TEXTO: "Compartilha com alguém que precisa"`,

      ugc_ad: `⏱️ 0-1s — HOOK NATIVO
  → Pessoa falando direto pra câmera, tom casual
  → "Para tudo que eu preciso te contar uma coisa..."
  → Visual: selfie camera, sem filtro

⏱️ 1-5s — CONTEXTO PESSOAL
  → "Eu sempre tive problema com [dor de ${benefit1}]"
  → "Já testei de TUDO, nada funcionava"
  → Tom frustrado mas natural

⏱️ 5-12s — DESCOBERTA
  → "Até que apareceu o ${productName} no meu feed"
  → "Fiquei cética, mas resolvi testar..."
  → Mostrar produto (segurando)

⏱️ 12-20s — RESULTADO
  → "Gente. Em [X dias/semanas]..."
  → Expressão de surpresa genuína
  → "${benefit1} melhorou MUITO"
  → "${benefit2} também mudou"

⏱️ 20-27s — RECOMENDAÇÃO FORTE
  → "Se você sofre com [problema], TESTA"
  → "Eu comprei com o meu dinheiro, ninguém me pagou pra falar"
  → Tom de amiga recomendando

⏱️ 27-30s — CTA SUAVE
  → "Vou deixar o link aqui embaixo"
  → TEXTO: seta apontando pra bio/link`,

      product_showcase: `⏱️ 0-3s — ABERTURA PREMIUM
  → Produto surgindo com efeito de luz/reflexo
  → Fundo gradiente elegante
  → TEXTO: marca/nome em fonte sofisticada
  → Música: instrumental suave e premium

⏱️ 3-8s — ÂNGULO 1 (Frontal)
  → Rotação lenta do produto
  → TEXTO animado: "${benefit1}"
  → Iluminação lateral dramática

⏱️ 8-13s — ÂNGULO 2 (Detalhes)
  → Zoom em texturas, ingredientes, detalhes
  → TEXTO: "${benefit2}"
  → Partículas/brilho sutil

⏱️ 13-20s — EM CONTEXTO
  → Produto sendo usado em ambiente lifestyle
  → Transição suave do fundo escuro para cena real
  → Mostra benefícios de forma visual

⏱️ 20-28s — FEATURES + CTA
  → Lista de diferenciais com ícones
  → Preço com efeito de destaque
  → TEXTO FINAL: "Disponível agora"
  → Logo + link`,

      problem_solution: `⏱️ 0-2s — HOOK DE DOR
  → TEXTO IMPACTANTE: "Cansou de [problema]?"
  → Visual: pessoa frustrada/incomodada
  → Cor: tons frios/escuros

⏱️ 2-7s — AMPLIFICA A DOR
  → Cenas rápidas mostrando o problema
  → "Você já tentou de tudo..."
  → "Nada funciona de verdade..."
  → Ritmo crescente de frustração

⏱️ 7-9s — RUPTURA
  → Corte seco ou transição dramática
  → TEXTO: "ATÉ AGORA."
  → Som de impacto + mudança de cor

⏱️ 9-18s — SOLUÇÃO
  → ${productName} aparece como herói
  → "${benefit1}" demonstrado visualmente
  → "${benefit2}" como bônus
  → Tom quente, iluminação positiva

⏱️ 18-25s — PROVA
  → Depoimento rápido (2-3s) de cliente real
  → Ou: números/dados de resultado
  → "Mais de [X] pessoas já resolveram com ${productName}"

⏱️ 25-30s — CTA URGENTE
  → "Oferta por tempo limitado"
  → TEXTO: "Compre agora" + seta
  → Contagem regressiva visual`,

      comparison: `⏱️ 0-2s — HOOK
  → TEXTO: "${productName} VS alternativas"
  → Tela dividida ao meio
  → Suspense: "Qual é melhor?"

⏱️ 2-8s — CRITÉRIO 1
  → Split screen: genérico (❌) vs ${productName} (✅)
  → TEXTO: "${benefit1}"
  → Animação de check/X

⏱️ 8-14s — CRITÉRIO 2
  → Mesmo formato, próximo diferencial
  → TEXTO: "${benefit2}"
  → Destaque visual para o vencedor

⏱️ 14-20s — CRITÉRIO 3
  → Diferencial exclusivo do produto
  → "Só o ${productName} tem isso"
  → Efeito de destaque/brilho

⏱️ 20-25s — RESULTADO FINAL
  → Placar visual: ${productName} vence
  → Animação de vitória/confete
  → "O resultado fala por si"

⏱️ 25-30s — CTA
  → "Faça a escolha certa"
  → TEXTO: link/botão
  → Logo do produto`,
    };

    return scripts[type] || scripts.testimonial;
  };

  const generateHookVariations = (type: string, product?: typeof selectedProduct): string[] => {
    const name = product?.name || "[PRODUTO]";
    const benefit = product?.benefits?.[0] || "[BENEFÍCIO]";

    const hooksByType: Record<string, string[]> = {
      testimonial: [
        `"Eu não acreditava até testar o ${name}..."`,
        `"Se alguém tivesse me falado isso antes, eu não teria acreditado"`,
        `"POV: você finalmente resolve ${benefit}"`,
        `"Preciso ser honesta sobre o ${name}..."`,
        `"Todo mundo me pergunta o que mudou, e a resposta é simples..."`,
      ],
      before_after: [
        `"O antes e depois que ninguém esperava 👇"`,
        `"30 dias. Mesmo produto. Resultado real."`,
        `"Se eu não tivesse filmado, ninguém ia acreditar"`,
        `"A transformação que ${name} proporcionou:"`,
      ],
      unboxing: [
        `"Chegou o que eu mais esperava 📦"`,
        `"Unboxing do ${name} — primeira impressão REAL"`,
        `"Vem abrir comigo! Será que vale o hype?"`,
        `"Finalmente chegou e eu preciso mostrar..."`,
      ],
      tutorial: [
        `"Você está usando ${name} ERRADO se faz isso..."`,
        `"A forma certa de usar que NINGUÉM ensina"`,
        `"3 passos para resultado MÁXIMO com ${name}"`,
        `"Essa dica mudou meu resultado com ${name}"`,
      ],
      ugc_ad: [
        `"Para tudo que eu achei O produto..."`,
        `"Não é publi, comprei com meu dinheiro e olha isso..."`,
        `"Testei por 30 dias e preciso contar pra vocês"`,
        `"Alguém mais sofre com [problema]? Então..."`,
        `"O produto que me indicaram e mudou TUDO"`,
      ],
      product_showcase: [
        `"Conheça o que vai revolucionar seu [resultado]"`,
        `"Premium. Eficaz. ${name}."`,
        `"O detalhe que faz toda a diferença"`,
      ],
      problem_solution: [
        `"Cansou de [problema]? Eu também estava."`,
        `"Isso vai mudar a forma como você resolve ${benefit}"`,
        `"A solução que eu queria ter descoberto antes"`,
        `"Se eu pudesse voltar no tempo e me dar UM conselho..."`,
      ],
      comparison: [
        `"${name} VS o que você usa hoje"`,
        `"Por que eu troquei pra ${name} e não voltei"`,
        `"Comparei com 5 alternativas. O resultado:"`,
      ],
    };

    return hooksByType[type] || hooksByType.testimonial;
  };

  const handleGenerate = () => {
    if (!selectedProductId && !extraDetails.trim()) {
      toast.error("Selecione um produto ou adicione detalhes");
      return;
    }
    const script = buildVideoScript();
    setGeneratedScripts((prev) => [script, ...prev]);
    toast.success("Roteiro gerado! Copie e use para gravar seu vídeo.");
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success("Copiado!");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Config Card */}
      <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
        <h2 className="text-lg font-semibold mb-1">🎬 Gerador de Roteiros de Vídeo</h2>
        <p className="text-sm text-gray-500 mb-6">
          Gere roteiros otimizados por plataforma com hooks de alta conversão, estrutura temporal e dicas profissionais.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Produto</label>
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger><SelectValue placeholder="Selecione um produto" /></SelectTrigger>
              <SelectContent>
                {products?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Plataforma</label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(platforms).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Tipo de Vídeo</label>
            <Select value={videoType} onValueChange={setVideoType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(videoTypes).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Estilo Visual</label>
            <Select value={visualStyle} onValueChange={setVisualStyle}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(visualStyleLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Platform tips preview */}
        <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-semibold text-blue-700">Dicas: {currentPlatform.label}</span>
          </div>
          <p className="text-xs text-blue-600 mb-1">{currentPlatform.specs}</p>
          <ul className="text-xs text-blue-600 space-y-0.5">
            {currentPlatform.tips.slice(0, 3).map((tip, i) => (
              <li key={i}>• {tip}</li>
            ))}
          </ul>
        </div>

        {/* Product preview */}
        {selectedProduct && (
          <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
            {selectedProduct.image && (
              <img src={selectedProduct.image} alt="" className="w-12 h-12 rounded-lg object-cover" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedProduct.name}</p>
              <p className="text-xs text-gray-500 truncate">{selectedProduct.shortDescription}</p>
              {selectedProduct.benefits?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedProduct.benefits.slice(0, 3).map((b, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">{b}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mb-4">
          <label className="text-sm font-medium mb-1 block">Detalhes adicionais (opcional)</label>
          <Textarea
            placeholder="Ex: Focar em público feminino 25-40 anos, destacar preço promocional, mencionar frete grátis..."
            value={extraDetails}
            onChange={(e) => setExtraDetails(e.target.value)}
            rows={2}
          />
        </div>

        <Button onClick={handleGenerate} className="w-full md:w-auto">
          <Sparkles className="h-4 w-4 mr-2" />
          Gerar Roteiro
        </Button>
      </Card>

      {/* Generated Scripts */}
      {generatedScripts.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">📋 Roteiros Gerados</h3>
          {generatedScripts.map((script, i) => (
            <Card key={i} className="p-5 bg-white border border-gray-200 rounded-2xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">{script.platform}</Badge>
                  <Badge variant="outline" className="text-xs">{script.videoType}</Badge>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(script.script, i)}
                  className="text-xs"
                >
                  {copiedIndex === i ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  {copiedIndex === i ? "Copiado!" : "Copiar Roteiro"}
                </Button>
              </div>

              {/* Script */}
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 p-4 rounded-lg border border-gray-100 mb-4 max-h-96 overflow-y-auto">
                {script.script}
              </pre>

              {/* Hook Variations */}
              {script.hookVariations.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">🎣 Variações de Hook (teste A/B):</p>
                  <div className="space-y-1.5">
                    {script.hookVariations.map((hook, hi) => (
                      <div
                        key={hi}
                        className="flex items-center justify-between p-2 bg-amber-50 rounded-lg border border-amber-100 cursor-pointer hover:bg-amber-100 transition-colors"
                        onClick={() => copyToClipboard(hook, i * 100 + hi)}
                      >
                        <span className="text-xs text-amber-800">{hook}</span>
                        <Copy className="h-3 w-3 text-amber-400 flex-shrink-0 ml-2" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {generatedScripts.length === 0 && (
        <Card className="p-12 text-center bg-white border border-dashed border-gray-300 rounded-2xl">
          <Video className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400">Os roteiros gerados aparecerão aqui</p>
        </Card>
      )}
    </div>
  );
}
