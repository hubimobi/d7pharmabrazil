import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings2, Save, Loader2, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

export default function CampaignConfigTool() {
  const [loading, setLoading] = useState(true);
  const { tenantId } = useTenant();
  const [saving, setSaving] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [campaignTemplate, setCampaignTemplate] = useState("{produto} — {modelo}");
  const [adsetTemplate, setAdsetTemplate] = useState("{perfil} | {funil} | {plataforma}");
  const [adTemplate, setAdTemplate] = useState("{perfil}_{plataforma}_{variacao}");
  const [audienceTemplate, setAudienceTemplate] = useState("{perfil} — {funil} — {plataforma}");
  const [defaultObjective, setDefaultObjective] = useState("CONVERSIONS");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("campaign_config").select("*").limit(1).single();
      if (error && error.code !== "PGRST116") throw error;
      if (data) {
        setConfigId(data.id);
        setCampaignTemplate(data.campaign_template);
        setAdsetTemplate(data.adset_template);
        setAdTemplate(data.ad_template);
        setAudienceTemplate(data.audience_template);
        setDefaultObjective(data.default_objective);
        setNotes(data.notes || "");
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (configId) {
        const { error } = await supabase.from("campaign_config").update({
          campaign_template: campaignTemplate,
          adset_template: adsetTemplate,
          ad_template: adTemplate,
          audience_template: audienceTemplate,
          default_objective: defaultObjective,
          notes,
        }).eq("id", configId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("campaign_config").insert({
          campaign_template: campaignTemplate,
          adset_template: adsetTemplate,
          ad_template: adTemplate,
          audience_template: audienceTemplate,
          default_objective: defaultObjective,
          notes,
          tenant_id: tenantId,
        });
        if (error) throw error;
      }
      toast.success("Configuração salva!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const VARIABLES = [
    { key: "{produto}", desc: "Nome do produto ou texto base" },
    { key: "{modelo}", desc: "Modelo usado (DISC, OCEAN, Perfil)" },
    { key: "{perfil}", desc: "Perfil comportamental (D, I, S, C ou OCEAN)" },
    { key: "{funil}", desc: "Fase do funil (Curioso, Pronto, etc.)" },
    { key: "{plataforma}", desc: "Plataforma selecionada" },
    { key: "{variacao}", desc: "Variação da copy (A, B, C...)" },
    { key: "{cta}", desc: "Call to Action selecionado" },
  ];

  const OBJECTIVES = [
    { value: "CONVERSIONS", label: "Conversões" },
    { value: "TRAFFIC", label: "Tráfego" },
    { value: "ENGAGEMENT", label: "Engajamento" },
    { value: "REACH", label: "Alcance" },
    { value: "LEAD_GENERATION", label: "Geração de Leads" },
    { value: "BRAND_AWARENESS", label: "Reconhecimento de Marca" },
    { value: "VIDEO_VIEWS", label: "Visualizações de Vídeo" },
    { value: "APP_INSTALLS", label: "Instalações de App" },
  ];

  if (loading) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-emerald-600" />
          Configuração de Campanha
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Configure o padrão de nomenclatura para exportação de campanhas no Meta Ads e Google Ads.
        </p>

        {/* Variables Reference */}
        <div className="mb-6 p-4 rounded-xl border border-blue-200 bg-blue-50/50">
          <p className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-1">
            <Info className="h-4 w-4" /> Variáveis Disponíveis
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {VARIABLES.map((v) => (
              <div key={v.key} className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-mono bg-white">{v.key}</Badge>
                <span className="text-xs text-gray-600">{v.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Nome da Campanha (Campaign Name)</label>
            <Input value={campaignTemplate} onChange={(e) => setCampaignTemplate(e.target.value)} placeholder="{produto} — {modelo}" />
            <p className="text-[10px] text-gray-400 mt-1">Ex: Protetor Solar — DISC</p>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Nome do Conjunto (Ad Set Name)</label>
            <Input value={adsetTemplate} onChange={(e) => setAdsetTemplate(e.target.value)} placeholder="{perfil} | {funil} | {plataforma}" />
            <p className="text-[10px] text-gray-400 mt-1">Ex: Dominância | Curioso | Facebook</p>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Nome do Anúncio (Ad Name)</label>
            <Input value={adTemplate} onChange={(e) => setAdTemplate(e.target.value)} placeholder="{perfil}_{plataforma}_{variacao}" />
            <p className="text-[10px] text-gray-400 mt-1">Ex: D_facebook_A</p>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Público Sugerido (Audience)</label>
            <Input value={audienceTemplate} onChange={(e) => setAudienceTemplate(e.target.value)} placeholder="{perfil} — {funil} — {plataforma}" />
            <p className="text-[10px] text-gray-400 mt-1">Ex: Dominância — Curioso — Facebook</p>
          </div>
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium mb-1 block">Objetivo Padrão da Campanha</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {OBJECTIVES.map((obj) => (
              <button
                key={obj.value}
                type="button"
                onClick={() => setDefaultObjective(obj.value)}
                className={`p-2 rounded-lg border text-xs text-center transition-all ${
                  defaultObjective === obj.value
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-medium"
                    : "border-gray-200 bg-white text-gray-600 hover:border-emerald-300"
                }`}
              >
                {obj.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="text-sm font-medium mb-1 block">Instruções / Notas</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Descreva como você gostaria que as campanhas fossem geradas, regras de nomenclatura, padrões a seguir..."
          />
          <p className="text-xs text-gray-400 mt-1">Essas notas serão usadas como referência ao gerar e exportar campanhas.</p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Salvando..." : "Salvar Configuração"}
        </Button>
      </Card>
    </div>
  );
}
