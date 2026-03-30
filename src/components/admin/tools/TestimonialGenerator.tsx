import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Star, Copy, Check, Save, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useProducts } from "@/hooks/useProducts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Persona {
  name: string;
  age: number;
  city: string;
  context: string;
}

interface Testimonial {
  persona: Persona;
  testimonial_text: string;
  usage_time: string;
  headline: string;
  emotion_tag: string;
  rating: number;
  headline_variations?: string[];
  testimonial_variation?: string;
  image_prompt?: string;
}

interface GeneratedData {
  product_analysis?: {
    name: string;
    benefits: string[];
    target_audience: string;
    pain_points: string[];
    language_tone: string;
  };
  testimonials: Testimonial[];
}

export default function TestimonialGenerator() {
  const { data: products } = useProducts();
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [quantity, setQuantity] = useState(5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedData | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);

  const handleProductSelect = (id: string) => {
    setSelectedProductId(id);
    const product = products?.find((p) => p.id === id);
    if (product) {
      setProductName(product.name);
      setProductDescription(product.shortDescription || product.description || "");
      setProductUrl(`/produto/${product.slug}`);
      // Benefits will be sent separately
    }
  };

  const getSelectedProductBenefits = () => {
    const product = products?.find((p) => p.id === selectedProductId);
    return product?.benefits || [];
    }
  };

  const handleGenerate = async () => {
    if (!productName) {
      toast.error("Informe o nome do produto");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-testimonials", {
        body: { productUrl, productName, productDescription, quantity },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.success && data?.data) {
        setResult(data.data);
        toast.success(`${data.data.testimonials?.length || 0} testemunhos gerados!`);
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar testemunhos");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success("Copiado!");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const saveToProduct = async (t: Testimonial, index: number) => {
    if (!selectedProductId) {
      toast.error("Selecione um produto para salvar");
      return;
    }
    setSavingIndex(index);
    try {
      const { error } = await supabase.from("product_testimonials").insert({
        product_id: selectedProductId,
        author_name: `${t.persona.name} - ${t.persona.city}`,
        content: t.testimonial_text,
        rating: t.rating || 5,
      });
      if (error) throw error;
      toast.success("Testemunho salvo no produto!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSavingIndex(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
        <h2 className="text-lg font-semibold mb-4">Gerador de Testemunhos com IA</h2>
        <p className="text-sm text-gray-500 mb-6">
          Gere testemunhos ultra-realistas com personas variadas, prontos para landing pages e anúncios.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Selecionar Produto</label>
            <Select value={selectedProductId} onValueChange={handleProductSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um produto..." />
              </SelectTrigger>
              <SelectContent>
                {products?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Ou informe a URL</label>
            <Input
              placeholder="https://seusite.com/produto/..."
              value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Nome do Produto *</label>
            <Input
              placeholder="Nome do produto"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Quantidade</label>
            <Select value={String(quantity)} onValueChange={(v) => setQuantity(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[3, 5, 8, 10].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} testemunhos</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={handleGenerate} disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              {loading ? "Gerando..." : "Gerar Testemunhos"}
            </Button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Descrição do Produto (opcional)</label>
          <Textarea
            placeholder="Descreva o produto, benefícios, público-alvo..."
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            rows={3}
          />
        </div>
      </Card>

      {/* Product Analysis */}
      {result?.product_analysis && (
        <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
          <h3 className="font-semibold mb-3">📊 Análise do Produto</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-700">Público-alvo:</p>
              <p className="text-gray-600">{result.product_analysis.target_audience}</p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Tom:</p>
              <p className="text-gray-600">{result.product_analysis.language_tone}</p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Benefícios:</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {result.product_analysis.benefits?.map((b, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{b}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="font-medium text-gray-700">Dores:</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {result.product_analysis.pain_points?.map((p, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{p}</Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Testimonials */}
      {result?.testimonials && (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">
            💬 {result.testimonials.length} Testemunhos Gerados
          </h3>
          {result.testimonials.map((t, i) => (
            <Card key={i} className="p-5 bg-white border border-gray-200 rounded-2xl">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-sm">{t.persona.name}</p>
                  <p className="text-xs text-gray-500">
                    {t.persona.age} anos • {t.persona.city} • {t.persona.context}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Badge className="text-xs" variant="secondary">{t.emotion_tag}</Badge>
                  <span className="text-xs text-gray-400 ml-2">{t.usage_time}</span>
                </div>
              </div>

              <div className="flex gap-0.5 mb-2">
                {Array.from({ length: t.rating || 5 }).map((_, s) => (
                  <Star key={s} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              <p className="text-sm italic text-gray-700 mb-3">"{t.headline}"</p>
              <p className="text-sm text-gray-600 mb-4 whitespace-pre-wrap">{t.testimonial_text}</p>

              {t.headline_variations && t.headline_variations.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">Variações de headline:</p>
                  <div className="flex flex-wrap gap-1">
                    {t.headline_variations.map((h, hi) => (
                      <Badge key={hi} variant="outline" className="text-xs cursor-pointer hover:bg-gray-100"
                        onClick={() => copyToClipboard(h, i * 100 + hi)}>
                        {h}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {t.image_prompt && (
                <details className="mb-3">
                  <summary className="text-xs text-blue-600 cursor-pointer">Ver prompt de imagem</summary>
                  <p className="text-xs text-gray-500 mt-1 bg-gray-50 p-2 rounded">{t.image_prompt}</p>
                </details>
              )}

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(t.testimonial_text, i)}
                  className="text-xs"
                >
                  {copiedIndex === i ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  {copiedIndex === i ? "Copiado" : "Copiar"}
                </Button>
                {selectedProductId && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => saveToProduct(t, i)}
                    disabled={savingIndex === i}
                    className="text-xs"
                  >
                    {savingIndex === i ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                    Salvar no Produto
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
