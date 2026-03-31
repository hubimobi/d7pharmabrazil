import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, Check, UserCog, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useProducts } from "@/hooks/useProducts";

interface CopyBlock {
  label: string;
  headline: string;
  subheadline: string;
  body_blocks: string[];
  cta: string;
  triggers_used: string[];
}

interface ProfileCopyResult {
  profile_summary: string;
  copies: CopyBlock[];
  tone_guide: string;
  avoid_words: string[];
  power_words: string[];
}

const DISC_OPTIONS = [
  { value: "D", label: "D — Dominância", desc: "Direto, resultado, rápido" },
  { value: "I", label: "I — Influência", desc: "Emocional, empolgante, social" },
  { value: "S", label: "S — Estabilidade", desc: "Seguro, confiável, tranquilo" },
  { value: "C", label: "C — Conformidade", desc: "Lógico, técnico, detalhado" },
];

const OCEAN_OPTIONS = [
  { value: "openness", label: "Abertura", desc: "Inovação e criatividade" },
  { value: "conscientiousness", label: "Conscienciosidade", desc: "Disciplina e organização" },
  { value: "extraversion", label: "Extroversão", desc: "Entusiasmo e energia" },
  { value: "agreeableness", label: "Amabilidade", desc: "Empatia e harmonia" },
  { value: "neuroticism", label: "Neuroticismo", desc: "Medo e prevenção" },
];

const FUNNEL_OPTIONS = [
  { value: "unaware", label: "Sem Noção", desc: "Não sabe que tem o problema" },
  { value: "curious", label: "Curioso", desc: "Sabe do problema, busca soluções" },
  { value: "ready", label: "Pronto p/ Compra", desc: "Decidido, precisa de um empurrão" },
  { value: "post", label: "Pós-Compra", desc: "Já comprou, fidelização" },
];

const PLATFORM_OPTIONS = [
  { value: "geral", label: "Geral" },
  { value: "facebook", label: "Facebook / Instagram" },
  { value: "google", label: "Google Ads" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "E-mail Marketing" },
  { value: "landing_page", label: "Landing Page" },
];

export default function ProfileCopyGenerator() {
  const { data: products } = useProducts();
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [benefits, setBenefits] = useState("");
  const [discProfile, setDiscProfile] = useState("D");
  const [oceanTrait, setOceanTrait] = useState("openness");
  const [funnelStage, setFunnelStage] = useState("curious");
  const [platform, setPlatform] = useState("geral");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProfileCopyResult | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleProductSelect = (id: string) => {
    setSelectedProductId(id);
    const product = products?.find((p) => p.id === id);
    if (product) {
      setProductName(product.name);
      setProductDescription(product.shortDescription || product.description || "");
      const b = Array.isArray(product.benefits) ? (product.benefits as string[]).join(", ") : "";
      setBenefits(b);
    }
  };

  const handleGenerate = async () => {
    if (!productName) { toast.error("Informe o produto"); return; }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-profile-copy", {
        body: { productName, productDescription, benefits, discProfile, oceanTrait, funnelStage, platform },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.success && data.data?.copies) {
        setResult(data.data);
        toast.success("Copies geradas com sucesso!");
      } else {
        toast.error("Resposta inesperada da IA");
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar");
    } finally {
      setLoading(false);
    }
  };

  const copyFull = (copy: CopyBlock, key: string) => {
    const full = `${copy.headline}\n\n${copy.subheadline}\n\n${copy.body_blocks.join("\n\n")}\n\n${copy.cta}`;
    navigator.clipboard.writeText(full);
    setCopiedKey(key);
    toast.success("Copy copiada!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Form */}
      <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <UserCog className="h-5 w-5 text-indigo-600" />
          Gerador de Copy por Perfil Comportamental
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Gere copies de alta conversão personalizadas por perfil DISC, OCEAN e fase do funil.
        </p>

        {/* Product */}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Descrição</label>
            <Textarea value={productDescription} onChange={(e) => setProductDescription(e.target.value)} rows={2} placeholder="Descreva o produto..." />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Benefícios</label>
            <Textarea value={benefits} onChange={(e) => setBenefits(e.target.value)} rows={2} placeholder="Liste os benefícios..." />
          </div>
        </div>

        {/* Profile Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Perfil DISC</label>
            <Select value={discProfile} onValueChange={setDiscProfile}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DISC_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    <span className="font-medium">{o.label}</span>
                    <span className="text-xs text-gray-400 ml-1">— {o.desc}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Traço OCEAN</label>
            <Select value={oceanTrait} onValueChange={setOceanTrait}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {OCEAN_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    <span className="font-medium">{o.label}</span>
                    <span className="text-xs text-gray-400 ml-1">— {o.desc}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Fase do Funil</label>
            <Select value={funnelStage} onValueChange={setFunnelStage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FUNNEL_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    <span className="font-medium">{o.label}</span>
                    <span className="text-xs text-gray-400 ml-1">— {o.desc}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Plataforma</label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PLATFORM_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={handleGenerate} disabled={loading} className="w-full md:w-auto">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
          {loading ? "Gerando Copies..." : "Gerar Copy por Perfil"}
        </Button>
      </Card>

      {/* Results */}
      {result && (
        <>
          {/* Profile Summary */}
          {result.profile_summary && (
            <Card className="p-5 bg-indigo-50 border border-indigo-200 rounded-2xl">
              <h3 className="text-sm font-semibold text-indigo-800 mb-1">🧠 Perfil Comportamental</h3>
              <p className="text-sm text-indigo-700">{result.profile_summary}</p>
            </Card>
          )}

          {/* Copies */}
          {result.copies?.map((copy, i) => (
            <Card key={i} className="p-5 bg-white border border-gray-200 rounded-2xl">
              <div className="flex items-center justify-between mb-3">
                <Badge variant="secondary" className="text-xs">{copy.label}</Badge>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => copyFull(copy, `copy-${i}`)}
                >
                  {copiedKey === `copy-${i}` ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  Copiar Tudo
                </Button>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500">Headline:</p>
                  <p className="text-base font-bold text-gray-900">{copy.headline}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Subheadline:</p>
                  <p className="text-sm font-medium text-gray-700">{copy.subheadline}</p>
                </div>
                {copy.body_blocks?.map((block, bi) => (
                  <div key={bi}>
                    <p className="text-xs font-medium text-gray-400">Bloco {bi + 1}:</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{block}</p>
                  </div>
                ))}
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500">CTA:</p>
                  <p className="text-sm font-bold text-indigo-700">{copy.cta}</p>
                </div>
                {copy.triggers_used?.length > 0 && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs text-gray-400">Gatilhos:</span>
                    {copy.triggers_used.map((t, ti) => (
                      <Badge key={ti} variant="outline" className="text-[10px]">{t}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}

          {/* Tone Guide & Words */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {result.tone_guide && (
              <Card className="p-4 bg-white border border-gray-200 rounded-2xl">
                <h4 className="text-sm font-semibold mb-2">🎤 Guia de Tom</h4>
                <p className="text-xs text-gray-600">{result.tone_guide}</p>
              </Card>
            )}
            {result.power_words?.length > 0 && (
              <Card className="p-4 bg-white border border-gray-200 rounded-2xl">
                <h4 className="text-sm font-semibold mb-2 text-green-700">⚡ Palavras de Poder</h4>
                <div className="flex flex-wrap gap-1">
                  {result.power_words.map((w, i) => (
                    <Badge key={i} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">{w}</Badge>
                  ))}
                </div>
              </Card>
            )}
            {result.avoid_words?.length > 0 && (
              <Card className="p-4 bg-white border border-gray-200 rounded-2xl">
                <h4 className="text-sm font-semibold mb-2 text-red-600">🚫 Palavras a Evitar</h4>
                <div className="flex flex-wrap gap-1">
                  {result.avoid_words.map((w, i) => (
                    <Badge key={i} variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200">{w}</Badge>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
