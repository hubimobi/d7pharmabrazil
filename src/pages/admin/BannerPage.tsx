import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Image, Type, Link2, Save, Loader2, Eye, Video, Plus, Trash2, Palette, GripVertical, Upload, Settings, ChevronDown, ChevronUp, Shield, Lock, Truck, Award, FlaskConical, ShieldCheck, TrendingUp, Star, Heart, Zap, CheckCircle, Crop, Eraser } from "lucide-react";
import { CropImageDialog } from "@/components/admin/CropImageDialog";

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Shield, Lock, Truck, Award, FlaskConical, ShieldCheck, TrendingUp, Star, Heart, Zap, CheckCircle,
};

const ICON_OPTIONS = Object.keys(ICON_MAP);

interface HeroBanner {
  id: string;
  sort_order: number;
  active: boolean;
  title: string;
  subtitle: string;
  button_text: string;
  button_link: string;
  button2_text: string;
  button2_link: string;
  btn1_bg_color: string | null;
  btn1_hover_color: string | null;
  btn2_bg_color: string | null;
  btn2_hover_color: string | null;
  media_type: string;
  image_url: string | null;
  video_url: string | null;
  side_image_url: string | null;
  bg_color: string | null;
  bg_gradient: string | null;
  badges: Array<{ icon: string; label: string }>;
}

export default function BannerPage() {
  const { data: settings, isLoading: settingsLoading } = useStoreSettings();
  const qc = useQueryClient();
  const [expandedBanner, setExpandedBanner] = useState<string | null>(null);
  const [carouselEffect, setCarouselEffect] = useState("fade");
  const [carouselInterval, setCarouselInterval] = useState(5);
  const [carouselEnabled, setCarouselEnabled] = useState(true);
  const sideImageRef = useRef<HTMLInputElement>(null);
  const [uploadingSideImage, setUploadingSideImage] = useState<string | null>(null);
  const [cropDialog, setCropDialog] = useState<{ bannerId: string; imageUrl: string } | null>(null);
  const [removingBg, setRemovingBg] = useState<string | null>(null);

  const handleCropComplete = useCallback(async (blob: Blob, bannerId: string) => {
    try {
      const filePath = `banner-side-${bannerId}-cropped.png`;
      await supabase.storage.from("store-assets").remove([filePath]);
      const { error } = await supabase.storage.from("store-assets").upload(filePath, blob, { upsert: true, contentType: "image/png" });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("store-assets").getPublicUrl(filePath);
      updateBanner(bannerId, "side_image_url", urlData.publicUrl + "?t=" + Date.now());
      toast.success("Imagem recortada com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao salvar recorte: " + err.message);
    }
  }, []);

  const handleRemoveBg = useCallback(async (bannerId: string, imageUrl: string) => {
    setRemovingBg(bannerId);
    try {
      const { data, error } = await supabase.functions.invoke("remove-background", {
        body: { image_url: imageUrl },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const binary = atob(data.image_base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "image/png" });

      const filePath = `banner-side-${bannerId}-nobg.png`;
      await supabase.storage.from("store-assets").remove([filePath]);
      const { error: uploadError } = await supabase.storage.from("store-assets").upload(filePath, blob, { upsert: true, contentType: "image/png" });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("store-assets").getPublicUrl(filePath);
      updateBanner(bannerId, "side_image_url", urlData.publicUrl + "?t=" + Date.now());
      toast.success("Fundo removido com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao remover fundo: " + err.message);
    } finally {
      setRemovingBg(null);
    }
  }, []);

  const { data: banners, isLoading } = useQuery({
    queryKey: ["hero-banners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hero_banners" as any)
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data as any[]).map((b) => ({
        ...b,
        badges: Array.isArray(b.badges) ? b.badges : [],
      })) as HeroBanner[];
    },
  });

  const [localBanners, setLocalBanners] = useState<HeroBanner[]>([]);

  useEffect(() => {
    if (banners) setLocalBanners(banners);
  }, [banners]);

  useEffect(() => {
    if (settings) {
      setCarouselEffect((settings as any).hero_carousel_effect || "fade");
      setCarouselInterval((settings as any).hero_carousel_interval || 5);
      setCarouselEnabled((settings as any).hero_carousel_enabled ?? true);
    }
  }, [settings]);

  const saveSettingsMut = useMutation({
    mutationFn: async () => {
      if (!settings?.id) return;
      await (supabase.from("store_settings" as any) as any)
        .update({
          hero_carousel_enabled: carouselEnabled,
          hero_carousel_effect: carouselEffect,
          hero_carousel_interval: carouselInterval,
        })
        .eq("id", settings.id);
    },
  });

  const saveBannerMut = useMutation({
    mutationFn: async (banner: HeroBanner) => {
      const { id, ...rest } = banner;
      const { error } = await (supabase.from("hero_banners" as any) as any)
        .update({ ...rest, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hero-banners"] });
      qc.invalidateQueries({ queryKey: ["store-settings"] });
    },
  });

  const addBannerMut = useMutation({
    mutationFn: async () => {
      const nextOrder = localBanners.length;
      const { error } = await (supabase.from("hero_banners" as any) as any)
        .insert({ sort_order: nextOrder, active: true, title: "Novo Banner", subtitle: "", badges: [] });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hero-banners"] });
      toast.success("Banner adicionado!");
    },
  });

  const deleteBannerMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("hero_banners" as any) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hero-banners"] });
      toast.success("Banner removido!");
    },
  });

  const handleSaveAll = async () => {
    try {
      await saveSettingsMut.mutateAsync();
      for (const b of localBanners) {
        await saveBannerMut.mutateAsync(b);
      }
      toast.success("Banners salvos com sucesso!");
    } catch {
      toast.error("Erro ao salvar banners.");
    }
  };

  const updateBanner = (id: string, field: keyof HeroBanner, value: any) => {
    setLocalBanners((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [field]: value } : b))
    );
  };

  const moveBanner = (index: number, direction: "up" | "down") => {
    const newBanners = [...localBanners];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newBanners.length) return;
    [newBanners[index], newBanners[targetIndex]] = [newBanners[targetIndex], newBanners[index]];
    newBanners.forEach((b, i) => (b.sort_order = i));
    setLocalBanners(newBanners);
  };

  const handleSideImageUpload = async (file: File, bannerId: string) => {
    setUploadingSideImage(bannerId);
    try {
      const ext = file.name.split(".").pop() || "png";
      const filePath = `banner-side-${bannerId}.${ext}`;
      await supabase.storage.from("store-assets").remove([filePath]);
      const { error } = await supabase.storage.from("store-assets").upload(filePath, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("store-assets").getPublicUrl(filePath);
      updateBanner(bannerId, "side_image_url", urlData.publicUrl + "?t=" + Date.now());
      toast.success("Imagem lateral enviada!");
    } catch (err: any) {
      toast.error("Erro ao enviar imagem: " + err.message);
    } finally {
      setUploadingSideImage(null);
    }
  };

  if (isLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Banners Principais</h1>
        <div className="flex gap-2">
          <a href="/" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-2">
              <Eye className="h-4 w-4" /> Ver no Site
            </Button>
          </a>
        </div>
      </div>

      {/* Carousel Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5" /> Configurações do Carrossel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={carouselEnabled}
              onCheckedChange={setCarouselEnabled}
              id="carousel-toggle"
            />
            <Label htmlFor="carousel-toggle">Carrossel Ativo</Label>
          </div>
          {carouselEnabled && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Efeito de Transição</Label>
                <Select value={carouselEffect} onValueChange={setCarouselEffect}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fade">Fade (Suave)</SelectItem>
                    <SelectItem value="slide">Slide (Deslizar)</SelectItem>
                    <SelectItem value="zoom">Zoom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tempo entre Banners (segundos)</Label>
                <Input
                  type="number"
                  min={2}
                  max={15}
                  value={carouselInterval}
                  onChange={(e) => setCarouselInterval(Number(e.target.value))}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Banners List */}
      <div className="space-y-4">
        {localBanners.map((banner, index) => (
          <Card key={banner.id} className={!banner.active ? "opacity-60" : ""}>
            <CardHeader
              className="cursor-pointer"
              onClick={() => setExpandedBanner(expandedBanner === banner.id ? null : banner.id)}
            >
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); moveBanner(index, "up"); }} disabled={index === 0}>
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); moveBanner(index, "down"); }} disabled={index === localBanners.length - 1}>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    Banner {index + 1}
                    {!banner.active && <span className="text-xs text-muted-foreground">(Desativado)</span>}
                    {banner.title && <span className="text-sm font-normal text-muted-foreground truncate max-w-xs">— {banner.title.slice(0, 40)}</span>}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={banner.active}
                    onCheckedChange={(v) => updateBanner(banner.id, "active", v)}
                  />
                  {localBanners.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => deleteBannerMut.mutate(banner.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            {expandedBanner === banner.id && (
              <CardContent className="space-y-6 border-t pt-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Textos */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2"><Type className="h-4 w-4" /> Textos</h3>
                    <div>
                      <Label>Título</Label>
                      <Textarea
                        rows={2}
                        value={banner.title}
                        onChange={(e) => updateBanner(banner.id, "title", e.target.value)}
                        maxLength={200}
                      />
                    </div>
                    <div>
                      <Label>Subtítulo</Label>
                      <Input
                        value={banner.subtitle}
                        onChange={(e) => updateBanner(banner.id, "subtitle", e.target.value)}
                        maxLength={150}
                      />
                    </div>
                  </div>

                  {/* Mídia */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      {banner.media_type === "video" ? <Video className="h-4 w-4" /> : <Image className="h-4 w-4" />} Mídia de Fundo
                    </h3>
                    <div>
                     <Label>Tipo</Label>
                      <Select value={banner.media_type} onValueChange={(v) => updateBanner(banner.id, "media_type", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="image">Imagem</SelectItem>
                          <SelectItem value="video">Vídeo (YouTube)</SelectItem>
                          <SelectItem value="color">Cor Sólida</SelectItem>
                          <SelectItem value="gradient">Degradê</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {banner.media_type === "image" ? (
                      <div>
                        <Label>URL da Imagem de Fundo</Label>
                        <Input value={banner.image_url || ""} onChange={(e) => updateBanner(banner.id, "image_url", e.target.value)} placeholder="https://..." />
                        {banner.image_url && (
                          <img src={banner.image_url} alt="Preview" className="mt-2 h-24 w-full object-cover rounded-md border" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        )}
                      </div>
                    ) : banner.media_type === "video" ? (
                      <div>
                        <Label>URL do YouTube</Label>
                        <Input value={banner.video_url || ""} onChange={(e) => updateBanner(banner.id, "video_url", e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
                      </div>
                    ) : banner.media_type === "color" ? (
                      <div>
                        <Label>Cor de Fundo</Label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={banner.bg_color || "#1a1a2e"}
                            onChange={(e) => updateBanner(banner.id, "bg_color", e.target.value)}
                            className="h-10 w-14 rounded border cursor-pointer"
                          />
                          <Input
                            value={banner.bg_color || "#1a1a2e"}
                            onChange={(e) => updateBanner(banner.id, "bg_color", e.target.value)}
                            placeholder="#1a1a2e"
                            className="flex-1"
                          />
                        </div>
                        <div className="mt-2 h-16 rounded-md border" style={{ backgroundColor: banner.bg_color || "#1a1a2e" }} />
                      </div>
                    ) : banner.media_type === "gradient" ? (
                      <div className="space-y-3">
                        <Label>Degradê (CSS Gradient)</Label>
                        <Input
                          value={banner.bg_gradient || "linear-gradient(135deg, #1a1a2e 0%, #2d1b69 50%, #0f3460 100%)"}
                          onChange={(e) => updateBanner(banner.id, "bg_gradient", e.target.value)}
                          placeholder="linear-gradient(135deg, #1a1a2e 0%, #2d1b69 50%, #0f3460 100%)"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => updateBanner(banner.id, "bg_gradient", "linear-gradient(135deg, #1a1a2e 0%, #2d1b69 50%, #0f3460 100%)")}>
                            Roxo/Azul
                          </Button>
                          <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => updateBanner(banner.id, "bg_gradient", "linear-gradient(135deg, #0c0c1d 0%, #1b4332 50%, #081c15 100%)")}>
                            Verde Escuro
                          </Button>
                          <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => updateBanner(banner.id, "bg_gradient", "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0ea5e9 100%)")}>
                            Azul Oceano
                          </Button>
                          <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => updateBanner(banner.id, "bg_gradient", "linear-gradient(135deg, #1a1a2e 0%, #831843 50%, #be185d 100%)")}>
                            Rosa/Magenta
                          </Button>
                        </div>
                        <div className="h-16 rounded-md border" style={{ background: banner.bg_gradient || "linear-gradient(135deg, #1a1a2e, #2d1b69, #0f3460)" }} />
                      </div>
                    ) : null}
                  </div>

                  {/* Imagem Lateral */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2"><Image className="h-4 w-4" /> Imagem Lateral (Direita)</h3>
                    <p className="text-xs text-muted-foreground">Imagem exibida à direita do texto no banner.</p>
                    <input
                      ref={sideImageRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleSideImageUpload(file, banner.id);
                        e.target.value = "";
                      }}
                    />
                    {banner.side_image_url ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                          <img src={banner.side_image_url} alt="Lateral" className="h-20 object-contain" />
                          <div className="flex flex-col gap-2 ml-auto">
                            <Button type="button" variant="outline" size="sm" onClick={() => sideImageRef.current?.click()} disabled={uploadingSideImage === banner.id}>
                              {uploadingSideImage === banner.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                              Trocar
                            </Button>
                            <Button type="button" variant="destructive" size="sm" onClick={() => updateBanner(banner.id, "side_image_url", null)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => {
                            setCropDialog({ bannerId: banner.id, imageUrl: banner.side_image_url! });
                          }}>
                            <Crop className="h-4 w-4" /> Recortar
                          </Button>
                          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => handleRemoveBg(banner.id, banner.side_image_url!)} disabled={removingBg === banner.id}>
                            {removingBg === banner.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eraser className="h-4 w-4" />}
                            {removingBg === banner.id ? "Processando..." : "Remover Fundo"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button type="button" variant="outline" className="gap-2" onClick={() => sideImageRef.current?.click()} disabled={uploadingSideImage === banner.id}>
                        {uploadingSideImage === banner.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        Enviar Imagem Lateral
                      </Button>
                    )}
                  </div>

                  {/* Selos */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2"><Palette className="h-4 w-4" /> Selos (máx. 3)</h3>
                    {banner.badges.map((badge, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Select value={badge.icon} onValueChange={(v) => {
                          const newBadges = [...banner.badges];
                          newBadges[i] = { ...newBadges[i], icon: v };
                          updateBanner(banner.id, "badges", newBadges);
                        }}>
                          <SelectTrigger className="w-44">
                            <SelectValue>
                              {(() => { const IC = ICON_MAP[badge.icon]; return IC ? <span className="flex items-center gap-2"><IC className="h-4 w-4" />{badge.icon}</span> : badge.icon; })()}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {ICON_OPTIONS.map((ic) => {
                              const IC = ICON_MAP[ic];
                              return (
                                <SelectItem key={ic} value={ic}>
                                  <span className="flex items-center gap-2"><IC className="h-4 w-4" />{ic}</span>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <Input
                          value={badge.label}
                          onChange={(e) => {
                            const newBadges = [...banner.badges];
                            newBadges[i] = { ...newBadges[i], label: e.target.value };
                            updateBanner(banner.id, "badges", newBadges);
                          }}
                          placeholder="Texto do selo"
                          maxLength={30}
                          className="flex-1"
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => {
                          updateBanner(banner.id, "badges", banner.badges.filter((_, bi) => bi !== i));
                        }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    {banner.badges.length < 3 && (
                      <Button type="button" variant="outline" size="sm" onClick={() => {
                        updateBanner(banner.id, "badges", [...banner.badges, { icon: "Star", label: "" }]);
                      }} className="gap-1">
                        <Plus className="h-4 w-4" /> Adicionar Selo
                      </Button>
                    )}
                  </div>

                  {/* Botões */}
                  <div className="space-y-4 lg:col-span-2">
                    <h3 className="font-semibold flex items-center gap-2"><Link2 className="h-4 w-4" /> Botões de Ação</h3>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="space-y-3 rounded-lg border p-4">
                        <p className="text-sm font-semibold">Botão Principal</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Texto</Label>
                            <Input value={banner.button_text} onChange={(e) => updateBanner(banner.id, "button_text", e.target.value)} maxLength={30} />
                          </div>
                          <div>
                            <Label>Link</Label>
                            <Input value={banner.button_link} onChange={(e) => updateBanner(banner.id, "button_link", e.target.value)} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Cor de Fundo</Label>
                            <div className="flex gap-2 items-center">
                              <input type="color" value={banner.btn1_bg_color || "#16a34a"} onChange={(e) => updateBanner(banner.id, "btn1_bg_color", e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
                              <Input value={banner.btn1_bg_color || ""} onChange={(e) => updateBanner(banner.id, "btn1_bg_color", e.target.value)} placeholder="Padrão" className="flex-1" />
                            </div>
                          </div>
                          <div>
                            <Label>Cor Hover</Label>
                            <div className="flex gap-2 items-center">
                              <input type="color" value={banner.btn1_hover_color || "#15803d"} onChange={(e) => updateBanner(banner.id, "btn1_hover_color", e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
                              <Input value={banner.btn1_hover_color || ""} onChange={(e) => updateBanner(banner.id, "btn1_hover_color", e.target.value)} placeholder="Padrão" className="flex-1" />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3 rounded-lg border p-4">
                        <p className="text-sm font-semibold">Botão Secundário</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Texto (vazio = ocultar)</Label>
                            <Input value={banner.button2_text} onChange={(e) => updateBanner(banner.id, "button2_text", e.target.value)} maxLength={30} />
                          </div>
                          <div>
                            <Label>Link</Label>
                            <Input value={banner.button2_link} onChange={(e) => updateBanner(banner.id, "button2_link", e.target.value)} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Cor de Fundo</Label>
                            <div className="flex gap-2 items-center">
                              <input type="color" value={banner.btn2_bg_color || "#1a1a2e"} onChange={(e) => updateBanner(banner.id, "btn2_bg_color", e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
                              <Input value={banner.btn2_bg_color || ""} onChange={(e) => updateBanner(banner.id, "btn2_bg_color", e.target.value)} placeholder="Transparente" className="flex-1" />
                            </div>
                          </div>
                          <div>
                            <Label>Cor Hover</Label>
                            <div className="flex gap-2 items-center">
                              <input type="color" value={banner.btn2_hover_color || "#2a2a3e"} onChange={(e) => updateBanner(banner.id, "btn2_hover_color", e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
                              <Input value={banner.btn2_hover_color || ""} onChange={(e) => updateBanner(banner.id, "btn2_hover_color", e.target.value)} placeholder="Padrão" className="flex-1" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      <div className="flex gap-3">
        {localBanners.length < 5 && (
          <Button type="button" variant="outline" onClick={() => addBannerMut.mutate()} disabled={addBannerMut.isPending} className="gap-2">
            <Plus className="h-4 w-4" /> Adicionar Banner
          </Button>
        )}
        <Button onClick={handleSaveAll} size="lg" className="gap-2" disabled={saveBannerMut.isPending}>
          {saveBannerMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar Todos os Banners
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Máximo de 5 banners. {localBanners.length}/5 utilizados.</p>

      {/* Crop Dialog */}
      {cropDialog && (
        <CropImageDialog
          open={!!cropDialog}
          onOpenChange={(open) => { if (!open) setCropDialog(null); }}
          imageUrl={cropDialog.imageUrl}
          onCropComplete={(blob) => handleCropComplete(blob, cropDialog.bannerId)}
        />
      )}
    </div>
  );
}
