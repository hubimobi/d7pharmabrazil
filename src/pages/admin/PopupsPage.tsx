import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, Loader2, Eye, EyeOff, Bell, Upload, Crop, Eraser, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { StoreSettings } from "@/hooks/useStoreSettings";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { SalesPopupSettings } from "@/components/admin/SalesPopupSettings";
import { CropImageDialog } from "@/components/admin/CropImageDialog";
import { useTenant } from "@/hooks/useTenant";
import { tenantPath } from "@/lib/tenantStorage";

export default function PopupsPage() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  const { data: storeSettings } = useStoreSettings();

  const { data: settings, isLoading: loadingSettings } = useQuery({
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

  const [form, setForm] = useState<Partial<StoreSettings> | null>(null);
  const [cropDialog, setCropDialog] = useState<{ imageUrl: string } | null>(null);
  const [removingBg, setRemovingBg] = useState(false);
  const [uploading, setUploading] = useState(false);

  if (settings && !form) {
    setForm({ ...settings });
  }

  const mutation = useMutation({
    mutationFn: async (values: Partial<StoreSettings>) => {
      const { error } = await (supabase.from("store_settings" as any) as any)
        .update(values)
        .eq("id", settings!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configurações salvas!");
      queryClient.invalidateQueries({ queryKey: ["store-settings"] });
      queryClient.invalidateQueries({ queryKey: ["store-settings-admin"] });
    },
    onError: () => toast.error("Erro ao salvar."),
  });

  const update = (field: keyof StoreSettings, value: any) =>
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));

  const handleSaveNotification = () => {
    if (!form) return;
    mutation.mutate({
      notification_bar_enabled: form.notification_bar_enabled,
      notification_bar_text: form.notification_bar_text,
      notification_bar_bg_color: form.notification_bar_bg_color,
      notification_bar_text_color: form.notification_bar_text_color,
    });
  };

  const handleSavePopup = () => {
    if (!form) return;
    mutation.mutate({
      popup_banner_enabled: form.popup_banner_enabled,
      popup_banner_title: form.popup_banner_title,
      popup_banner_description: form.popup_banner_description,
      popup_banner_image_url: form.popup_banner_image_url,
      popup_banner_cta_text: form.popup_banner_cta_text,
      popup_banner_collect_email: form.popup_banner_collect_email,
      popup_banner_delay_seconds: form.popup_banner_delay_seconds,
      popup_banner_reappear_hours: form.popup_banner_reappear_hours,
    });
  };

  // Image upload
  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const filePath = tenantPath(tenantId, `popup-banner.${ext}`);
      await supabase.storage.from("store-assets").remove([filePath]);
      const { error } = await supabase.storage.from("store-assets").upload(filePath, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("store-assets").getPublicUrl(filePath);
      update("popup_banner_image_url", urlData.publicUrl + "?t=" + Date.now());
      toast.success("Imagem enviada!");
    } catch (err: any) {
      toast.error("Erro ao enviar imagem: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Crop complete
  const handleCropComplete = useCallback(async (blob: Blob) => {
    try {
      const filePath = tenantPath(tenantId, `popup-banner-cropped.png`);
      await supabase.storage.from("store-assets").remove([filePath]);
      const { error } = await supabase.storage.from("store-assets").upload(filePath, blob, { upsert: true, contentType: "image/png" });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("store-assets").getPublicUrl(filePath);
      update("popup_banner_image_url", urlData.publicUrl + "?t=" + Date.now());
      toast.success("Imagem recortada com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao salvar recorte: " + err.message);
    }
  }, []);

  // Remove background
  const handleRemoveBg = useCallback(async (imageUrl: string) => {
    setRemovingBg(true);
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

      const filePath = tenantPath(tenantId, `popup-banner-nobg.png`);
      await supabase.storage.from("store-assets").remove([filePath]);
      const { error: uploadError } = await supabase.storage.from("store-assets").upload(filePath, blob, { upsert: true, contentType: "image/png" });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("store-assets").getPublicUrl(filePath);
      update("popup_banner_image_url", urlData.publicUrl + "?t=" + Date.now());
      toast.success("Fundo removido com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao remover fundo: " + err.message);
    } finally {
      setRemovingBg(false);
    }
  }, []);

  if (loadingSettings || !form) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">PopUps & Barra</h2>
        <p className="text-sm text-muted-foreground mt-1">Configure popups e barra de notificação da loja</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Barra de Notificação */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Bell className="h-5 w-5" /> Barra de Notificação (Topo)
              </h2>
              <div className="flex items-center gap-2">
                {form.notification_bar_enabled ? (
                  <Eye className="h-4 w-4 text-primary" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
                <Switch
                  checked={form.notification_bar_enabled ?? false}
                  onCheckedChange={(v) => update("notification_bar_enabled", v)}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Barra fixa no topo do site para avisos rápidos como frete grátis, cupons ou promoções relâmpago.
            </p>

            {form.notification_bar_enabled && (
              <div className="space-y-4">
                <div>
                  <Label>Texto da Notificação</Label>
                  <Input
                    value={form.notification_bar_text || ""}
                    onChange={(e) => update("notification_bar_text", e.target.value)}
                    placeholder="🚚 Frete Grátis para compras acima de R$ 499!"
                    maxLength={200}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Cor de Fundo</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={form.notification_bar_bg_color || "#1a1a2e"}
                        onChange={(e) => update("notification_bar_bg_color", e.target.value)}
                        className="h-10 w-10 rounded border border-border cursor-pointer"
                      />
                      <Input
                        value={form.notification_bar_bg_color || "#1a1a2e"}
                        onChange={(e) => update("notification_bar_bg_color", e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Cor do Texto</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={form.notification_bar_text_color || "#ffffff"}
                        onChange={(e) => update("notification_bar_text_color", e.target.value)}
                        className="h-10 w-10 rounded border border-border cursor-pointer"
                      />
                      <Input
                        value={form.notification_bar_text_color || "#ffffff"}
                        onChange={(e) => update("notification_bar_text_color", e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
                <div
                  className="rounded-md px-4 py-2 text-sm font-medium text-center"
                  style={{
                    backgroundColor: form.notification_bar_bg_color || "#1a1a2e",
                    color: form.notification_bar_text_color || "#ffffff",
                  }}
                >
                  {form.notification_bar_text || "Preview da barra de notificação"}
                </div>
              </div>
            )}

            <Button onClick={handleSaveNotification} disabled={mutation.isPending} className="gap-2">
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Salvar Barra de Notificação
            </Button>
          </CardContent>
        </Card>

        {/* Popup Banner Config */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Megaphone className="h-5 w-5" /> Banner PopUp (Hero)
              </h2>
              <div className="flex items-center gap-2">
                {form.popup_banner_enabled ? (
                  <Eye className="h-4 w-4 text-primary" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
                <Switch
                  checked={form.popup_banner_enabled ?? false}
                  onCheckedChange={(v) => update("popup_banner_enabled", v)}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Banner grande para destacar promoções ou capturar e-mails. Os cadastros são salvos no painel e enviados para o GHL.
            </p>

            {form.popup_banner_enabled && (
              <div className="space-y-4">
                <div>
                  <Label>Título</Label>
                  <Input
                    value={form.popup_banner_title || ""}
                    onChange={(e) => update("popup_banner_title", e.target.value)}
                    placeholder="🎉 Promoção Especial!"
                    maxLength={100}
                  />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    rows={3}
                    value={form.popup_banner_description || ""}
                    onChange={(e) => update("popup_banner_description", e.target.value)}
                    placeholder="Cadastre-se e receba cupons exclusivos."
                    maxLength={300}
                  />
                </div>

                {/* Image Upload Section */}
                <div>
                  <Label>Imagem</Label>
                  <div className="mt-1">
                    <Input
                      type="file"
                      accept="image/*"
                      disabled={uploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleImageUpload(f);
                      }}
                    />
                  </div>
                  <div className="mt-2">
                    <Label className="text-xs text-muted-foreground">Ou cole a URL da imagem</Label>
                    <Input
                      value={form.popup_banner_image_url || ""}
                      onChange={(e) => update("popup_banner_image_url", e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                  {form.popup_banner_image_url && (
                    <div className="mt-3 space-y-2">
                      <img
                        src={form.popup_banner_image_url}
                        alt="Preview"
                        className="h-24 w-24 object-contain rounded-2xl border"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => setCropDialog({ imageUrl: form.popup_banner_image_url! })}
                        >
                          <Crop className="h-4 w-4" /> Recortar
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => handleRemoveBg(form.popup_banner_image_url!)}
                          disabled={removingBg}
                        >
                          {removingBg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eraser className="h-4 w-4" />}
                          {removingBg ? "Processando..." : "Remover Fundo"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1 text-destructive hover:text-destructive"
                          onClick={() => update("popup_banner_image_url", "")}
                        >
                          <Trash2 className="h-4 w-4" /> Remover
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label>Texto do Botão</Label>
                    <Input
                      value={form.popup_banner_cta_text || "Cadastre-se"}
                      onChange={(e) => update("popup_banner_cta_text", e.target.value)}
                      maxLength={30}
                    />
                  </div>
                  <div>
                    <Label>Delay (segundos)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.popup_banner_delay_seconds ?? 5}
                      onChange={(e) => update("popup_banner_delay_seconds", Number(e.target.value))}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Reaparecer após (horas)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.popup_banner_reappear_hours ?? 24}
                      onChange={(e) => update("popup_banner_reappear_hours", Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">Tempo mínimo antes do popup reaparecer após ser fechado</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Coletar E-mail</Label>
                    <Switch
                      checked={form.popup_banner_collect_email ?? true}
                      onCheckedChange={(v) => update("popup_banner_collect_email", v)}
                    />
                  </div>
                </div>
              </div>
            )}

            <Button onClick={handleSavePopup} disabled={mutation.isPending} className="gap-2">
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Salvar PopUp
            </Button>
          </CardContent>
        </Card>

        {/* Popup de Vendas Recentes (Prova Social) */}
        <SalesPopupSettings settings={storeSettings} />

      </div>

      {cropDialog && (
        <CropImageDialog
          open={!!cropDialog}
          onOpenChange={(open) => { if (!open) setCropDialog(null); }}
          imageUrl={cropDialog.imageUrl}
          onCropComplete={(blob) => {
            handleCropComplete(blob);
            setCropDialog(null);
          }}
        />
      )}
    </div>
  );
}
