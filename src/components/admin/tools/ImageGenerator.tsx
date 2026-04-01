import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Copy, Check, ImageIcon, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProducts } from "@/hooks/useProducts";
import ProductComboSelect from "@/components/admin/ProductComboSelect";
import { toast } from "sonner";

const objectives: Record<string, string> = {
  product_hero: "Foto principal do produto para e-commerce, fundo branco limpo, iluminação profissional de estúdio, produto centralizado, alta resolução comercial",
  lifestyle: "Produto em contexto de uso real, ambiente lifestyle natural, pessoa usando o produto no dia a dia, composição orgânica",
  social_feed: "Imagem vibrante para feed de redes sociais, composição moderna e atraente, cores vivas, formato quadrado otimizado para engajamento",
  stories: "Imagem vertical para stories/reels, visual dinâmico e chamativo, com espaço para texto sobreposto, formato 9:16",
  banner_site: "Banner promocional horizontal para site, layout widescreen, visual premium comercial, com área para texto à esquerda",
  ad_creative: "Criativo para anúncio pago (Facebook/Instagram Ads), visual que para o scroll, composição impactante, foco no produto",
  testimonial: "Selfie realista de pessoa brasileira segurando ou usando o produto, ambiente cotidiano, iluminação natural, estilo casual autêntico, não parecer banco de imagem",
  unboxing: "Cena de unboxing do produto, embalagem aberta sobre mesa, mãos aparecendo, ambiente caseiro natural, visual de review",
  before_after: "Imagem comparativa antes e depois, split screen, visual clean e profissional, mostrando transformação",
};

const objectiveLabels: Record<string, string> = {
  product_hero: "📦 Foto Principal (E-commerce)",
  lifestyle: "🏡 Lifestyle / Uso Real",
  social_feed: "📱 Feed Social Media",
  stories: "📲 Stories / Reels",
  banner_site: "🖥️ Banner para Site",
  ad_creative: "🎯 Criativo para Ads",
  testimonial: "🤳 Prova Social / Testemunho",
  unboxing: "📦 Unboxing / Review",
  before_after: "🔄 Antes e Depois",
};

const styles: Record<string, string> = {
  photographic: "fotografia profissional com câmera DSLR, iluminação de estúdio, foco nítido, profundidade de campo, cores naturais, resolução 4K",
  realistic: "ultra realista, hiper-realismo, texturas detalhadas, iluminação natural do ambiente, sem filtros artificiais, como foto de celular de alta qualidade",
  illustration: "ilustração digital moderna, estilo flat design com sombras suaves, cores vibrantes, traços limpos, visual de design gráfico profissional",
  ugc: "estilo UGC (User Generated Content), foto casual tirada com celular, ângulo levemente torto, iluminação ambiente natural, qualidade de câmera de smartphone, autêntico e espontâneo",
  watercolor: "estilo aquarela artístico, pinceladas suaves, cores translúcidas, visual delicado e artesanal, fundo com textura de papel",
  minimal: "estilo minimalista, fundo sólido pastel, composição clean com muito espaço negativo, visual elegante e sofisticado",
};

const styleLabels: Record<string, string> = {
  photographic: "📷 Fotográfico (Estúdio)",
  realistic: "🔍 Realista (Celular HD)",
  illustration: "🎨 Ilustração Digital",
  ugc: "🤳 UGC (Conteúdo Autêntico)",
  watercolor: "🖌️ Aquarela / Artístico",
  minimal: "✨ Minimalista",
};

export default function ImageGenerator() {
  const [prompt, setPrompt] = useState("");
  const [objective, setObjective] = useState("product_hero");
  const [style, setStyle] = useState("photographic");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [generatedPrompts, setGeneratedPrompts] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const { data: products } = useProducts();

  const selectedProduct = products?.find((p) => p.id === selectedProductId);

  const buildPrompt = () => {
    const parts: string[] = [];
    parts.push(objectives[objective]);
    parts.push(styles[style]);

    if (selectedProduct) {
      parts.push(`Produto: ${selectedProduct.name}`);
      if (selectedProduct.shortDescription) parts.push(`Descrição: ${selectedProduct.shortDescription}`);
      if (selectedProduct.benefits?.length) parts.push(`Benefícios: ${selectedProduct.benefits.slice(0, 5).join(", ")}`);
    }

    if (prompt.trim()) parts.push(`Detalhes adicionais: ${prompt}`);

    parts.push("Sem texto na imagem, sem marcas d'água, sem logos sobrepostos");
    return parts.join(". ") + ".";
  };

  const handleGenerate = () => {
    if (!selectedProductId && !prompt.trim()) {
      toast.error("Selecione um produto ou descreva a imagem");
      return;
    }
    const fullPrompt = buildPrompt();
    setGeneratedPrompts((prev) => [fullPrompt, ...prev]);
    toast.success("Prompt gerado! Copie e use no Gemini ou GPT.");
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success("Prompt copiado!");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
        <h2 className="text-lg font-semibold mb-1">🎨 Gerador de Prompts de Imagem</h2>
        <p className="text-sm text-gray-500 mb-6">Selecione produto, objetivo e estilo para gerar prompts otimizados para Gemini ou GPT.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Produto / Combo</label>
            <ProductComboSelect
              value={selectedProductId}
              onValueChange={setSelectedProductId}
              placeholder="Selecione um produto ou combo"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Objetivo</label>
            <Select value={objective} onValueChange={setObjective}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(objectiveLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Estilo Visual</label>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(styleLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium mb-1 block">Detalhes adicionais (opcional)</label>
          <Textarea
            placeholder="Ex: Com fundo degradê azul, pessoa sorrindo, luz do pôr do sol..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
          />
        </div>

        {selectedProduct && (
          <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
            {selectedProduct.image && (
              <img src={selectedProduct.image} alt="" className="w-12 h-12 rounded-lg object-cover" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedProduct.name}</p>
              <p className="text-xs text-gray-500 truncate">{selectedProduct.shortDescription}</p>
              {selectedProduct.benefits?.length > 0 && (
                <p className="text-xs text-gray-400 truncate mt-0.5">Benefícios: {selectedProduct.benefits.slice(0, 3).join(", ")}</p>
              )}
            </div>
          </div>
        )}

        <Button onClick={handleGenerate} className="w-full md:w-auto">
          <Sparkles className="h-4 w-4 mr-2" />
          Gerar Prompt
        </Button>
      </Card>

      {generatedPrompts.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">📋 Prompts Gerados</h3>
          {generatedPrompts.map((p, i) => (
            <Card key={i} className="p-4 bg-white border border-gray-200 rounded-2xl">
              <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3 font-mono bg-gray-50 p-3 rounded-lg border border-gray-100">{p}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(p, i)}
                className="text-xs"
              >
                {copiedIndex === i ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                {copiedIndex === i ? "Copiado!" : "Copiar Prompt"}
              </Button>
            </Card>
          ))}
        </div>
      )}

      {generatedPrompts.length === 0 && (
        <Card className="p-12 text-center bg-white border border-dashed border-gray-300 rounded-2xl">
          <ImageIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400">Os prompts gerados aparecerão aqui</p>
        </Card>
      )}
    </div>
  );
}
