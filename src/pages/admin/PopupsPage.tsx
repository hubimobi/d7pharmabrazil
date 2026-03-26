import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, Loader2, Eye, EyeOff, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { StoreSettings } from "@/hooks/useStoreSettings";

export default function PopupsPage() {
  const queryClient = useQueryClient();

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
    });
  };




  if (loadingSettings || !form) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Megaphone className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">PopUps & Barra</h1>
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
                <div>
                  <Label>URL da Imagem (opcional)</Label>
                  <Input
                    value={form.popup_banner_image_url || ""}
                    onChange={(e) => update("popup_banner_image_url", e.target.value)}
                    placeholder="https://..."
                  />
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


      </div>
    </div>
  );
}
