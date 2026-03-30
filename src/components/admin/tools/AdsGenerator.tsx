import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, Check, Megaphone } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useProducts } from "@/hooks/useProducts";

export default function AdsGenerator() {
  const { data: products } = useProducts();
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [platform, setPlatform] = useState("facebook");
  const [objective, setObjective] = useState("conversao");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleProductSelect = (id: string) => {
    setSelectedProductId(id);
    const product = products?.find((p) => p.id === id);
    if (product) {
      setProductName(product.name);
      setProductDescription(product.short_description || product.description || "");
    }
  };

  const handleGenerate = async () => {
    if (!productName) { toast.error("Informe o produto"); return; }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-ad-copy", {
        body: { productName, productDescription, platform, objective },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.success) {
        setResult(data.data);
        toast.success("Copies geradas!");
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar");
    } finally {
      setLoading(false);
    }
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copiado!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
        <h2 className="text-lg font-semibold mb-2">📣 Criador de ADS com IA</h2>
        <p className="text-sm text-gray-500 mb-6">
          Gere copies e sugestões de criativos para Facebook, Instagram e Google Ads.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Selecionar Produto</label>
            <Select value={selectedProductId} onValueChange={handleProductSelect}>
              <SelectTrigger><SelectValue placeholder="Escolha..." /></SelectTrigger>
              <SelectContent>
                {products?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Nome do Produto *</label>
            <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Nome..." />
          </div>
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium mb-1 block">Descrição</label>
          <Textarea value={productDescription} onChange={(e) => setProductDescription(e.target.value)} rows={2} placeholder="Descreva o produto..." />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Plataforma</label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="facebook">Facebook / Instagram</SelectItem>
                <SelectItem value="google">Google Ads</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Objetivo</label>
            <Select value={objective} onValueChange={setObjective}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="conversao">Conversão</SelectItem>
                <SelectItem value="trafego">Tráfego</SelectItem>
                <SelectItem value="awareness">Awareness</SelectItem>
                <SelectItem value="remarketing">Remarketing</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={handleGenerate} disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Megaphone className="h-4 w-4 mr-2" />}
              {loading ? "Gerando..." : "Gerar Copies"}
            </Button>
          </div>
        </div>
      </Card>

      {result?.ads && (
        <div className="space-y-4">
          {result.ads.map((ad: any, i: number) => (
            <Card key={i} className="p-5 bg-white border border-gray-200 rounded-2xl">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="text-xs uppercase">{ad.type}</Badge>
              </div>
              {ad.headline && (
                <div className="mb-2">
                  <p className="text-xs font-medium text-gray-500">Headline:</p>
                  <p className="text-sm font-semibold">{ad.headline}</p>
                </div>
              )}
              {ad.primary_text && (
                <div className="mb-2">
                  <p className="text-xs font-medium text-gray-500">Texto Principal:</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{ad.primary_text}</p>
                </div>
              )}
              {ad.hook && (
                <div className="mb-2">
                  <p className="text-xs font-medium text-gray-500">Hook (3s):</p>
                  <p className="text-sm font-semibold text-blue-700">{ad.hook}</p>
                </div>
              )}
              {ad.script && (
                <div className="mb-2">
                  <p className="text-xs font-medium text-gray-500">Roteiro:</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{ad.script}</p>
                </div>
              )}
              {ad.cta && <p className="text-xs text-gray-500 mb-2">CTA: <span className="font-medium">{ad.cta}</span></p>}
              {ad.image_prompt && (
                <details className="mb-2">
                  <summary className="text-xs text-blue-600 cursor-pointer">Prompt de imagem</summary>
                  <p className="text-xs text-gray-500 mt-1 bg-gray-50 p-2 rounded">{ad.image_prompt}</p>
                </details>
              )}
              {ad.variations && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-1">Variações A/B:</p>
                  {ad.variations.map((v: any, vi: number) => (
                    <div key={vi} className="text-xs text-gray-600 mb-1 pl-2 border-l-2 border-gray-200">
                      <span className="font-medium">{v.headline}</span> — {v.primary_text?.substring(0, 80)}...
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 pt-2 border-t border-gray-100 mt-3">
                <Button size="sm" variant="outline" className="text-xs"
                  onClick={() => copy(`${ad.headline || ad.hook}\n\n${ad.primary_text || ad.script}\n\n${ad.cta || ""}`, `ad-${i}`)}>
                  {copiedKey === `ad-${i}` ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  Copiar Copy
                </Button>
              </div>
            </Card>
          ))}

          {result.targeting_suggestions && (
            <Card className="p-5 bg-white border border-gray-200 rounded-2xl">
              <h3 className="font-semibold text-sm mb-2">🎯 Sugestões de Segmentação</h3>
              <div className="text-sm text-gray-600 space-y-1">
                {result.targeting_suggestions.age_range && <p>Idade: {result.targeting_suggestions.age_range}</p>}
                {result.targeting_suggestions.interests && (
                  <div className="flex flex-wrap gap-1">
                    {result.targeting_suggestions.interests.map((int: string, ii: number) => (
                      <Badge key={ii} variant="outline" className="text-xs">{int}</Badge>
                    ))}
                  </div>
                )}
                {result.targeting_suggestions.lookalike_suggestion && (
                  <p className="text-xs text-gray-500 mt-1">Lookalike: {result.targeting_suggestions.lookalike_suggestion}</p>
                )}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
