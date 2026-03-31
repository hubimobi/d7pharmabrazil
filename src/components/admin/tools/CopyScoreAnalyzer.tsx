import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, BarChart3, Copy, Check, Lightbulb, AlertTriangle, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useProducts } from "@/hooks/useProducts";

interface ScoreResult {
  analysis: {
    emotional_words: string[];
    power_words: string[];
    has_cta: boolean;
    has_clear_promise: boolean;
    has_proof: boolean;
  };
  scores: {
    clareza: number;
    emocao: number;
    dor_desejo: number;
    prova: number;
    urgencia: number;
    fit_disc: number;
    fit_ocean: number;
    fit_funil: number;
  };
  final_score: number;
  classification: string;
  improvements: {
    rewritten_headline: string;
    suggestions: string[];
    stronger_words: string[];
    profile_adjustments: string;
  };
}

const SCORE_LABELS: Record<string, string> = {
  clareza: "Clareza",
  emocao: "Emoção",
  dor_desejo: "Dor / Desejo",
  prova: "Prova Social",
  urgencia: "Urgência",
  fit_disc: "Fit DISC",
  fit_ocean: "Fit OCEAN",
  fit_funil: "Fit Funil",
};

const SCORE_WEIGHTS: Record<string, number> = {
  clareza: 0.15,
  emocao: 0.25,
  dor_desejo: 0.20,
  prova: 0.15,
  urgencia: 0.10,
  fit_disc: 0.10,
  fit_ocean: 0.05,
};

function getScoreColor(score: number) {
  if (score >= 9) return "text-green-600";
  if (score >= 7) return "text-blue-600";
  if (score >= 5) return "text-yellow-600";
  return "text-red-600";
}

function getScoreBarColor(score: number) {
  if (score >= 9) return "bg-green-500";
  if (score >= 7) return "bg-blue-500";
  if (score >= 5) return "bg-yellow-500";
  return "bg-red-500";
}

function getClassBadge(classification: string) {
  switch (classification) {
    case "alta conversão": return "bg-green-100 text-green-800 border-green-300";
    case "bom": return "bg-blue-100 text-blue-800 border-blue-300";
    case "médio": return "bg-yellow-100 text-yellow-800 border-yellow-300";
    default: return "bg-red-100 text-red-800 border-red-300";
  }
}

export default function CopyScoreAnalyzer() {
  const { data: products } = useProducts();
  const [selectedProductId, setSelectedProductId] = useState("");
  const [text, setText] = useState("");
  const [context, setContext] = useState("pagina_produto");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleProductSelect = (id: string) => {
    setSelectedProductId(id);
    const product = products?.find((p) => p.id === id);
    if (product) {
      const parts = [
        product.name,
        product.short_description || "",
        product.description || "",
        ...(Array.isArray(product.benefits) ? (product.benefits as string[]) : []),
      ].filter(Boolean);
      setText(parts.join("\n\n"));
    }
  };

  const handleAnalyze = async () => {
    if (!text || text.trim().length < 10) {
      toast.error("Texto muito curto para análise");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const productName = products?.find((p) => p.id === selectedProductId)?.name || "";
      const { data, error } = await supabase.functions.invoke("analyze-copy-score", {
        body: { text, productName, context },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.success && data.data?.scores) {
        setResult(data.data);
        toast.success("Análise concluída!");
      } else {
        toast.error("Resposta inesperada da IA");
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao analisar");
    } finally {
      setLoading(false);
    }
  };

  const copyText = (t: string, key: string) => {
    navigator.clipboard.writeText(t);
    setCopiedKey(key);
    toast.success("Copiado!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Input Card */}
      <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-purple-600" />
          Score de Conversão de Copy
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Analise textos de copy e receba um score de conversão com sugestões de melhoria baseadas em DISC, OCEAN e funil de vendas.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Carregar de Produto</label>
            <Select value={selectedProductId} onValueChange={handleProductSelect}>
              <SelectTrigger><SelectValue placeholder="Selecione um produto..." /></SelectTrigger>
              <SelectContent>
                {products?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Contexto</label>
            <Select value={context} onValueChange={setContext}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pagina_produto">Página de Produto</SelectItem>
                <SelectItem value="anuncio">Anúncio / Ad</SelectItem>
                <SelectItem value="email">E-mail Marketing</SelectItem>
                <SelectItem value="landing_page">Landing Page</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium mb-1 block">Texto para Análise *</label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="Cole aqui o texto de copy que deseja analisar..."
            className="text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">{text.length} caracteres</p>
        </div>

        <Button onClick={handleAnalyze} disabled={loading} className="w-full md:w-auto">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
          {loading ? "Analisando..." : "Analisar Copy"}
        </Button>
      </Card>

      {/* Results */}
      {result && (
        <>
          {/* Final Score Card */}
          <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex flex-col items-center">
                <div className={`text-5xl font-bold ${getScoreColor(result.final_score)}`}>
                  {result.final_score.toFixed(1)}
                </div>
                <span className="text-xs text-gray-500 mt-1">/ 10</span>
                <Badge className={`mt-2 text-xs border ${getClassBadge(result.classification)}`}>
                  {result.classification.toUpperCase()}
                </Badge>
              </div>

              <div className="flex-1 w-full space-y-2">
                {Object.entries(result.scores).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-xs font-medium w-24 text-right text-gray-600">
                      {SCORE_LABELS[key] || key}
                    </span>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getScoreBarColor(value)}`}
                        style={{ width: `${value * 10}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold w-8 ${getScoreColor(value)}`}>
                      {value.toFixed(1)}
                    </span>
                    <span className="text-[10px] text-gray-400 w-8">
                      ×{((SCORE_WEIGHTS[key] || 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Analysis Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 bg-white border border-gray-200 rounded-2xl">
              <h4 className="text-sm font-semibold mb-2 text-purple-700">🎯 Palavras Emocionais</h4>
              <div className="flex flex-wrap gap-1">
                {result.analysis.emotional_words?.length ? (
                  result.analysis.emotional_words.map((w, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{w}</Badge>
                  ))
                ) : (
                  <span className="text-xs text-gray-400">Nenhuma detectada</span>
                )}
              </div>
            </Card>

            <Card className="p-4 bg-white border border-gray-200 rounded-2xl">
              <h4 className="text-sm font-semibold mb-2 text-blue-700">⚡ Palavras de Poder</h4>
              <div className="flex flex-wrap gap-1">
                {result.analysis.power_words?.length ? (
                  result.analysis.power_words.map((w, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{w}</Badge>
                  ))
                ) : (
                  <span className="text-xs text-gray-400">Nenhuma detectada</span>
                )}
              </div>
            </Card>

            <Card className="p-4 bg-white border border-gray-200 rounded-2xl">
              <h4 className="text-sm font-semibold mb-2 text-green-700">✅ Checklist</h4>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className={result.analysis.has_cta ? "text-green-600" : "text-red-500"}>
                    {result.analysis.has_cta ? "✓" : "✗"}
                  </span>
                  <span>Call-to-Action</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={result.analysis.has_clear_promise ? "text-green-600" : "text-red-500"}>
                    {result.analysis.has_clear_promise ? "✓" : "✗"}
                  </span>
                  <span>Promessa Clara</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={result.analysis.has_proof ? "text-green-600" : "text-red-500"}>
                    {result.analysis.has_proof ? "✓" : "✗"}
                  </span>
                  <span>Prova / Autoridade</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Improvements */}
          <Card className="p-5 bg-white border border-gray-200 rounded-2xl">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              Sugestões de Melhoria
            </h3>

            {result.improvements.rewritten_headline && (
              <div className="mb-4 p-3 bg-purple-50 rounded-xl border border-purple-200">
                <p className="text-xs font-medium text-purple-600 mb-1">Headline Reescrita:</p>
                <p className="text-sm font-semibold text-purple-900">{result.improvements.rewritten_headline}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs mt-2"
                  onClick={() => copyText(result.improvements.rewritten_headline, "headline")}
                >
                  {copiedKey === "headline" ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  Copiar
                </Button>
              </div>
            )}

            {result.improvements.suggestions?.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 mb-2">Melhorias Específicas:</p>
                <ul className="space-y-1">
                  {result.improvements.suggestions.map((s, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                      <AlertTriangle className="h-3 w-3 text-yellow-500 mt-1 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.improvements.stronger_words?.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 mb-2">Palavras Mais Fortes:</p>
                <div className="flex flex-wrap gap-1">
                  {result.improvements.stronger_words.map((w, i) => (
                    <Badge key={i} className="bg-orange-100 text-orange-800 border-orange-200 text-xs">{w}</Badge>
                  ))}
                </div>
              </div>
            )}

            {result.improvements.profile_adjustments && (
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs font-medium text-gray-500 mb-1">Ajuste de Perfil:</p>
                <p className="text-sm text-gray-700">{result.improvements.profile_adjustments}</p>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
