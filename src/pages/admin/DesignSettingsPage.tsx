import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Palette, Save, Loader2, FlaskConical, Truck, ShieldCheck, TrendingUp, Heart, Pill, Leaf, Sparkles, Shield, Beaker } from "lucide-react";
import type { StoreSettings } from "@/hooks/useStoreSettings";

const FONT_OPTIONS = [
  { value: "Inter", label: "Inter (Moderno)" },
  { value: "Poppins", label: "Poppins (Arredondado)" },
  { value: "DM Sans", label: "DM Sans (Clean)" },
  { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans (Elegante)" },
  { value: "Nunito", label: "Nunito (Amigável)" },
  { value: "Outfit", label: "Outfit (Contemporâneo)" },
  { value: "Manrope", label: "Manrope (Geométrico)" },
];

const ICON_STYLES = [
  {
    value: "rounded",
    label: "Arredondado",
    desc: "Fundo arredondado com cor suave — padrão farmacêutico moderno",
    preview: "rounded-xl bg-primary/10",
  },
  {
    value: "circle",
    label: "Circular",
    desc: "Ícones em círculos — estilo clínico e confiável",
    preview: "rounded-full bg-primary/10",
  },
  {
    value: "outline",
    label: "Contorno",
    desc: "Bordas finas sem preenchimento — estilo minimalista premium",
    preview: "rounded-xl border-2 border-primary/30 bg-transparent",
  },
  {
    value: "gradient",
    label: "Gradiente",
    desc: "Fundo degradê moderno — estilo startup health-tech",
    preview: "rounded-xl bg-gradient-to-br from-primary/20 to-primary/5",
  },
  {
    value: "solid",
    label: "Sólido",
    desc: "Fundo sólido com ícone branco — estilo farmácia americana",
    preview: "rounded-xl bg-primary text-white",
  },
];

const ColorInput = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div className="space-y-1.5">
    <Label className="text-xs">{label}</Label>
    <div className="flex gap-2 items-center">
      <input
        type="color"
        value={value || "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-12 rounded border border-border cursor-pointer bg-transparent"
      />
      <Input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#000000"
        className="flex-1 font-mono text-xs"
        maxLength={7}
      />
    </div>
  </div>
);

export default function DesignSettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Partial<StoreSettings> | null>(null);

  const update = useCallback((field: keyof StoreSettings, value: any) =>
    setForm((prev) => prev ? { ...prev, [field]: value } : prev), []);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["store-settings-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_settings" as any)
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data as unknown as StoreSettings;
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: Partial<StoreSettings>) => {
      const { error } = await (supabase.from("store_settings" as any) as any)
        .update(values)
        .eq("id", settings!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Design salvo com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["store-settings"] });
      queryClient.invalidateQueries({ queryKey: ["store-settings-admin"] });
    },
    onError: () => toast.error("Erro ao salvar."),
  });

  if (settings && !form) setForm({ ...settings });

  if (isLoading || !form) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      design_title_color: form.design_title_color,
      design_text_color: form.design_text_color,
      design_icon_color: form.design_icon_color,
      design_font: form.design_font,
      design_footer_color: form.design_footer_color,
      design_bg_color: form.design_bg_color,
      design_icon_style: form.design_icon_style,
    });
  };

  const SampleIcon = FlaskConical;

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Palette className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Configurações de Design</h1>
      </div>

      <form onSubmit={handleSave} className="max-w-2xl space-y-6">
        {/* Cores */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Cores do Site</h2>
          <p className="text-sm text-muted-foreground">Personalize as cores principais do seu e-commerce.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ColorInput label="Cor do Título" value={form.design_title_color || "#1a1a2e"} onChange={(v) => update("design_title_color", v)} />
            <ColorInput label="Cor do Texto" value={form.design_text_color || "#374151"} onChange={(v) => update("design_text_color", v)} />
            <ColorInput label="Cor dos Ícones" value={form.design_icon_color || "#2563eb"} onChange={(v) => update("design_icon_color", v)} />
            <ColorInput label="Cor de Fundo do Site" value={form.design_bg_color || "#ffffff"} onChange={(v) => update("design_bg_color", v)} />
            <ColorInput label="Cor do Rodapé" value={form.design_footer_color || "#1a1a2e"} onChange={(v) => update("design_footer_color", v)} />
          </div>
        </div>

        {/* Fonte */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Tipografia</h2>
          <div>
            <Label>Fonte Principal</Label>
            <Select value={form.design_font || "Inter"} onValueChange={(v) => update("design_font", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    <span style={{ fontFamily: f.value }}>{f.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-lg font-bold" style={{ fontFamily: form.design_font || "Inter", color: form.design_title_color || "#1a1a2e" }}>
              Prévia do Título
            </p>
            <p className="text-sm mt-1" style={{ fontFamily: form.design_font || "Inter", color: form.design_text_color || "#374151" }}>
              Este é um exemplo de como o texto ficará com a fonte e cores selecionadas.
            </p>
          </div>
        </div>

        {/* Estilo de Ícones */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Estilo dos Ícones</h2>
          <p className="text-sm text-muted-foreground">Escolha o padrão visual dos ícones usados na seção de benefícios.</p>
          <div className="grid gap-3">
            {ICON_STYLES.map((style) => (
              <label
                key={style.value}
                className={`flex items-center gap-4 rounded-xl border p-4 cursor-pointer transition-all ${
                  form.design_icon_style === style.value
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <input
                  type="radio"
                  name="icon_style"
                  value={style.value}
                  checked={form.design_icon_style === style.value}
                  onChange={() => update("design_icon_style", style.value)}
                  className="sr-only"
                />
                <div
                  className={`flex h-12 w-12 items-center justify-center shrink-0 ${style.preview}`}
                  style={style.value !== "solid" ? { color: form.design_icon_color || "#2563eb" } : undefined}
                >
                  <SampleIcon className="h-6 w-6" style={style.value === "outline" ? { color: form.design_icon_color || "#2563eb" } : undefined} />
                </div>
                <div>
                  <p className="font-semibold text-sm">{style.label}</p>
                  <p className="text-xs text-muted-foreground">{style.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Prévia</h2>
          <div className="p-6 rounded-xl border border-border" style={{ backgroundColor: form.design_bg_color || "#ffffff", fontFamily: form.design_font || "Inter" }}>
            <h3 className="text-xl font-bold mb-2" style={{ color: form.design_title_color || "#1a1a2e" }}>
              Por que escolher a D7 Pharma?
            </h3>
            <p className="text-sm mb-4" style={{ color: form.design_text_color || "#374151" }}>
              Compromisso com excelência em cada detalhe
            </p>
            <div className="flex gap-4">
              {[FlaskConical, Truck, ShieldCheck, TrendingUp].map((Icon, i) => {
                const iconStyle = form.design_icon_style || "rounded";
                const cls = ICON_STYLES.find((s) => s.value === iconStyle)?.preview || "rounded-xl bg-primary/10";
                return (
                  <div key={i} className={`flex h-10 w-10 items-center justify-center ${cls}`}
                    style={iconStyle !== "solid" ? { color: form.design_icon_color || "#2563eb" } : undefined}>
                    <Icon className="h-5 w-5" />
                  </div>
                );
              })}
            </div>
            <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: form.design_footer_color || "#1a1a2e" }}>
              <p className="text-xs text-white/70">Rodapé — Prévia de cor</p>
            </div>
          </div>
        </div>

        <Button type="submit" size="lg" disabled={mutation.isPending} className="gap-2">
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar Design
        </Button>
      </form>
    </div>
  );
}
