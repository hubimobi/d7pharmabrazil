import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, Check, UserCog, Sparkles, Users, Trophy, Globe, FileText, Package, Download, Table2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useProducts } from "@/hooks/useProducts";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

interface AllDiscProfile {
  profile_summary: string;
  headline: string;
  subheadline: string;
  body_blocks: string[];
  cta: string;
  triggers_used: string[];
  estimated_performance: number;
  tone: string;
}

interface AllDiscResult {
  profiles: Record<string, AllDiscProfile>;
  best_profile: string;
  comparison_notes: string;
}

const DISC_OPTIONS = [
  { value: "D", label: "D — Dominância", desc: "Direto, resultado, rápido", color: "bg-red-100 text-red-800 border-red-300" },
  { value: "I", label: "I — Influência", desc: "Emocional, empolgante, social", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  { value: "S", label: "S — Estabilidade", desc: "Seguro, confiável, tranquilo", color: "bg-green-100 text-green-800 border-green-300" },
  { value: "C", label: "C — Conformidade", desc: "Lógico, técnico, detalhado", color: "bg-blue-100 text-blue-800 border-blue-300" },
];

const DISC_COLORS: Record<string, { bar: string; badge: string; bg: string }> = {
  D: { bar: "bg-red-500", badge: "bg-red-100 text-red-800 border-red-300", bg: "border-red-200" },
  I: { bar: "bg-yellow-500", badge: "bg-yellow-100 text-yellow-800 border-yellow-300", bg: "border-yellow-200" },
  S: { bar: "bg-green-500", badge: "bg-green-100 text-green-800 border-green-300", bg: "border-green-200" },
  C: { bar: "bg-blue-500", badge: "bg-blue-100 text-blue-800 border-blue-300", bg: "border-blue-200" },
};

const DISC_NAMES: Record<string, string> = {
  D: "Dominância",
  I: "Influência",
  S: "Estabilidade",
  C: "Conformidade",
};

const OCEAN_COLORS: Record<string, { bar: string; badge: string; bg: string }> = {
  openness: { bar: "bg-purple-500", badge: "bg-purple-100 text-purple-800 border-purple-300", bg: "border-purple-200" },
  conscientiousness: { bar: "bg-teal-500", badge: "bg-teal-100 text-teal-800 border-teal-300", bg: "border-teal-200" },
  extraversion: { bar: "bg-orange-500", badge: "bg-orange-100 text-orange-800 border-orange-300", bg: "border-orange-200" },
  agreeableness: { bar: "bg-pink-500", badge: "bg-pink-100 text-pink-800 border-pink-300", bg: "border-pink-200" },
  neuroticism: { bar: "bg-gray-500", badge: "bg-gray-100 text-gray-800 border-gray-300", bg: "border-gray-200" },
};

const OCEAN_NAMES: Record<string, string> = {
  openness: "Abertura",
  conscientiousness: "Conscienciosidade",
  extraversion: "Extroversão",
  agreeableness: "Amabilidade",
  neuroticism: "Neuroticismo",
};

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
  const [sourceType, setSourceType] = useState<"product" | "url" | "text">("product");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [baseText, setBaseText] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [benefits, setBenefits] = useState("");
  const [discProfile, setDiscProfile] = useState("D");
  const [oceanTrait, setOceanTrait] = useState("openness");
  const [funnelStage, setFunnelStage] = useState("curious");
  const [platform, setPlatform] = useState("geral");
  const [loading, setLoading] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [loadingOcean, setLoadingOcean] = useState(false);
  const [result, setResult] = useState<ProfileCopyResult | null>(null);
  const [allDiscResult, setAllDiscResult] = useState<AllDiscResult | null>(null);
  const [allOceanResult, setAllOceanResult] = useState<AllDiscResult | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showCampaignTable, setShowCampaignTable] = useState(false);

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

  const getBodyPayload = () => {
    if (sourceType === "url") {
      return { productName: referenceUrl, productDescription: `Conteúdo da URL: ${referenceUrl}`, benefits: "", referenceUrl };
    }
    if (sourceType === "text") {
      return { productName: "Texto Base", productDescription: baseText, benefits: "" };
    }
    return { productName, productDescription, benefits };
  };

  const handleGenerate = async () => {
    if (sourceType === "product" && !productName) { toast.error("Informe o produto"); return; }
    if (sourceType === "url" && !referenceUrl) { toast.error("Informe a URL"); return; }
    if (sourceType === "text" && baseText.length < 10) { toast.error("Texto muito curto"); return; }
    setLoading(true);
    setResult(null);
    setAllDiscResult(null);
    setAllOceanResult(null);
    try {
      const payload = getBodyPayload();
      const { data, error } = await supabase.functions.invoke("generate-profile-copy", {
        body: { ...payload, discProfile, oceanTrait, funnelStage, platform },
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

  const handleGenerateAllDisc = async () => {
    if (sourceType === "product" && !productName) { toast.error("Informe o produto"); return; }
    if (sourceType === "url" && !referenceUrl) { toast.error("Informe a URL"); return; }
    if (sourceType === "text" && baseText.length < 10) { toast.error("Texto muito curto"); return; }
    setLoadingAll(true);
    setAllDiscResult(null);
    setAllOceanResult(null);
    setResult(null);
    try {
      const payload = getBodyPayload();
      const { data, error } = await supabase.functions.invoke("generate-profile-copy", {
        body: { ...payload, oceanTrait, funnelStage, platform, mode: "all_disc" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.success && data.data?.profiles) {
        setAllDiscResult(data.data);
        toast.success("Variações por perfil geradas!");
      } else {
        toast.error("Resposta inesperada da IA");
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar");
    } finally {
      setLoadingAll(false);
    }
  };

  const handleGenerateAllOcean = async () => {
    if (sourceType === "product" && !productName) { toast.error("Informe o produto"); return; }
    if (sourceType === "url" && !referenceUrl) { toast.error("Informe a URL"); return; }
    if (sourceType === "text" && baseText.length < 10) { toast.error("Texto muito curto"); return; }
    setLoadingOcean(true);
    setAllOceanResult(null);
    setAllDiscResult(null);
    setResult(null);
    try {
      const payload = getBodyPayload();
      const { data, error } = await supabase.functions.invoke("generate-profile-copy", {
        body: { ...payload, discProfile, funnelStage, platform, mode: "all_ocean" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.success && data.data?.profiles) {
        setAllOceanResult(data.data);
        toast.success("Variações OCEAN geradas!");
      } else {
        toast.error("Resposta inesperada da IA");
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar");
    } finally {
      setLoadingOcean(false);
    }
  };

  const copyFull = (copy: { headline: string; subheadline: string; body_blocks: string[]; cta: string }, key: string) => {
    const full = `${copy.headline}\n\n${copy.subheadline}\n\n${copy.body_blocks.join("\n\n")}\n\n${copy.cta}`;
    navigator.clipboard.writeText(full);
    setCopiedKey(key);
    toast.success("Copy copiada!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const buildCampaignRows = () => {
    const rows: { campaign: string; adSet: string; adName: string; headline: string; description: string; primaryText: string; cta: string; platform: string }[] = [];
    const platLabel = PLATFORM_OPTIONS.find(p => p.value === platform)?.label || platform;
    const funnelLabel = FUNNEL_OPTIONS.find(f => f.value === funnelStage)?.label || funnelStage;
    const prodLabel = sourceType === "product" ? productName : sourceType === "url" ? referenceUrl : "Texto Base";

    if (allDiscResult?.profiles) {
      Object.entries(allDiscResult.profiles).forEach(([key, profile]) => {
        if (!profile) return;
        rows.push({
          campaign: `${prodLabel} — DISC`,
          adSet: `${DISC_NAMES[key] || key} | ${funnelLabel}`,
          adName: `${key}_${platform}`,
          headline: profile.headline || "",
          description: profile.subheadline || "",
          primaryText: (profile.body_blocks || []).join(" "),
          cta: profile.cta || "",
          platform: platLabel,
        });
      });
    }

    if (allOceanResult?.profiles) {
      Object.entries(allOceanResult.profiles).forEach(([key, profile]) => {
        if (!profile) return;
        rows.push({
          campaign: `${prodLabel} — OCEAN`,
          adSet: `${OCEAN_NAMES[key] || key} | ${funnelLabel}`,
          adName: `${key}_${platform}`,
          headline: profile.headline || "",
          description: profile.subheadline || "",
          primaryText: (profile.body_blocks || []).join(" "),
          cta: profile.cta || "",
          platform: platLabel,
        });
      });
    }

    if (result?.copies) {
      result.copies.forEach((copy, i) => {
        rows.push({
          campaign: `${prodLabel} — Perfil`,
          adSet: `${DISC_NAMES[discProfile] || discProfile} | ${funnelLabel}`,
          adName: copy.label || `Copy ${i + 1}`,
          headline: copy.headline || "",
          description: copy.subheadline || "",
          primaryText: (copy.body_blocks || []).join(" "),
          cta: copy.cta || "",
          platform: platLabel,
        });
      });
    }

    return rows;
  };

  const exportCampaignCSV = () => {
    const rows = buildCampaignRows();
    if (!rows.length) { toast.error("Nenhuma copy gerada para exportar"); return; }
    const headers = ["Campaign Name", "Ad Set Name", "Ad Name", "Headline", "Description", "Primary Text", "Call to Action", "Platform"];
    const csvContent = [
      headers.join(","),
      ...rows.map(r => [r.campaign, r.adSet, r.adName, r.headline, r.description, r.primaryText, r.cta, r.platform].map(v => `"${(v || "").replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `campanha_copies_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado com sucesso!");
  };

  const hasAnyResult = !!(result || allDiscResult || allOceanResult);
  const isLoading = loading || loadingAll || loadingOcean;

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

        {/* Source Type Toggle */}
        <div className="flex gap-2 mb-4">
          {[
            { value: "product" as const, label: "Produto", icon: Package },
            { value: "url" as const, label: "URL de Referência", icon: Globe },
            { value: "text" as const, label: "Texto Base", icon: FileText },
          ].map((opt) => (
            <Button
              key={opt.value}
              type="button"
              variant={sourceType === opt.value ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={() => setSourceType(opt.value)}
            >
              <opt.icon className="h-3 w-3 mr-1" />
              {opt.label}
            </Button>
          ))}
        </div>

        {sourceType === "product" && (
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
        )}

        {sourceType === "url" && (
          <div className="mb-4">
            <label className="text-sm font-medium mb-1 block">URL de Referência *</label>
            <Input value={referenceUrl} onChange={(e) => setReferenceUrl(e.target.value)} placeholder="https://exemplo.com/pagina-do-produto" />
            <p className="text-xs text-gray-400 mt-1">Cole a URL da página que será usada como referência para gerar a copy.</p>
          </div>
        )}

        {sourceType === "text" && (
          <div className="mb-4">
            <label className="text-sm font-medium mb-1 block">Texto Base *</label>
            <Textarea value={baseText} onChange={(e) => setBaseText(e.target.value)} rows={5} placeholder="Cole aqui o texto base que será usado como referência para gerar a copy..." />
            <p className="text-xs text-gray-400 mt-1">{baseText.length} caracteres</p>
          </div>
        )}

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

        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <Button onClick={handleGenerate} disabled={isLoading} className="w-full sm:w-auto">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {loading ? "Gerando..." : "Gerar Copy por Perfil"}
          </Button>
          <Button onClick={handleGenerateAllDisc} disabled={isLoading} variant="outline" className="w-full sm:w-auto border-indigo-300 text-indigo-700 hover:bg-indigo-50">
            {loadingAll ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Users className="h-4 w-4 mr-2" />}
            {loadingAll ? "Gerando D/I/S/C..." : "Gerar por Perfil DISC"}
          </Button>
          <Button onClick={handleGenerateAllOcean} disabled={isLoading} variant="outline" className="w-full sm:w-auto border-purple-300 text-purple-700 hover:bg-purple-50">
            {loadingOcean ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Users className="h-4 w-4 mr-2" />}
            {loadingOcean ? "Gerando OCEAN..." : "Gerar por Traço OCEAN"}
          </Button>
          {hasAnyResult && (
            <Button onClick={() => setShowCampaignTable(true)} variant="outline" className="w-full sm:w-auto border-emerald-300 text-emerald-700 hover:bg-emerald-50">
              <Table2 className="h-4 w-4 mr-2" />
              Tabela para Campanha
            </Button>
          )}
        </div>
      </Card>

      {/* ===== CAMPAIGN TABLE DIALOG ===== */}
      <Dialog open={showCampaignTable} onOpenChange={setShowCampaignTable}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Table2 className="h-5 w-5" />
              Tabela de Campanha — Pronta para Importar
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground mb-3">
            Compatível com Meta Ads (Facebook/Instagram) e Google Ads. Exporte como CSV e importe diretamente na plataforma.
          </p>
          <div className="rounded-lg border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs whitespace-nowrap">Campaign Name</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">Ad Set Name</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">Ad Name</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">Headline</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">Description</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">Primary Text</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">Call to Action</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">Platform</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buildCampaignRows().map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs font-medium max-w-[150px] truncate">{row.campaign}</TableCell>
                    <TableCell className="text-xs max-w-[120px] truncate">{row.adSet}</TableCell>
                    <TableCell className="text-xs max-w-[100px] truncate">{row.adName}</TableCell>
                    <TableCell className="text-xs max-w-[180px]">{row.headline}</TableCell>
                    <TableCell className="text-xs max-w-[180px]">{row.description}</TableCell>
                    <TableCell className="text-xs max-w-[250px] line-clamp-2">{row.primaryText}</TableCell>
                    <TableCell className="text-xs font-medium">{row.cta}</TableCell>
                    <TableCell className="text-xs">{row.platform}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowCampaignTable(false)}>Fechar</Button>
            <Button onClick={exportCampaignCSV} className="gap-2">
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {allDiscResult && (
        <>
          {/* Performance Comparison Bar */}
          <Card className="p-5 bg-white border border-gray-200 rounded-2xl">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Comparação de Performance Estimada
            </h3>
            <div className="space-y-3">
              {(["D", "I", "S", "C"] as const).map((key) => {
                const profile = allDiscResult.profiles[key];
                if (!profile) return null;
                const perf = profile.estimated_performance || 0;
                const isBest = allDiscResult.best_profile?.includes(key);
                return (
                  <div key={key} className="flex items-center gap-3">
                    <Badge className={`text-xs border w-20 justify-center ${DISC_COLORS[key].badge}`}>
                      {key} — {DISC_NAMES[key]}
                    </Badge>
                    <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden relative">
                      <div
                        className={`h-full rounded-full transition-all ${DISC_COLORS[key].bar}`}
                        style={{ width: `${perf}%` }}
                      />
                      {isBest && (
                        <Trophy className="h-3 w-3 text-yellow-600 absolute right-2 top-1" />
                      )}
                    </div>
                    <span className="text-sm font-bold w-12 text-right">{perf}%</span>
                  </div>
                );
              })}
            </div>
            {allDiscResult.comparison_notes && (
              <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
                {allDiscResult.comparison_notes}
              </p>
            )}
          </Card>

          {/* Side-by-side D/I/S/C Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(["D", "I", "S", "C"] as const).map((key) => {
              const profile = allDiscResult.profiles[key];
              if (!profile) return null;
              const isBest = allDiscResult.best_profile?.includes(key);
              return (
                <Card key={key} className={`p-5 bg-white border-2 rounded-2xl ${isBest ? DISC_COLORS[key].bg + " ring-2 ring-offset-1 ring-yellow-400" : "border-gray-200"}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs border ${DISC_COLORS[key].badge}`}>
                        {key} — {DISC_NAMES[key]}
                      </Badge>
                      {isBest && <Badge className="text-[10px] bg-yellow-100 text-yellow-800 border-yellow-300">⭐ Melhor</Badge>}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => copyFull(profile, `disc-${key}`)}
                    >
                      {copiedKey === `disc-${key}` ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                      Copiar
                    </Button>
                  </div>

                  {profile.tone && (
                    <p className="text-[10px] text-gray-400 mb-2 italic">Tom: {profile.tone}</p>
                  )}

                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px] font-medium text-gray-400">Headline:</p>
                      <p className="text-sm font-bold text-gray-900">{profile.headline}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-400">Subheadline:</p>
                      <p className="text-xs text-gray-700">{profile.subheadline}</p>
                    </div>
                    {profile.body_blocks?.map((block, bi) => (
                      <p key={bi} className="text-xs text-gray-600 whitespace-pre-wrap">{block}</p>
                    ))}
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-[10px] font-medium text-gray-400">CTA:</p>
                      <p className="text-xs font-bold text-indigo-700">{profile.cta}</p>
                    </div>
                    {profile.triggers_used?.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {profile.triggers_used.map((t, ti) => (
                          <Badge key={ti} variant="outline" className="text-[9px]">{t}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* ===== ALL OCEAN COMPARISON VIEW ===== */}
      {allOceanResult && (
        <>
          <Card className="p-5 bg-white border border-gray-200 rounded-2xl">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-purple-500" />
              Comparação de Performance OCEAN
            </h3>
            <div className="space-y-3">
              {(["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"] as const).map((key) => {
                const profile = allOceanResult.profiles[key];
                if (!profile) return null;
                const perf = profile.estimated_performance || 0;
                const isBest = allOceanResult.best_profile?.toLowerCase().includes(key);
                return (
                  <div key={key} className="flex items-center gap-3">
                    <Badge className={`text-[10px] border w-28 justify-center ${OCEAN_COLORS[key].badge}`}>
                      {OCEAN_NAMES[key]}
                    </Badge>
                    <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden relative">
                      <div
                        className={`h-full rounded-full transition-all ${OCEAN_COLORS[key].bar}`}
                        style={{ width: `${perf}%` }}
                      />
                      {isBest && (
                        <Trophy className="h-3 w-3 text-yellow-600 absolute right-2 top-1" />
                      )}
                    </div>
                    <span className="text-sm font-bold w-12 text-right">{perf}%</span>
                  </div>
                );
              })}
            </div>
            {allOceanResult.comparison_notes && (
              <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
                {allOceanResult.comparison_notes}
              </p>
            )}
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"] as const).map((key) => {
              const profile = allOceanResult.profiles[key];
              if (!profile) return null;
              const isBest = allOceanResult.best_profile?.toLowerCase().includes(key);
              return (
                <Card key={key} className={`p-5 bg-white border-2 rounded-2xl ${isBest ? OCEAN_COLORS[key].bg + " ring-2 ring-offset-1 ring-yellow-400" : "border-gray-200"}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[10px] border ${OCEAN_COLORS[key].badge}`}>
                        {OCEAN_NAMES[key]}
                      </Badge>
                      {isBest && <Badge className="text-[10px] bg-yellow-100 text-yellow-800 border-yellow-300">⭐ Melhor</Badge>}
                    </div>
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => copyFull(profile, `ocean-${key}`)}>
                      {copiedKey === `ocean-${key}` ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                      Copiar
                    </Button>
                  </div>
                  {profile.tone && <p className="text-[10px] text-gray-400 mb-2 italic">Tom: {profile.tone}</p>}
                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px] font-medium text-gray-400">Headline:</p>
                      <p className="text-sm font-bold text-gray-900">{profile.headline}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-400">Subheadline:</p>
                      <p className="text-xs text-gray-700">{profile.subheadline}</p>
                    </div>
                    {profile.body_blocks?.map((block, bi) => (
                      <p key={bi} className="text-xs text-gray-600 whitespace-pre-wrap">{block}</p>
                    ))}
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-[10px] font-medium text-gray-400">CTA:</p>
                      <p className="text-xs font-bold text-purple-700">{profile.cta}</p>
                    </div>
                    {profile.triggers_used?.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {profile.triggers_used.map((t, ti) => (
                          <Badge key={ti} variant="outline" className="text-[9px]">{t}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* ===== SINGLE PROFILE RESULTS ===== */}
      {result && (
        <>
          {result.profile_summary && (
            <Card className="p-5 bg-indigo-50 border border-indigo-200 rounded-2xl">
              <h3 className="text-sm font-semibold text-indigo-800 mb-1">🧠 Perfil Comportamental</h3>
              <p className="text-sm text-indigo-700">{result.profile_summary}</p>
            </Card>
          )}

          {result.copies?.map((copy, i) => (
            <Card key={i} className="p-5 bg-white border border-gray-200 rounded-2xl">
              <div className="flex items-center justify-between mb-3">
                <Badge variant="secondary" className="text-xs">{copy.label}</Badge>
                <Button size="sm" variant="outline" className="text-xs" onClick={() => copyFull(copy, `copy-${i}`)}>
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
