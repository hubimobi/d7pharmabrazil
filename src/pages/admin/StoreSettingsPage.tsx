import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Store, Save, Loader2, Image, Instagram, Truck, Bell, Megaphone, Upload, Trash2, Award, Plus, X, FlaskConical, ShieldCheck, TrendingUp, Heart, Star, Zap, Clock, Eye, Gift, ThumbsUp, CheckCircle, Sparkles, Eraser, Target } from "lucide-react";
import type { StoreSettings } from "@/hooks/useStoreSettings";
import { useProducts } from "@/hooks/useProducts";
import { CropImageDialog } from "@/components/admin/CropImageDialog";

async function resizeImage(blob: Blob, width: number, height: number): Promise<Blob> {
  const img = new window.Image();
  const url = URL.createObjectURL(blob);
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });
  URL.revokeObjectURL(url);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, width, height);
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b!), "image/png", 1);
  });
}

const benefitIconOptions = [
  { value: "FlaskConical", label: "Farmácia", Icon: FlaskConical },
  { value: "Truck", label: "Entrega", Icon: Truck },
  { value: "ShieldCheck", label: "Segurança", Icon: ShieldCheck },
  { value: "TrendingUp", label: "Resultados", Icon: TrendingUp },
  { value: "Heart", label: "Coração", Icon: Heart },
  { value: "Star", label: "Estrela", Icon: Star },
  { value: "Zap", label: "Raio", Icon: Zap },
  { value: "Clock", label: "Relógio", Icon: Clock },
  { value: "Eye", label: "Olho", Icon: Eye },
  { value: "Gift", label: "Presente", Icon: Gift },
  { value: "ThumbsUp", label: "Aprovação", Icon: ThumbsUp },
  { value: "CheckCircle", label: "Check", Icon: CheckCircle },
  { value: "Sparkles", label: "Brilho", Icon: Sparkles },
];

export default function StoreSettingsPage() {
  const queryClient = useQueryClient();
  const { data: allProducts } = useProducts();
  const [form, setForm] = useState<Partial<StoreSettings> | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHorizontalLogo, setUploadingHorizontalLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const horizontalLogoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState("");
  const [removingLogoBg, setRemovingLogoBg] = useState<string | null>(null);

  const updateField = useCallback((field: keyof StoreSettings, value: any) =>
    setForm((prev) => prev ? { ...prev, [field]: value } : prev), []);

  const handleRemoveLogoBg = useCallback(async (type: "logo" | "horizontal_logo") => {
    const field = type === "logo" ? "logo_url" : "horizontal_logo_url";
    const imageUrl = form?.[field as keyof StoreSettings] as string;
    if (!imageUrl) return;
    setRemovingLogoBg(type);
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
      const filePath = `${type.replace("_", "-")}-nobg.png`;
      await supabase.storage.from("store-assets").remove([filePath]);
      const { error: uploadError } = await supabase.storage.from("store-assets").upload(filePath, blob, { upsert: true, contentType: "image/png" });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("store-assets").getPublicUrl(filePath);
      updateField(field as keyof StoreSettings, urlData.publicUrl + "?t=" + Date.now());
      toast.success("Fundo removido com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao remover fundo: " + err.message);
    } finally {
      setRemovingLogoBg(null);
    }
  }, [form, updateField]);

  const handleUploadDirect = useCallback(async (file: File, type: "logo" | "horizontal_logo" | "favicon") => {
    const setUploading = type === "logo" ? setUploadingLogo : type === "horizontal_logo" ? setUploadingHorizontalLogo : setUploadingFavicon;
    const field = type === "logo" ? "logo_url" : type === "horizontal_logo" ? "horizontal_logo_url" : "favicon_url";
    const filePath = `${type.replace("_", "-")}.png`;

    setUploading(true);
    try {
      await supabase.storage.from("store-assets").remove([filePath]);
      const { error: uploadError } = await supabase.storage
        .from("store-assets")
        .upload(filePath, file, { upsert: true, cacheControl: "0" });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("store-assets").getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl + "?t=" + Date.now();
      updateField(field as keyof StoreSettings, publicUrl);
      const labels: Record<string, string> = { logo: "Logo Principal", horizontal_logo: "Logo Horizontal", favicon: "Favicon" };
      toast.success(`${labels[type]} enviado com sucesso!`);
    } catch (err: any) {
      toast.error(`Erro ao enviar: ${err.message}`);
    } finally {
      setUploading(false);
    }
  }, [updateField]);

  const handleHorizontalLogoFile = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setCropImageUrl(url);
    setCropOpen(true);
  }, []);

  const handleCropComplete = useCallback(async (blob: Blob) => {
    const resized = await resizeImage(blob, 480, 120);
    const file = new File([resized], "horizontal-logo.png", { type: "image/png" });
    handleUploadDirect(file, "horizontal_logo");
  }, [handleUploadDirect]);

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
      toast.success("Configurações salvas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["store-settings"] });
      queryClient.invalidateQueries({ queryKey: ["store-settings-admin"] });
    },
    onError: () => toast.error("Erro ao salvar configurações."),
  });

  if (settings && !form) {
    setForm({ ...settings });
  }

  if (isLoading || !form) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const update = updateField;

  const handleUpload = async (file: File, type: "logo" | "horizontal_logo" | "favicon") => {
    const setUploading = type === "logo" ? setUploadingLogo : type === "horizontal_logo" ? setUploadingHorizontalLogo : setUploadingFavicon;
    const field = type === "logo" ? "logo_url" : type === "horizontal_logo" ? "horizontal_logo_url" : "favicon_url";
    const ext = file.name.split(".").pop() || "png";
    const filePath = `${type.replace("_", "-")}.${ext}`;

    setUploading(true);
    try {
      await supabase.storage.from("store-assets").remove([filePath]);

      const { error: uploadError } = await supabase.storage
        .from("store-assets")
        .upload(filePath, file, { upsert: true, cacheControl: "0" });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("store-assets")
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl + "?t=" + Date.now();
      update(field as keyof StoreSettings, publicUrl);
      const labels: Record<string, string> = { logo: "Logo Principal", horizontal_logo: "Logo Horizontal", favicon: "Favicon" };
      toast.success(`${labels[type]} enviado com sucesso!`);
    } catch (err: any) {
      toast.error(`Erro ao enviar: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAsset = async (type: "logo" | "horizontal_logo" | "favicon") => {
    const field = type === "logo" ? "logo_url" : type === "horizontal_logo" ? "horizontal_logo_url" : "favicon_url";
    update(field as keyof StoreSettings, "");
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const { id, ...values } = form as StoreSettings;
    mutation.mutate(values);
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Store className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Configurações da Loja</h1>
      </div>

      <form onSubmit={handleSave} className="max-w-2xl space-y-6">
        {/* Dados da Loja */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Dados da Loja</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Nome da Loja</Label>
              <Input value={form.store_name || ""} onChange={(e) => update("store_name", e.target.value)} />
            </div>
            <div>
              <Label>CNPJ</Label>
              <Input placeholder="00.000.000/0000-00" value={form.cnpj || ""} onChange={(e) => update("cnpj", e.target.value)} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={form.email || ""} onChange={(e) => update("email", e.target.value)} />
            </div>
            <div>
              <Label>Telefone Padrão / Vendas</Label>
              <Input placeholder="(11) 99999-9999" value={form.whatsapp || ""} onChange={(e) => update("whatsapp", e.target.value)} />
            </div>
            <div>
              <Label>Telefone de Suporte / WhatsApp</Label>
              <Input placeholder="(11) 98888-8888" value={(form as any).whatsapp_support || ""} onChange={(e) => update("whatsapp_support" as any, e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Usado no botão "Fale Conosco" e suporte via WhatsApp</p>
            </div>
            <div>
              <Label>Nome da Empresa (Divulgação)</Label>
              <Input placeholder="Ex: D7 Pharma" value={(form as any).display_name || ""} onChange={(e) => update("display_name" as any, e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Nome usado em comunicações e templates WhatsApp</p>
            </div>
            <div>
              <Label>Nome da Atendente Principal</Label>
              <Input placeholder="Ex: Ana" value={(form as any).attendant_name || ""} onChange={(e) => update("attendant_name" as any, e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Nome usado como atendente nos templates WhatsApp</p>
            </div>
          </div>
        </div>

        {/* Logo e Favicon */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Image className="h-5 w-5" /> Logo, Logo Horizontal e Favicon</h2>
          <p className="text-xs text-muted-foreground">A <strong>Logo Principal</strong> é usada no favicon e em formatos quadrados. A <strong>Logo Horizontal</strong> aparece no topo do site (tamanho ideal: 480×120px, proporção 4:1 — será recortada automaticamente).</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Logo Upload */}
            <div className="space-y-2">
              <Label>Logo</Label>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file, "logo");
                  e.target.value = "";
                }}
              />
              {form.logo_url ? (
                <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-muted/30">
                  <img src={form.logo_url} alt="Logo" className="h-14 object-contain" />
                  <div className="flex flex-wrap gap-2 ml-auto">
                    <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                      {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      Trocar
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => handleRemoveLogoBg("logo")} disabled={removingLogoBg === "logo"}>
                      {removingLogoBg === "logo" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eraser className="h-4 w-4" />}
                      {removingLogoBg === "logo" ? "Processando..." : "Remover Fundo"}
                    </Button>
                    <Button type="button" variant="destructive" size="sm" onClick={() => handleRemoveAsset("logo")}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button type="button" variant="outline" className="w-full gap-2" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                  {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Enviar Logo
                </Button>
              )}
            </div>
            {/* Horizontal Logo Upload */}
            <div className="space-y-2">
              <Label>Logo Horizontal <span className="text-xs text-muted-foreground">(topo do site)</span></Label>
              <input
                ref={horizontalLogoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleHorizontalLogoFile(file);
                  e.target.value = "";
                }}
              />
              {form.horizontal_logo_url ? (
                <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-muted/30">
                  <img src={form.horizontal_logo_url} alt="Logo Horizontal" className="h-10 max-w-[160px] object-contain" />
                  <div className="flex flex-wrap gap-2 ml-auto">
                    <Button type="button" variant="outline" size="sm" onClick={() => horizontalLogoInputRef.current?.click()} disabled={uploadingHorizontalLogo}>
                      {uploadingHorizontalLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      Trocar
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => handleRemoveLogoBg("horizontal_logo")} disabled={removingLogoBg === "horizontal_logo"}>
                      {removingLogoBg === "horizontal_logo" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eraser className="h-4 w-4" />}
                      {removingLogoBg === "horizontal_logo" ? "Processando..." : "Remover Fundo"}
                    </Button>
                    <Button type="button" variant="destructive" size="sm" onClick={() => handleRemoveAsset("horizontal_logo")}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button type="button" variant="outline" className="w-full gap-2" onClick={() => horizontalLogoInputRef.current?.click()} disabled={uploadingHorizontalLogo}>
                  {uploadingHorizontalLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Enviar Logo Horizontal
                </Button>
              )}
            </div>
            {/* Favicon Upload */}
            <div className="space-y-2">
              <Label>Favicon</Label>
              <input
                ref={faviconInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/x-icon,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file, "favicon");
                  e.target.value = "";
                }}
              />
              {form.favicon_url ? (
                <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-muted/30">
                  <img src={form.favicon_url} alt="Favicon" className="h-10 w-10 object-contain" />
                  <span className="text-xs text-muted-foreground">Favicon atual</span>
                  <div className="flex gap-2 ml-auto">
                    <Button type="button" variant="outline" size="sm" onClick={() => faviconInputRef.current?.click()} disabled={uploadingFavicon}>
                      {uploadingFavicon ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      Trocar
                    </Button>
                    <Button type="button" variant="destructive" size="sm" onClick={() => handleRemoveAsset("favicon")}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button type="button" variant="outline" className="w-full gap-2" onClick={() => faviconInputRef.current?.click()} disabled={uploadingFavicon}>
                  {uploadingFavicon ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Enviar Favicon
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">A logo aparece no cabeçalho do site. O favicon é o ícone que aparece na aba do navegador. Formatos aceitos: PNG, JPG, SVG, WebP.</p>
        </div>


        {/* Endereço */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Endereço</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>CEP</Label>
              <Input value={form.address_cep || ""} onChange={(e) => update("address_cep", e.target.value)} />
            </div>
            <div>
              <Label>Rua</Label>
              <Input value={form.address_street || ""} onChange={(e) => update("address_street", e.target.value)} />
            </div>
            <div>
              <Label>Número</Label>
              <Input value={form.address_number || ""} onChange={(e) => update("address_number", e.target.value)} />
            </div>
            <div>
              <Label>Complemento</Label>
              <Input value={form.address_complement || ""} onChange={(e) => update("address_complement", e.target.value)} />
            </div>
            <div>
              <Label>Bairro</Label>
              <Input value={form.address_neighborhood || ""} onChange={(e) => update("address_neighborhood", e.target.value)} />
            </div>
            <div>
              <Label>Cidade</Label>
              <Input value={form.address_city || ""} onChange={(e) => update("address_city", e.target.value)} />
            </div>
            <div>
              <Label>Estado</Label>
              <Input value={form.address_state || ""} onChange={(e) => update("address_state", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Redes Sociais */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Instagram className="h-5 w-5" /> Redes Sociais</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="flex items-center gap-2">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C16.67.014 16.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                Instagram
              </Label>
              <Input placeholder="https://instagram.com/d7pharma" value={form.instagram || ""} onChange={(e) => update("instagram", e.target.value)} />
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                Facebook
              </Label>
              <Input placeholder="https://facebook.com/d7pharma" value={form.facebook || ""} onChange={(e) => update("facebook", e.target.value)} />
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61.01 3.91.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                TikTok
              </Label>
              <Input placeholder="https://tiktok.com/@d7pharma" value={form.tiktok || ""} onChange={(e) => update("tiktok", e.target.value)} />
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                YouTube
              </Label>
              <Input placeholder="https://youtube.com/@d7pharma" value={form.youtube || ""} onChange={(e) => update("youtube", e.target.value)} />
            </div>
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
        <Button type="submit" size="lg" disabled={mutation.isPending} className="gap-2">
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar Configurações
        </Button>
      </form>

      <CropImageDialog
        open={cropOpen}
        onOpenChange={setCropOpen}
        imageUrl={cropImageUrl}
        onCropComplete={handleCropComplete}
        aspect={4}
      />
    </div>
  );
}
