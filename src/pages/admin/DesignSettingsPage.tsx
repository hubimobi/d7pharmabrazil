import { useState, useCallback, useRef } from "react";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import UnsavedChangesDialog from "@/components/admin/UnsavedChangesDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Palette, Save, Loader2, FlaskConical, Truck, ShieldCheck, TrendingUp, Wand2, Sun, Moon, Building2, Layout, Layers, BookOpen, RectangleHorizontal, SquareIcon, ArrowUp, ArrowDown, GripVertical, Megaphone } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import type { StoreSettings } from "@/hooks/useStoreSettings";
import { useAdminTheme, type AdminTheme } from "@/hooks/useAdminTheme";

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
  { value: "rounded", label: "Arredondado", desc: "Fundo arredondado com cor suave — padrão farmacêutico moderno", preview: "rounded-xl bg-primary/10" },
  { value: "circle", label: "Circular", desc: "Ícones em círculos — estilo clínico e confiável", preview: "rounded-full bg-primary/10" },
  { value: "outline", label: "Contorno", desc: "Bordas finas sem preenchimento — estilo minimalista premium", preview: "rounded-xl border-2 border-primary/30 bg-transparent" },
  { value: "gradient", label: "Gradiente", desc: "Fundo degradê moderno — estilo startup health-tech", preview: "rounded-xl bg-gradient-to-br from-primary/20 to-primary/5" },
  { value: "solid", label: "Sólido", desc: "Fundo sólido com ícone branco — estilo farmácia americana", preview: "rounded-xl bg-primary text-white" },
];

const VISUAL_THEMES = [
  {
    value: "editorial",
    label: "Editorial",
    desc: "Tipografia grande, cantos arredondados, glassmorphism e animações suaves.",
    icon: <Layout className="h-4 w-4 text-primary" />,
    available: true,
    previewRadius: "rounded-xl",
    previewRadiusSmall: "rounded-lg",
    previewClass: "rounded-xl",
  },
  {
    value: "modern",
    label: "Moderno",
    desc: "CRM-style: sidebar compacta (ícones), topbar com abas centralizadas, linhas limpas.",
    icon: <Layers className="h-4 w-4 text-primary" />,
    available: true,
    previewRadius: "rounded-md",
    previewRadiusSmall: "rounded",
    previewClass: "rounded-md",
  },
  {
    value: "classic",
    label: "Clássico",
    desc: "Tipografia serifada, espaçamento elegante, refinamento sutil.",
    icon: <BookOpen className="h-4 w-4 text-primary" />,
    available: false,
    previewRadius: "rounded-sm",
    previewRadiusSmall: "rounded-sm",
    previewClass: "rounded-sm",
  },
  {
    value: "claymorphism",
    label: "Claymorphism",
    desc: "Visual 3D suave, sombras duplas, cantos ultra-arredondados e cores pastel — estilo app moderno.",
    icon: <FlaskConical className="h-4 w-4 text-primary" />,
    available: true,
    previewRadius: "rounded-3xl",
    previewRadiusSmall: "rounded-2xl",
    previewClass: "rounded-3xl",
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

const GradientInput = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div className="space-y-1.5">
    <Label className="text-xs">{label}</Label>
    <Input
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder="linear-gradient(135deg, #1a1a2e, #16213e)"
      className="font-mono text-xs"
    />
    {value && (
      <div className="h-8 rounded-md border border-border" style={{ background: value }} />
    )}
  </div>
);

function extractColorsFromImage(imgSrc: string): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 100;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, size, size);
      const imageData = ctx.getImageData(0, 0, size, size).data;

      const colorCounts: Record<string, { r: number; g: number; b: number; count: number }> = {};

      for (let i = 0; i < imageData.length; i += 16) {
        const r = imageData[i];
        const g = imageData[i + 1];
        const b = imageData[i + 2];
        const a = imageData[i + 3];
        if (a < 128) continue;
        // Quantize
        const qr = Math.round(r / 32) * 32;
        const qg = Math.round(g / 32) * 32;
        const qb = Math.round(b / 32) * 32;
        const key = `${qr}-${qg}-${qb}`;
        if (!colorCounts[key]) colorCounts[key] = { r: qr, g: qg, b: qb, count: 0 };
        colorCounts[key].count++;
      }

      const sorted = Object.values(colorCounts)
        .filter((c) => {
          const brightness = (c.r * 299 + c.g * 587 + c.b * 114) / 1000;
          return brightness > 20 && brightness < 240;
        })
        .sort((a, b) => b.count - a.count);

      const toHex = (c: { r: number; g: number; b: number }) =>
        `#${c.r.toString(16).padStart(2, "0")}${c.g.toString(16).padStart(2, "0")}${c.b.toString(16).padStart(2, "0")}`;

      const unique: string[] = [];
      for (const c of sorted) {
        const hex = toHex(c);
        if (!unique.includes(hex)) unique.push(hex);
        if (unique.length >= 6) break;
      }

      resolve(unique.length > 0 ? unique : ["#1a1a2e", "#2563eb", "#374151"]);
    };
    img.onerror = () => resolve(["#1a1a2e", "#2563eb", "#374151"]);
    img.src = imgSrc;
  });
}

export default function DesignSettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Partial<StoreSettings> | null>(null);
  const [extractedColors, setExtractedColors] = useState<string[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [panelExtractedColors, setPanelExtractedColors] = useState<string[]>([]);
  const [panelExtracting, setPanelExtracting] = useState(false);
  const { theme: adminTheme, setTheme: setAdminTheme } = useAdminTheme();

  const unsaved = useUnsavedChangesGuard();

  const update = useCallback((field: keyof StoreSettings, value: any) =>
    setForm((prev) => {
      unsaved.setDirty(true);
      return prev ? { ...prev, [field]: value } : prev;
    }), [unsaved.setDirty]);

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
      unsaved.setDirty(false);
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

  const handleExtractColors = async () => {
    const logoUrl = form.logo_url || settings?.logo_url;
    if (!logoUrl) {
      toast.error("Nenhuma logo cadastrada. Cadastre uma logo primeiro.");
      return;
    }
    setExtracting(true);
    try {
      const colors = await extractColorsFromImage(logoUrl);
      setExtractedColors(colors);
      toast.success(`${colors.length} cores extraídas da logo!`);
    } catch {
      toast.error("Erro ao analisar a logo.");
    } finally {
      setExtracting(false);
    }
  };

  const applyExtractedColor = (color: string, field: keyof StoreSettings) => {
    update(field, color);
    toast.success(`Cor ${color} aplicada!`);
  };

  const SECTION_TOGGLES_MAP: Record<string, string> = {
    section_highlight_banner: "Banner de Destaque",
    section_flash_sale: "Ofertas Relâmpago",
    section_hero_visible: "Hero (Banner Principal)",
    section_featured_visible: "Produtos em Destaque",
    section_benefits_visible: "Benefícios",
    section_products_visible: "Todos os Produtos",
    section_testimonials_visible: "Depoimentos",
    section_promo_banners_visible: "Banners Promocionais",
    section_guarantee_visible: "Garantia de Satisfação",
    section_trust_badges_visible: "Selos de Confiança",
    section_mailing_visible: "Captura de Mailing",
    section_instagram_visible: "Feed Instagram",
  };

  // All sections can be toggled
  const ALWAYS_SHOW_SECTIONS: string[] = [];

  const DEFAULT_ORDER = Object.keys(SECTION_TOGGLES_MAP);
  const sectionOrder: string[] = (form as any).section_order && Array.isArray((form as any).section_order)
    ? (form as any).section_order
    : DEFAULT_ORDER;

  // Ensure all keys are present
  const normalizedOrder = [
    ...sectionOrder.filter((k: string) => k in SECTION_TOGGLES_MAP),
    ...DEFAULT_ORDER.filter((k) => !sectionOrder.includes(k)),
  ];

  const moveSectionUp = (index: number) => {
    if (index <= 0) return;
    const newOrder = [...normalizedOrder];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    update("section_order" as any, newOrder);
  };

  const moveSectionDown = (index: number) => {
    if (index >= normalizedOrder.length - 1) return;
    const newOrder = [...normalizedOrder];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    update("section_order" as any, newOrder);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      visual_theme: (form as any).visual_theme,
      design_title_color: form.design_title_color,
      design_text_color: form.design_text_color,
      design_icon_color: form.design_icon_color,
      design_font: form.design_font,
      design_footer_color: form.design_footer_color,
      design_bg_color: form.design_bg_color,
      design_icon_style: form.design_icon_style,
      design_nav_color: (form as any).design_nav_color,
      design_bg_gradient: (form as any).design_bg_gradient,
      design_footer_gradient: (form as any).design_footer_gradient,
      design_footer_text_color: (form as any).design_footer_text_color,
      design_footer_title_color: (form as any).design_footer_title_color,
      section_hero_visible: (form as any).section_hero_visible,
      section_featured_visible: (form as any).section_featured_visible,
      section_benefits_visible: (form as any).section_benefits_visible,
      section_products_visible: (form as any).section_products_visible,
      section_testimonials_visible: (form as any).section_testimonials_visible,
      section_promo_banners_visible: (form as any).section_promo_banners_visible,
      section_guarantee_visible: (form as any).section_guarantee_visible,
      section_trust_badges_visible: (form as any).section_trust_badges_visible,
      section_mailing_visible: (form as any).section_mailing_visible,
      section_instagram_visible: (form as any).section_instagram_visible,
      design_border_style: (form as any).design_border_style,
      section_order: normalizedOrder,
      products_sidebar_enabled: (form as any).products_sidebar_enabled,
    } as any);
  };

  const SampleIcon = FlaskConical;
  const navColor = (form as any).design_nav_color || "#ffffff";
  const bgGradient = (form as any).design_bg_gradient || "";
  const footerGradient = (form as any).design_footer_gradient || "";

  const handlePanelExtractColors = async () => {
    const logoUrl = form?.logo_url || settings?.logo_url;
    if (!logoUrl) {
      toast.error("Nenhuma logo cadastrada. Cadastre uma logo primeiro.");
      return;
    }
    setPanelExtracting(true);
    try {
      const colors = await extractColorsFromImage(logoUrl);
      setPanelExtractedColors(colors);
      toast.success(`${colors.length} cores extraídas da logo!`);
    } catch {
      toast.error("Erro ao analisar a logo.");
    } finally {
      setPanelExtracting(false);
    }
  };

  const ADMIN_THEMES: { value: AdminTheme; label: string; desc: string; icon: React.ReactNode }[] = [
    { value: "light", label: "Claro", desc: "Fundo branco com texto escuro", icon: <Sun className="h-5 w-5" /> },
    { value: "dark", label: "Escuro", desc: "Fundo escuro com texto claro", icon: <Moon className="h-5 w-5" /> },
    { value: "company", label: "Empresa", desc: "Usa as cores da sua marca", icon: <Building2 className="h-5 w-5" /> },
  ];

  return (
    <div>
      <UnsavedChangesDialog
        open={unsaved.showDialog}
        onStay={unsaved.handleStay}
        onLeave={unsaved.handleLeave}
        onSaveAndLeave={() => { handleSave({ preventDefault: () => {} } as React.FormEvent); unsaved.handleLeave(); }}
        hasSave
      />
      <div className="mb-6 flex items-center gap-3">
        <Palette className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Configurações de Design</h1>
      </div>

      <form onSubmit={handleSave} className="max-w-2xl space-y-6">
        {/* Layout Visual (Tema Estrutural) */}
        <div className="rounded-lg border-2 border-primary/20 bg-card p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Layout Visual
            </h2>
            <p className="text-sm text-muted-foreground">
              Escolha o padrão visual completo do site — tipografia, bordas, sombras e estrutura de layout.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {VISUAL_THEMES.map((t) => {
              const isActive = ((form as any).visual_theme || "editorial") === t.value;
              return (
                <label
                  key={t.value}
                  className={`relative flex flex-col rounded-xl border-2 p-4 cursor-pointer transition-all ${
                    isActive
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-lg"
                      : "border-border hover:border-primary/30 hover:shadow-md"
                  }`}
                >
                  <input
                    type="radio"
                    name="visual_theme"
                    value={t.value}
                    checked={isActive}
                    onChange={() => update("visual_theme" as any, t.value)}
                    className="sr-only"
                  />
                  {isActive && (
                    <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">✓</span>
                  )}
                  {/* Mini preview */}
                  <div className={`mb-3 rounded-lg border border-border overflow-hidden bg-muted/30 ${t.previewClass}`}>
                    <div className="h-3 bg-foreground/5 border-b border-border" />
                    <div className="p-2 space-y-1.5">
                      <div className={`h-2 w-3/4 bg-foreground/15 ${t.previewRadiusSmall}`} />
                      <div className={`h-1.5 w-1/2 bg-foreground/8 ${t.previewRadiusSmall}`} />
                      <div className="flex gap-1 mt-2">
                        <div className={`h-6 flex-1 bg-primary/15 ${t.previewRadius}`} />
                        <div className={`h-6 flex-1 bg-primary/10 ${t.previewRadius}`} />
                      </div>
                    </div>
                    <div className="h-2 bg-foreground/5 border-t border-border" />
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    {t.icon}
                    <p className="font-semibold text-sm">{t.label}</p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t.desc}</p>
                  {!t.available && (
                    <span className="mt-2 inline-block text-2xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                      Em breve
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </div>

        {/* Seções da Home */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Seções da Home</h2>
            <p className="text-sm text-muted-foreground">Ative, desative e reordene as seções da página inicial. Use as setas para alterar a posição.</p>
          </div>
          <div className="grid gap-2">
            {normalizedOrder.map((key, index) => (
              <div key={key} className="flex items-center gap-2 rounded-lg border border-border p-3 bg-card hover:bg-muted/30 transition-colors">
                <GripVertical className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                <span className="text-xs font-mono text-muted-foreground w-5 text-center flex-shrink-0">{index + 1}</span>
                <Label className="text-sm font-medium flex-1 cursor-pointer">{SECTION_TOGGLES_MAP[key]}</Label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveSectionUp(index)}
                    disabled={index === 0}
                    className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Mover para cima"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSectionDown(index)}
                    disabled={index === normalizedOrder.length - 1}
                    className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Mover para baixo"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  {!ALWAYS_SHOW_SECTIONS.includes(key) && (
                    <Switch
                      checked={(form as any)[key] !== false}
                      onCheckedChange={(v) => update(key as any, v)}
                    />
                  )}
                  {ALWAYS_SHOW_SECTIONS.includes(key) && (
                    <span className="text-2xs text-muted-foreground px-2">Sempre visível</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tema do Painel Admin */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Tema do Painel Administrativo</h2>
            <p className="text-sm text-muted-foreground">Escolha o padrão de cores do painel de administração.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {ADMIN_THEMES.map((t) => (
              <label
                key={t.value}
                className={`flex flex-col items-center gap-2 rounded-xl border p-4 cursor-pointer transition-all text-center ${
                  adminTheme === t.value
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <input
                  type="radio"
                  name="admin_theme"
                  value={t.value}
                  checked={adminTheme === t.value}
                  onChange={() => setAdminTheme(t.value)}
                  className="sr-only"
                />
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                  adminTheme === t.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {t.icon}
                </div>
                <p className="font-semibold text-sm">{t.label}</p>
                <p className="text-xs text-muted-foreground">{t.desc}</p>
              </label>
            ))}
          </div>

          {adminTheme === "company" && (
            <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Cores da Empresa</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePanelExtractColors}
                  disabled={panelExtracting}
                  className="gap-2"
                >
                  {panelExtracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  Extrair da Logo
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                No modo Empresa, o painel usará as cores de título e navegação configuradas abaixo. 
                Use "Extrair da Logo" para sugerir cores automaticamente.
              </p>
              {panelExtractedColors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium">Clique numa cor para aplicar:</p>
                  <div className="flex gap-2 flex-wrap">
                    {panelExtractedColors.map((color, i) => (
                      <button
                        key={i}
                        type="button"
                        className="h-8 w-8 rounded-lg border-2 border-border cursor-pointer hover:scale-110 transition-transform shadow-sm"
                        style={{ backgroundColor: color }}
                        title={`Aplicar ${color} como cor principal`}
                        onClick={() => {
                          update("design_title_color", color);
                          if (panelExtractedColors[i + 1]) {
                            update("design_nav_color" as any, panelExtractedColors[i + 1]);
                          }
                          toast.success(`Cor ${color} aplicada ao tema Empresa!`);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        {/* Cores */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Cores do Site</h2>
              <p className="text-sm text-muted-foreground">Personalize as cores principais do seu e-commerce.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExtractColors}
              disabled={extracting}
              className="gap-2"
            >
              {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Extrair da Logo
            </Button>
          </div>

          {/* Extracted Colors Palette */}
          {extractedColors.length > 0 && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
              <p className="text-xs font-medium text-foreground">Cores extraídas da logo — clique para aplicar:</p>
              <div className="flex gap-2 flex-wrap">
                {extractedColors.map((color, i) => (
                  <div key={i} className="text-center space-y-1">
                    <div
                      className="h-10 w-10 rounded-lg border-2 border-border cursor-pointer hover:scale-110 transition-transform shadow-sm"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                    <p className="text-[9px] font-mono text-muted-foreground">{color}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-1">
                {[
                  { label: "Título", field: "design_title_color" },
                  { label: "Texto", field: "design_text_color" },
                  { label: "Ícones", field: "design_icon_color" },
                  { label: "Fundo", field: "design_bg_color" },
                  { label: "Rodapé", field: "design_footer_color" },
                  { label: "Navegação", field: "design_nav_color" },
                ].map((target) => (
                  <div key={target.field} className="space-y-1">
                    <p className="text-[10px] text-muted-foreground">{target.label}:</p>
                    <div className="flex gap-1">
                      {extractedColors.slice(0, 4).map((color, i) => (
                        <button
                          key={i}
                          type="button"
                          className="h-5 w-5 rounded border border-border hover:ring-2 ring-primary/40 transition-all"
                          style={{ backgroundColor: color }}
                          onClick={() => applyExtractedColor(color, target.field as keyof StoreSettings)}
                          title={`Aplicar ${color} em ${target.label}`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ColorInput label="Cor do Título" value={form.design_title_color || "#1a1a2e"} onChange={(v) => update("design_title_color", v)} />
            <ColorInput label="Cor do Texto" value={form.design_text_color || "#374151"} onChange={(v) => update("design_text_color", v)} />
            <ColorInput label="Cor dos Ícones" value={form.design_icon_color || "#2563eb"} onChange={(v) => update("design_icon_color", v)} />
            <ColorInput label="Cor do Menu de Navegação" value={navColor} onChange={(v) => update("design_nav_color" as any, v)} />
          </div>
        </div>

        {/* Fundo do Site */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Fundo do Site</h2>
          <p className="text-sm text-muted-foreground">
            Escolha uma cor sólida ou um degradê para o fundo. O degradê tem prioridade quando preenchido.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <ColorInput label="Cor Sólida de Fundo" value={form.design_bg_color || "#ffffff"} onChange={(v) => update("design_bg_color", v)} />
            <GradientInput
              label="Degradê de Fundo (opcional)"
              value={bgGradient}
              onChange={(v) => update("design_bg_gradient" as any, v)}
            />
          </div>
          {(bgGradient || form.design_bg_color) && (
            <div className="space-y-1">
              <Label className="text-xs">Prévia</Label>
              <div
                className="h-16 rounded-lg border border-border"
                style={{ background: bgGradient || form.design_bg_color || "#ffffff" }}
              />
            </div>
          )}
        </div>

        {/* Rodapé do Site */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Rodapé do Site</h2>
          <p className="text-sm text-muted-foreground">
            Escolha uma cor sólida ou um degradê para o rodapé. O degradê tem prioridade quando preenchido.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ColorInput label="Cor Sólida do Rodapé" value={form.design_footer_color || "#1a1a2e"} onChange={(v) => update("design_footer_color", v)} />
            <ColorInput label="Cor do Título do Rodapé" value={(form as any).design_footer_title_color || "#ffffff"} onChange={(v) => update("design_footer_title_color" as any, v)} />
            <ColorInput label="Cor do Texto do Rodapé" value={(form as any).design_footer_text_color || "#ffffff"} onChange={(v) => update("design_footer_text_color" as any, v)} />
            <GradientInput
              label="Degradê do Rodapé (opcional)"
              value={footerGradient}
              onChange={(v) => update("design_footer_gradient" as any, v)}
            />
          </div>
          {(footerGradient || form.design_footer_color) && (
            <div className="space-y-1">
              <Label className="text-xs">Prévia</Label>
              <div
                className="h-16 rounded-lg border border-border"
                style={{ background: footerGradient || form.design_footer_color || "#1a1a2e" }}
              />
            </div>
          )}
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Exemplos de degradê:</strong></p>
            <p className="font-mono text-[10px]">linear-gradient(135deg, #1a1a2e, #16213e)</p>
            <p className="font-mono text-[10px]">linear-gradient(to right, #0f0c29, #302b63, #24243e)</p>
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

        {/* Estilo de Bordas */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Estilo de Bordas</h2>
          <p className="text-sm text-muted-foreground">Defina se os elementos da loja (cards, banners, botões, imagens) terão cantos arredondados ou quadrados.</p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: "rounded", label: "Arredondado", desc: "Cantos suaves e modernos", Icon: RectangleHorizontal },
              { value: "square", label: "Quadrado", desc: "Cantos retos e geométricos", Icon: SquareIcon },
            ].map((opt) => (
              <label
                key={opt.value}
                className={`flex flex-col items-center gap-3 rounded-xl border p-5 cursor-pointer transition-all ${
                  ((form as any).design_border_style || "rounded") === opt.value
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <input
                  type="radio"
                  name="border_style"
                  value={opt.value}
                  checked={((form as any).design_border_style || "rounded") === opt.value}
                  onChange={() => update("design_border_style" as any, opt.value)}
                  className="sr-only"
                />
                {/* Preview */}
                <div className="flex gap-2">
                  <div className={`h-16 w-24 bg-primary/15 border border-primary/20 ${opt.value === "rounded" ? "rounded-xl" : "rounded-none"}`} />
                  <div className={`h-16 w-16 bg-muted border border-border ${opt.value === "rounded" ? "rounded-xl" : "rounded-none"}`} />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-sm">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Filtro Lateral de Produtos */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Filtro Lateral de Produtos</h2>
              <p className="text-sm text-muted-foreground">Exibir menu lateral com filtros por fabricante, categoria e faixa de preço na página de produtos.</p>
            </div>
            <Switch
              checked={(form as any).products_sidebar_enabled !== false}
              onCheckedChange={(v) => update("products_sidebar_enabled" as any, v)}
            />
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

        {/* Captura de Mailing */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Megaphone className="h-5 w-5" /> Captura de Mailing</h2>
          <p className="text-sm text-muted-foreground">Configure a seção de captura de e-mails exibida na home.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Título</Label>
              <Input value={(form as any).cta_title || ""} onChange={(e) => update("cta_title" as any, e.target.value)} placeholder="Fique por dentro das novidades" />
            </div>
            <div>
              <Label>Subtítulo</Label>
              <Textarea rows={2} value={(form as any).cta_subtitle || ""} onChange={(e) => update("cta_subtitle" as any, e.target.value)} placeholder="Cadastre seu e-mail e seja o primeiro..." />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs">Cor de Fundo</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={(form as any).mailing_bg_color || "#1a365d"} onChange={(e) => update("mailing_bg_color" as any, e.target.value)} className="h-8 w-8 rounded cursor-pointer" />
                <Input value={(form as any).mailing_bg_color || "#1a365d"} onChange={(e) => update("mailing_bg_color" as any, e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Cor do Botão</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={(form as any).mailing_button_color || "#e53e3e"} onChange={(e) => update("mailing_button_color" as any, e.target.value)} className="h-8 w-8 rounded cursor-pointer" />
                <Input value={(form as any).mailing_button_color || "#e53e3e"} onChange={(e) => update("mailing_button_color" as any, e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Cor do Título</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={(form as any).mailing_title_color || "#ffffff"} onChange={(e) => update("mailing_title_color" as any, e.target.value)} className="h-8 w-8 rounded cursor-pointer" />
                <Input value={(form as any).mailing_title_color || "#ffffff"} onChange={(e) => update("mailing_title_color" as any, e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Cor do Texto</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={(form as any).mailing_text_color || "#ffffffcc"} onChange={(e) => update("mailing_text_color" as any, e.target.value)} className="h-8 w-8 rounded cursor-pointer" />
                <Input value={(form as any).mailing_text_color || "#ffffffcc"} onChange={(e) => update("mailing_text_color" as any, e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
          </div>
          {/* Preview */}
          <div className="rounded-lg p-6 text-center" style={{ backgroundColor: (form as any).mailing_bg_color || "#1a365d" }}>
            <p className="text-lg font-bold" style={{ color: (form as any).mailing_title_color || "#ffffff" }}>
              {(form as any).cta_title || "Fique por dentro das novidades"}
            </p>
            <p className="text-sm mt-1" style={{ color: (form as any).mailing_text_color || "#ffffffcc" }}>
              {(form as any).cta_subtitle || "Cadastre seu e-mail..."}
            </p>
            <div className="mt-3 inline-block px-6 py-2 rounded-md text-white text-sm font-semibold" style={{ backgroundColor: (form as any).mailing_button_color || "#e53e3e" }}>
              Quero receber novidades
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Prévia</h2>
          <div className="rounded-xl border border-border overflow-hidden">
            {/* Nav preview */}
            <div className="p-3 flex items-center gap-2" style={{ backgroundColor: navColor }}>
              <div className="h-6 w-20 rounded bg-foreground/10" />
              <div className="flex gap-3 ml-auto">
                {["Home", "Produtos", "Contato"].map((t) => (
                  <span key={t} className="text-xs font-medium" style={{ color: form.design_title_color || "#1a1a2e" }}>{t}</span>
                ))}
              </div>
            </div>
            {/* Body preview */}
            <div
              className="p-6"
              style={{
                background: bgGradient || form.design_bg_color || "#ffffff",
                fontFamily: form.design_font || "Inter",
              }}
            >
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
            </div>
            {/* Footer preview */}
            <div
              className="p-3 rounded-b-xl"
              style={{
                background: footerGradient || form.design_footer_color || "#1a1a2e",
              }}
            >
              <p className="text-xs text-white/70">Rodapé — Prévia de cor / degradê</p>
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
