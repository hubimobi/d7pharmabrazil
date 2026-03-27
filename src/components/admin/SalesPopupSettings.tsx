import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Bell, Save, Loader2, Plus, Trash2 } from "lucide-react";
import type { StoreSettings } from "@/hooks/useStoreSettings";

interface CustomEntry {
  customer_name: string;
  product_name: string;
  city: string;
}

interface Props {
  settings: StoreSettings | undefined;
}

export function SalesPopupSettings({ settings }: Props) {
  const qc = useQueryClient();

  const [enabled, setEnabled] = useState(settings?.sales_popup_enabled ?? true);
  const [position, setPosition] = useState(settings?.sales_popup_position || "bottom-left");
  const [buttonColor, setButtonColor] = useState(settings?.sales_popup_button_color || "#f97316");
  const [intervalMin, setIntervalMin] = useState(settings?.sales_popup_interval_min ?? 10);
  const [intervalMax, setIntervalMax] = useState(settings?.sales_popup_interval_max ?? 15);
  const [burstCount, setBurstCount] = useState(settings?.sales_popup_burst_count ?? 4);
  const [includeReal, setIncludeReal] = useState(settings?.sales_popup_include_real_orders ?? true);
  const [customEntries, setCustomEntries] = useState<CustomEntry[]>(
    (settings?.sales_popup_custom_entries as any as CustomEntry[]) || []
  );

  const mutation = useMutation({
    mutationFn: async () => {
      if (!settings?.id) return;
      const { error } = await (supabase.from("store_settings" as any) as any)
        .update({
          sales_popup_enabled: enabled,
          sales_popup_position: position,
          sales_popup_button_color: buttonColor,
          sales_popup_interval_min: intervalMin,
          sales_popup_interval_max: intervalMax,
          sales_popup_burst_count: burstCount,
          sales_popup_include_real_orders: includeReal,
          sales_popup_custom_entries: customEntries,
        })
        .eq("id", settings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Popup de vendas salvo!");
      qc.invalidateQueries({ queryKey: ["store-settings"] });
      qc.invalidateQueries({ queryKey: ["store-settings-admin"] });
    },
    onError: () => toast.error("Erro ao salvar."),
  });

  const addEntry = useCallback(() => {
    setCustomEntries((prev) => [...prev, { customer_name: "", product_name: "", city: "" }]);
  }, []);

  const updateEntry = useCallback((idx: number, field: keyof CustomEntry, value: string) => {
    setCustomEntries((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e))
    );
  }, []);

  const removeEntry = useCallback((idx: number) => {
    setCustomEntries((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="h-5 w-5" /> Popup de Vendas Recentes (Prova Social)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Ativar/Desativar */}
        <div className="flex items-center gap-3">
          <Switch checked={enabled} onCheckedChange={setEnabled} id="sales-popup-toggle" />
          <Label htmlFor="sales-popup-toggle">Popup de Vendas Ativo</Label>
        </div>

        {enabled && (
          <>
            {/* Posição */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Posição no Site</Label>
                <Select value={position} onValueChange={setPosition}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottom-left">Inferior Esquerda</SelectItem>
                    <SelectItem value="bottom-right">Inferior Direita</SelectItem>
                    <SelectItem value="top-left">Superior Esquerda</SelectItem>
                    <SelectItem value="top-right">Superior Direita</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Cor do Botão "Eu quero também"</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={buttonColor}
                    onChange={(e) => setButtonColor(e.target.value)}
                    className="h-9 w-12 rounded border border-border cursor-pointer bg-transparent"
                  />
                  <Input
                    value={buttonColor}
                    onChange={(e) => setButtonColor(e.target.value)}
                    placeholder="#f97316"
                    className="flex-1 font-mono text-xs"
                    maxLength={7}
                  />
                </div>
              </div>
            </div>

            {/* Timing */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Vendas iniciais (burst)</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={burstCount}
                  onChange={(e) => setBurstCount(Number(e.target.value))}
                />
                <p className="mt-1 text-xs text-muted-foreground">Quantidade de vendas que aparecem seguidas na primeira vez.</p>
              </div>
              <div>
                <Label>Intervalo mínimo (seg)</Label>
                <Input
                  type="number"
                  min={5}
                  max={60}
                  value={intervalMin}
                  onChange={(e) => setIntervalMin(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Intervalo máximo (seg)</Label>
                <Input
                  type="number"
                  min={5}
                  max={120}
                  value={intervalMax}
                  onChange={(e) => setIntervalMax(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Fonte de dados */}
            <div className="space-y-4 rounded-lg border border-border p-4">
              <h3 className="font-semibold text-sm">Fonte de Dados</h3>
              <div className="flex items-center gap-3">
                <Switch checked={includeReal} onCheckedChange={setIncludeReal} id="include-real-orders" />
                <Label htmlFor="include-real-orders">Incluir últimas vendas reais</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Quando ativo, o popup exibe vendas reais da loja. Os padrões cadastrados abaixo serão mesclados com as vendas reais.
              </p>
            </div>

            {/* Entradas customizadas */}
            <div className="space-y-4 rounded-lg border border-border p-4">
              <h3 className="font-semibold text-sm">Vendas Customizadas (Padrões)</h3>
              <p className="text-xs text-muted-foreground">
                Cadastre exemplos de vendas que aparecerão no popup. São mesclados com as vendas reais (se ativo).
              </p>

              {customEntries.map((entry, idx) => (
                <div key={idx} className="flex items-start gap-2 rounded-lg border border-border p-3 bg-muted/30">
                  <div className="flex-1 grid gap-2 sm:grid-cols-3">
                    <div>
                      <Label className="text-xs">Nome do Cliente</Label>
                      <Input
                        value={entry.customer_name}
                        onChange={(e) => updateEntry(idx, "customer_name", e.target.value)}
                        placeholder="Ana C."
                        maxLength={30}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Produto</Label>
                      <Input
                        value={entry.product_name}
                        onChange={(e) => updateEntry(idx, "product_name", e.target.value)}
                        placeholder="TCF-4 Premium"
                        maxLength={50}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Cidade/UF</Label>
                      <Input
                        value={entry.city}
                        onChange={(e) => updateEntry(idx, "city", e.target.value)}
                        placeholder="São Paulo/SP"
                        maxLength={30}
                      />
                    </div>
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="mt-5 shrink-0" onClick={() => removeEntry(idx)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}

              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={addEntry}>
                <Plus className="h-4 w-4" /> Adicionar Venda
              </Button>
            </div>

            {/* Preview */}
            <div className="rounded-lg border border-border p-4 bg-muted/30">
              <h3 className="font-semibold text-sm mb-3">Prévia</h3>
              <div className="inline-block rounded-2xl border border-border bg-card shadow-xl p-4 max-w-[360px]">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10">
                    <Bell className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-xs font-medium text-primary uppercase tracking-wide">Compra recente</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 rounded-xl bg-muted border border-border flex items-center justify-center text-xs text-muted-foreground">IMG</div>
                  <div>
                    <p className="text-sm"><span className="font-bold">Ana</span> <span className="text-muted-foreground">comprou</span></p>
                    <p className="text-xs text-muted-foreground">📍 São Paulo/SP</p>
                    <p className="text-sm font-semibold mt-0.5">TCF-4 Premium</p>
                  </div>
                </div>
                <button
                  className="w-full mt-3 py-2 rounded-xl text-sm font-bold text-white animate-pulse"
                  style={{ backgroundColor: buttonColor }}
                >
                  🛒 Eu quero também!
                </button>
              </div>
            </div>
          </>
        )}

        <Button onClick={() => mutation.mutate()} size="lg" className="gap-2" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar Popup de Vendas
        </Button>
      </CardContent>
    </Card>
  );
}
