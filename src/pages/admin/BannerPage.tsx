import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStoreSettings, HeroBadge } from "@/hooks/useStoreSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Image, Type, Link2, Save, Loader2, Eye, Video, Plus, Trash2, Palette } from "lucide-react";

const ICON_OPTIONS = [
  "Shield", "Lock", "Truck", "Award", "FlaskConical", "ShieldCheck",
  "TrendingUp", "Star", "Heart", "Zap", "CheckCircle",
];

interface BadgeForm {
  icon: string;
  label: string;
}

export default function BannerPage() {
  const { data: settings, isLoading } = useStoreSettings();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    hero_title: "",
    hero_subtitle: "",
    hero_button_text: "",
    hero_button_link: "",
    hero_button2_text: "",
    hero_button2_link: "",
    hero_image_url: "",
    hero_media_type: "image",
    hero_video_url: "",
    hero_btn1_bg_color: "",
    hero_btn1_hover_color: "",
    hero_btn2_bg_color: "",
    hero_btn2_hover_color: "",
  });

  const [badges, setBadges] = useState<BadgeForm[]>([
    { icon: "Shield", label: "Qualidade Comprovada" },
    { icon: "Lock", label: "Compra Segura" },
    { icon: "Truck", label: "Entrega Rápida" },
    { icon: "Award", label: "Qualidade Premium" },
  ]);

  useEffect(() => {
    if (settings) {
      setForm({
        hero_title: settings.hero_title || "Suplementos de Alta Performance com Qualidade Farmacêutica",
        hero_subtitle: settings.hero_subtitle || "Resultados reais com segurança e controle rigoroso",
        hero_button_text: settings.hero_button_text || "Comprar Agora",
        hero_button_link: settings.hero_button_link || "/produtos",
        hero_button2_text: settings.hero_button2_text || "Saiba Mais",
        hero_button2_link: settings.hero_button2_link || "/#beneficios",
        hero_image_url: settings.hero_image_url || "",
        hero_media_type: settings.hero_media_type || "image",
        hero_video_url: settings.hero_video_url || "",
        hero_btn1_bg_color: settings.hero_btn1_bg_color || "",
        hero_btn1_hover_color: settings.hero_btn1_hover_color || "",
        hero_btn2_bg_color: settings.hero_btn2_bg_color || "",
        hero_btn2_hover_color: settings.hero_btn2_hover_color || "",
      });
      if (settings.hero_badges && Array.isArray(settings.hero_badges) && settings.hero_badges.length > 0) {
        setBadges(settings.hero_badges.slice(0, 4));
      }
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!settings?.id) throw new Error("Settings not found");
      const payload: any = {
        ...form,
        hero_badges: badges,
      };
      const { error } = await (supabase.from("store_settings" as any) as any)
        .update(payload)
        .eq("id", settings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-settings"] });
      qc.invalidateQueries({ queryKey: ["store-settings-admin"] });
      toast.success("Banner atualizado com sucesso!");
    },
    onError: () => toast.error("Erro ao salvar banner."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  const updateBadge = (index: number, field: keyof BadgeForm, value: string) => {
    setBadges((prev) => prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)));
  };

  const addBadge = () => {
    if (badges.length >= 4) return;
    setBadges((prev) => [...prev, { icon: "Star", label: "" }]);
  };

  const removeBadge = (index: number) => {
    setBadges((prev) => prev.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Banner Principal</h1>
        <a href="/" target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="gap-2">
            <Eye className="h-4 w-4" /> Ver no Site
          </Button>
        </a>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Textos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Type className="h-5 w-5" /> Textos
              </CardTitle>
              <CardDescription>Título e subtítulo exibidos no banner da home.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Título Principal</Label>
                <Textarea
                  rows={3}
                  value={form.hero_title}
                  onChange={(e) => setForm({ ...form, hero_title: e.target.value })}
                  placeholder="Suplementos de Alta Performance..."
                  maxLength={200}
                />
                <p className="mt-1 text-xs text-muted-foreground">{form.hero_title.length}/200 caracteres</p>
              </div>
              <div>
                <Label>Subtítulo</Label>
                <Input
                  value={form.hero_subtitle}
                  onChange={(e) => setForm({ ...form, hero_subtitle: e.target.value })}
                  placeholder="Resultados reais com segurança..."
                  maxLength={150}
                />
              </div>
            </CardContent>
          </Card>

          {/* Mídia */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                {form.hero_media_type === "video" ? <Video className="h-5 w-5" /> : <Image className="h-5 w-5" />} Mídia de Fundo
              </CardTitle>
              <CardDescription>Escolha entre imagem ou vídeo do YouTube como fundo do banner.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Tipo de Mídia</Label>
                <Select value={form.hero_media_type} onValueChange={(v) => setForm({ ...form, hero_media_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">Imagem</SelectItem>
                    <SelectItem value="video">Vídeo (YouTube)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.hero_media_type === "image" ? (
                <>
                  <div>
                    <Label>URL da Imagem</Label>
                    <Input
                      value={form.hero_image_url}
                      onChange={(e) => setForm({ ...form, hero_image_url: e.target.value })}
                      placeholder="https://... ou deixe vazio para padrão"
                    />
                  </div>
                  {form.hero_image_url && (
                    <div className="overflow-hidden rounded-lg border border-border">
                      <img
                        src={form.hero_image_url}
                        alt="Preview do banner"
                        className="h-40 w-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <Label>URL do YouTube</Label>
                    <Input
                      value={form.hero_video_url}
                      onChange={(e) => setForm({ ...form, hero_video_url: e.target.value })}
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                    <p className="mt-1 text-xs text-muted-foreground">Cole o link do vídeo do YouTube. Ele será reproduzido automaticamente em loop sem som.</p>
                  </div>
                  {form.hero_video_url && (
                    <div className="overflow-hidden rounded-lg border border-border aspect-video">
                      <iframe
                        src={`https://www.youtube.com/embed/${form.hero_video_url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1] || ""}`}
                        className="h-full w-full"
                        allow="autoplay; encrypted-media"
                        title="Preview"
                      />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Selos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Palette className="h-5 w-5" /> Selos
              </CardTitle>
              <CardDescription>Configure até 4 selos exibidos no banner. Escolha ícone e texto.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {badges.map((badge, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select value={badge.icon} onValueChange={(v) => updateBadge(i, "icon", v)}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map((ic) => (
                        <SelectItem key={ic} value={ic}>{ic}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={badge.label}
                    onChange={(e) => updateBadge(i, "label", e.target.value)}
                    placeholder="Texto do selo"
                    maxLength={30}
                    className="flex-1"
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeBadge(i)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {badges.length < 4 && (
                <Button type="button" variant="outline" size="sm" onClick={addBadge} className="gap-1">
                  <Plus className="h-4 w-4" /> Adicionar Selo
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Botões */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Link2 className="h-5 w-5" /> Botões de Ação
              </CardTitle>
              <CardDescription>Configure os botões de chamada para ação e suas cores.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Botão Principal */}
                <div className="space-y-3 rounded-lg border border-border p-4">
                  <p className="text-sm font-semibold">Botão Principal</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Texto</Label>
                      <Input
                        value={form.hero_button_text}
                        onChange={(e) => setForm({ ...form, hero_button_text: e.target.value })}
                        placeholder="Comprar Agora"
                        maxLength={30}
                      />
                    </div>
                    <div>
                      <Label>Link</Label>
                      <Input
                        value={form.hero_button_link}
                        onChange={(e) => setForm({ ...form, hero_button_link: e.target.value })}
                        placeholder="/produtos"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Cor de Fundo</Label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={form.hero_btn1_bg_color || "#16a34a"}
                          onChange={(e) => setForm({ ...form, hero_btn1_bg_color: e.target.value })}
                          className="h-9 w-12 rounded border border-border cursor-pointer"
                        />
                        <Input
                          value={form.hero_btn1_bg_color}
                          onChange={(e) => setForm({ ...form, hero_btn1_bg_color: e.target.value })}
                          placeholder="Padrão do tema"
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Cor ao Passar o Mouse</Label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={form.hero_btn1_hover_color || "#15803d"}
                          onChange={(e) => setForm({ ...form, hero_btn1_hover_color: e.target.value })}
                          className="h-9 w-12 rounded border border-border cursor-pointer"
                        />
                        <Input
                          value={form.hero_btn1_hover_color}
                          onChange={(e) => setForm({ ...form, hero_btn1_hover_color: e.target.value })}
                          placeholder="Padrão do tema"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                  {form.hero_btn1_bg_color && (
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-muted-foreground">Preview:</div>
                      <button
                        type="button"
                        className="rounded-md px-4 py-2 text-sm font-semibold text-white transition-colors"
                        style={{ backgroundColor: form.hero_btn1_bg_color }}
                        onMouseEnter={(e) => { if (form.hero_btn1_hover_color) (e.target as HTMLElement).style.backgroundColor = form.hero_btn1_hover_color; }}
                        onMouseLeave={(e) => { (e.target as HTMLElement).style.backgroundColor = form.hero_btn1_bg_color; }}
                      >
                        {form.hero_button_text || "Botão"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Botão Secundário */}
                <div className="space-y-3 rounded-lg border border-border p-4">
                  <p className="text-sm font-semibold">Botão Secundário</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Texto (vazio = ocultar)</Label>
                      <Input
                        value={form.hero_button2_text}
                        onChange={(e) => setForm({ ...form, hero_button2_text: e.target.value })}
                        placeholder="Saiba Mais"
                        maxLength={30}
                      />
                    </div>
                    <div>
                      <Label>Link</Label>
                      <Input
                        value={form.hero_button2_link}
                        onChange={(e) => setForm({ ...form, hero_button2_link: e.target.value })}
                        placeholder="/#beneficios"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Cor de Fundo</Label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={form.hero_btn2_bg_color || "#1a1a2e"}
                          onChange={(e) => setForm({ ...form, hero_btn2_bg_color: e.target.value })}
                          className="h-9 w-12 rounded border border-border cursor-pointer"
                        />
                        <Input
                          value={form.hero_btn2_bg_color}
                          onChange={(e) => setForm({ ...form, hero_btn2_bg_color: e.target.value })}
                          placeholder="Transparente (padrão)"
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Cor ao Passar o Mouse</Label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={form.hero_btn2_hover_color || "#2a2a3e"}
                          onChange={(e) => setForm({ ...form, hero_btn2_hover_color: e.target.value })}
                          className="h-9 w-12 rounded border border-border cursor-pointer"
                        />
                        <Input
                          value={form.hero_btn2_hover_color}
                          onChange={(e) => setForm({ ...form, hero_btn2_hover_color: e.target.value })}
                          placeholder="Padrão do tema"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                  {form.hero_btn2_bg_color && (
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-muted-foreground">Preview:</div>
                      <button
                        type="button"
                        className="rounded-md px-4 py-2 text-sm font-semibold text-white transition-colors"
                        style={{ backgroundColor: form.hero_btn2_bg_color }}
                        onMouseEnter={(e) => { if (form.hero_btn2_hover_color) (e.target as HTMLElement).style.backgroundColor = form.hero_btn2_hover_color; }}
                        onMouseLeave={(e) => { (e.target as HTMLElement).style.backgroundColor = form.hero_btn2_bg_color; }}
                      >
                        {form.hero_button2_text || "Botão"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Button type="submit" size="lg" className="gap-2" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {mutation.isPending ? "Salvando..." : "Salvar Banner"}
        </Button>
      </form>
    </div>
  );
}
