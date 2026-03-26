import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, Download, Trash2, Loader2, Eye, EyeOff } from "lucide-react";
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

  // Load settings
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

  // Load leads
  const { data: leads, isLoading: loadingLeads } = useQuery({
    queryKey: ["popup-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("popup_leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
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
      toast.success("Configurações do popup salvas!");
      queryClient.invalidateQueries({ queryKey: ["store-settings"] });
      queryClient.invalidateQueries({ queryKey: ["store-settings-admin"] });
    },
    onError: () => toast.error("Erro ao salvar."),
  });

  const handleSave = () => {
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

  const update = (field: keyof StoreSettings, value: any) =>
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));

  const exportCSV = () => {
    if (!leads?.length) return;
    const rows = [
      ["Nome", "E-mail", "Fonte", "Data"],
      ...leads.map((l) => [
        l.name || "",
        l.email,
        l.source || "",
        new Date(l.created_at || "").toLocaleDateString("pt-BR"),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads-popup.csv";
    a.click();
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
        <h1 className="text-2xl font-bold">PopUps & Leads</h1>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Popup Config */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Configuração do PopUp</h2>
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

            <Button onClick={handleSave} disabled={mutation.isPending} className="gap-2">
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Salvar Configurações
            </Button>
          </CardContent>
        </Card>

        {/* Leads List */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Leads Capturados ({leads?.length || 0})</h2>
              {(leads?.length || 0) > 0 && (
                <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
                  <Download className="h-4 w-4" />
                  Exportar CSV
                </Button>
              )}
            </div>

            {loadingLeads ? (
              <div className="py-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : !leads?.length ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhum lead capturado ainda. Ative o popup para começar a coletar.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 font-medium">Nome</th>
                      <th className="text-left py-2 font-medium">E-mail</th>
                      <th className="text-left py-2 font-medium">Fonte</th>
                      <th className="text-left py-2 font-medium">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead.id} className="border-b border-border/50">
                        <td className="py-2">{lead.name || "—"}</td>
                        <td className="py-2">{lead.email}</td>
                        <td className="py-2 text-muted-foreground">{lead.source || "popup"}</td>
                        <td className="py-2 text-muted-foreground">
                          {new Date(lead.created_at || "").toLocaleDateString("pt-BR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
