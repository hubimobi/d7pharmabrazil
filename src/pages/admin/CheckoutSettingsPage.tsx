import { useState, useEffect } from "react";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import UnsavedChangesDialog from "@/components/admin/UnsavedChangesDialog";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useProducts } from "@/hooks/useProducts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, Loader2, ShoppingCart, MessageSquareQuote, Flame, Gift, Truck, Sparkles, BarChart3, CreditCard, Layout } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CheckoutSettingsPage() {
  const { data: settings } = useStoreSettings();
  const { data: allProducts } = useProducts();
  const qc = useQueryClient();
  const unsaved = useUnsavedChangesGuard();

  const [showTestimonials, setShowTestimonials] = useState(true);
  const [showUrgency, setShowUrgency] = useState(true);
  const [showCombo, setShowCombo] = useState(true);
  const [showRecommendations, setShowRecommendations] = useState(true);
  const [showMotivation, setShowMotivation] = useState(true);
  const [showFreeShippingBar, setShowFreeShippingBar] = useState(true);
  const [boletoEnabled, setBoletoEnabled] = useState(false);
  const [metaPixelId, setMetaPixelId] = useState("");
  const [gtmId, setGtmId] = useState("");
  const [hotjarId, setHotjarId] = useState("");
  const [maxInstallments, setMaxInstallments] = useState(3);
  const [maxTotalInstallments, setMaxTotalInstallments] = useState(12);
  const [checkoutVersion, setCheckoutVersion] = useState("v1");

  // Frete
  const [freeShippingEnabled, setFreeShippingEnabled] = useState(false);
  const [freeShippingMinValue, setFreeShippingMinValue] = useState(499);
  const [freeShippingRegions, setFreeShippingRegions] = useState("all");

  // Combo
  const [comboEnabled, setComboEnabled] = useState(false);
  const [comboLabel, setComboLabel] = useState("OFERTA EXCLUSIVA PARA VOCÊ");
  const [comboProducts, setComboProducts] = useState<string[]>([]);
  const [comboDiscount, setComboDiscount] = useState(17);
  const [comboFreeShipping, setComboFreeShipping] = useState(true);

  useEffect(() => {
    if (!settings) return;
    const s = settings as any;
    setShowTestimonials(s.checkout_show_testimonials ?? true);
    setShowUrgency(s.checkout_show_urgency ?? true);
    setShowCombo(s.checkout_show_combo ?? true);
    setShowRecommendations(s.checkout_show_recommendations ?? true);
    setShowMotivation(s.checkout_show_motivation ?? true);
    setShowFreeShippingBar(s.checkout_show_free_shipping_bar ?? true);
    setBoletoEnabled(s.checkout_boleto_enabled ?? false);
    setMetaPixelId(s.meta_pixel_id || "");
    setGtmId(s.gtm_id || "");
    setHotjarId(s.hotjar_id || "");
    setMaxInstallments(s.max_installments ?? 3);
    setMaxTotalInstallments(s.max_total_installments ?? 12);
    setCheckoutVersion(s.checkout_version || "v1");

    setFreeShippingEnabled(s.free_shipping_enabled ?? false);
    setFreeShippingMinValue(s.free_shipping_min_value ?? 499);
    setFreeShippingRegions(s.free_shipping_regions || "all");

    setComboEnabled(s.combo_offer_enabled ?? false);
    setComboLabel(s.combo_offer_label || "OFERTA EXCLUSIVA PARA VOCÊ");
    setComboProducts(s.combo_offer_products || []);
    setComboDiscount(s.combo_offer_discount ?? 17);
    setComboFreeShipping(s.combo_offer_free_shipping ?? true);
  }, [settings]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!settings?.id) return;
      const { error } = await (supabase.from("store_settings" as any) as any)
        .update({
          checkout_show_testimonials: showTestimonials,
          checkout_show_urgency: showUrgency,
          checkout_show_combo: showCombo,
          checkout_show_recommendations: showRecommendations,
          checkout_show_motivation: showMotivation,
          checkout_show_free_shipping_bar: showFreeShippingBar,
          checkout_boleto_enabled: boletoEnabled,
          meta_pixel_id: metaPixelId,
          gtm_id: gtmId,
          hotjar_id: hotjarId,
          max_installments: maxInstallments,
          max_total_installments: maxTotalInstallments,
          free_shipping_enabled: freeShippingEnabled,
          free_shipping_min_value: freeShippingMinValue,
          free_shipping_regions: freeShippingRegions,
          combo_offer_enabled: comboEnabled,
          combo_offer_label: comboLabel,
          combo_offer_products: comboProducts,
          combo_offer_discount: comboDiscount,
          combo_offer_free_shipping: comboFreeShipping,
          checkout_version: checkoutVersion,
        })
        .eq("id", settings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configurações do checkout salvas!");
      qc.invalidateQueries({ queryKey: ["store-settings"] });
      qc.invalidateQueries({ queryKey: ["store-settings-admin"] });
    },
    onError: () => toast.error("Erro ao salvar."),
  });

  const toggles = [
    { label: "Depoimentos nos Produtos", desc: "Mostra depoimentos do produto abaixo do preço no carrinho", icon: MessageSquareQuote, value: showTestimonials, set: setShowTestimonials },
    { label: "Urgência e Prova Social", desc: "Alta demanda, visualizações em tempo real, compradores este mês", icon: Flame, value: showUrgency, set: setShowUrgency },
    { label: "Oferta Combo (Upsell)", desc: "Oferta exclusiva de combo com desconto e frete grátis", icon: Gift, value: showCombo, set: setShowCombo },
    { label: "Produtos Recomendados", desc: "Seção 'Você também pode gostar' na sidebar", icon: ShoppingCart, value: showRecommendations, set: setShowRecommendations },
    { label: "Mensagem Motivacional", desc: "Texto rotativo de benefícios ao lado dos passos do checkout", icon: Sparkles, value: showMotivation, set: setShowMotivation },
    { label: "Barra de Frete Grátis", desc: "Barra de progresso mostrando quanto falta para frete grátis", icon: Truck, value: showFreeShippingBar, set: setShowFreeShippingBar },
    { label: "Boleto Bancário", desc: "Habilitar pagamento por boleto bancário no checkout", icon: CreditCard, value: boletoEnabled, set: setBoletoEnabled },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Checkout Inteligente</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure frete, combo, conversão e rastreamento do checkout.</p>
      </div>

      {/* Versão do Checkout */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Layout className="h-5 w-5" /> Versão do Checkout
          </CardTitle>
          <CardDescription>Escolha qual layout de checkout será exibido para os clientes.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { value: "v1", label: "Checkout 1 — Padrão", desc: "Layout completo com carrinho, combos, depoimentos, urgência e recomendações." },
              { value: "v2", label: "Checkout 2 — Multi-etapas", desc: "Fluxo em 4 etapas com barra de progresso, cronômetro e sidebar de resumo." },
              { value: "v3", label: "Checkout 3 — Simplificado", desc: "Página única e minimalista: produto, frete, dados e pagamento." },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCheckoutVersion(opt.value)}
                className={`rounded-xl border-2 p-4 text-left transition-all ${checkoutVersion === opt.value ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/30"}`}
              >
                <p className="text-sm font-bold">{opt.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
                {checkoutVersion === opt.value && (
                  <span className="mt-2 inline-block rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">Ativo</span>
                )}
              </button>
            ))}
          </div>

          {/* URL params info */}
          <div className="mt-4 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/50 p-4">
            <p className="text-sm font-semibold text-foreground mb-2">🔗 Links Diretos para Checkout</p>
            <p className="text-xs text-muted-foreground mb-3">
              Use parâmetros na URL do produto para redirecionar direto ao checkout desejado. O produto é adicionado ao carrinho automaticamente.
            </p>
            <div className="space-y-1.5 text-xs font-mono bg-card rounded-md p-3 border border-border">
              <p><span className="text-primary font-bold">?ck=1</span> → Checkout 1 (Padrão)</p>
              <p><span className="text-primary font-bold">?ck=2</span> → Checkout 2 (Multi-etapas)</p>
              <p><span className="text-primary font-bold">?ck=3</span> → Checkout 3 (Simplificado)</p>
              <p><span className="text-primary font-bold">&m</span> → Força layout mobile (ex: <span className="text-muted-foreground">?ck=1&m</span>)</p>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Exemplo: <code className="bg-muted px-1.5 py-0.5 rounded text-primary">/produto/meu-produto?ck=2&m</code>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Configuração de Frete */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Truck className="h-5 w-5" /> Configuração de Frete
          </CardTitle>
          <CardDescription>Configure as regras de frete grátis para o checkout.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch checked={freeShippingEnabled} onCheckedChange={setFreeShippingEnabled} id="free-shipping-toggle" />
            <Label htmlFor="free-shipping-toggle">Frete Grátis Ativo</Label>
          </div>
          {freeShippingEnabled && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Valor Mínimo (R$)</Label>
                <Input type="number" min={0} step={0.01} value={freeShippingMinValue} onChange={(e) => setFreeShippingMinValue(Number(e.target.value))} />
                <p className="mt-1 text-xs text-muted-foreground">Pedido mínimo para ganhar frete grátis.</p>
              </div>
              <div>
                <Label>Região</Label>
                <Select value={freeShippingRegions} onValueChange={setFreeShippingRegions}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todo o Brasil</SelectItem>
                    <SelectItem value="sudeste">Sudeste</SelectItem>
                    <SelectItem value="sul">Sul</SelectItem>
                    <SelectItem value="sudeste_sul">Sudeste + Sul</SelectItem>
                    <SelectItem value="nordeste">Nordeste</SelectItem>
                    <SelectItem value="centro_oeste">Centro-Oeste</SelectItem>
                    <SelectItem value="norte">Norte</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">Regiões elegíveis para frete grátis.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Oferta Combo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Flame className="h-5 w-5" /> Oferta Combo (Checkout)
          </CardTitle>
          <CardDescription>Configure uma oferta combo que aparece no checkout para aumentar o ticket médio.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch checked={comboEnabled} onCheckedChange={setComboEnabled} id="combo-toggle" />
            <Label htmlFor="combo-toggle">Oferta Combo Ativa</Label>
          </div>
          {comboEnabled && (
            <div className="space-y-4">
              <div>
                <Label>Título da Oferta</Label>
                <Input value={comboLabel} onChange={(e) => setComboLabel(e.target.value)} maxLength={80} />
              </div>
              <div>
                <Label>Produtos do Combo (selecione pelo menos 2)</Label>
                <div className="space-y-2 mt-2">
                  {(allProducts || []).map((p) => {
                    const selected = comboProducts.includes(p.id);
                    return (
                      <label key={p.id} className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition ${selected ? "border-primary bg-primary/5" : "border-border"}`}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => {
                            setComboProducts(selected ? comboProducts.filter(id => id !== p.id) : [...comboProducts, p.id]);
                          }}
                          className="rounded"
                        />
                        <img src={p.image} alt="" className="h-10 w-10 rounded object-contain" />
                        <div className="flex-1">
                          <span className="text-sm font-medium">{p.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">R$ {p.price.toFixed(2).replace(".", ",")}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Desconto (%)</Label>
                  <Input type="number" min={1} max={50} value={comboDiscount} onChange={(e) => setComboDiscount(Number(e.target.value))} />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch checked={comboFreeShipping} onCheckedChange={setComboFreeShipping} id="combo-free-shipping" />
                  <Label htmlFor="combo-free-shipping">Frete Grátis no Combo</Label>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ferramentas de Conversão */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShoppingCart className="h-5 w-5" /> Ferramentas de Conversão
          </CardTitle>
          <CardDescription>Controle quais elementos aparecem no checkout para otimizar suas vendas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {toggles.map((t) => (
            <div key={t.label} className="flex items-start gap-4 rounded-lg border border-border p-4">
              <t.icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="flex-1">
                <Label className="text-sm font-semibold">{t.label}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
              </div>
              <Switch checked={t.value} onCheckedChange={t.set} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Parcelamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5" /> Parcelamento
          </CardTitle>
          <CardDescription>Configure as parcelas sem juros e o parcelamento máximo com juros (integra com Asaas).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="whitespace-nowrap">Parcelas sem juros</Label>
              <Select value={String(maxInstallments)} onValueChange={(v) => setMaxInstallments(Number(v))}>
                <SelectTrigger className="w-full mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Exibido como "até Xx sem juros" nos cards de produto.</p>
            </div>
            <div>
              <Label className="whitespace-nowrap">Parcelamento máximo (com juros)</Label>
              <Select value={String(maxTotalInstallments)} onValueChange={(v) => setMaxTotalInstallments(Number(v))}>
                <SelectTrigger className="w-full mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Quantidade máxima de parcelas no cartão (parcelas acima de "sem juros" terão juros aplicados).</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            💡 Exemplo: Se configurar 3x sem juros e máximo 12x, o cliente verá 3x sem juros + 4x a 12x com juros. Este parâmetro é enviado ao Asaas na criação do pagamento.
          </p>
        </CardContent>
      </Card>

      {/* Rastreamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5" /> Rastreamento e Analytics
          </CardTitle>
          <CardDescription>Configure os pixels de rastreamento para medir conversões.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Meta Pixel ID (Facebook/Instagram)</Label>
            <Input value={metaPixelId} onChange={(e) => setMetaPixelId(e.target.value)} placeholder="Ex: 123456789012345" className="mt-1 font-mono text-sm" />
            <p className="text-xs text-muted-foreground mt-1">
              Encontre seu Pixel ID em{" "}
              <a href="https://business.facebook.com/events_manager" target="_blank" rel="noopener noreferrer" className="text-primary underline">Meta Events Manager</a>
            </p>
          </div>
          <div>
            <Label>Google Tag Manager ID</Label>
            <Input value={gtmId} onChange={(e) => setGtmId(e.target.value)} placeholder="Ex: GTM-XXXXXXX" className="mt-1 font-mono text-sm" />
            <p className="text-xs text-muted-foreground mt-1">
              Encontre seu GTM ID em{" "}
              <a href="https://tagmanager.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google Tag Manager</a>
            </p>
          </div>
          <div>
            <Label>Hotjar Site ID</Label>
            <Input value={hotjarId} onChange={(e) => setHotjarId(e.target.value)} placeholder="Ex: 1234567" className="mt-1 font-mono text-sm" />
            <p className="text-xs text-muted-foreground mt-1">
              Encontre seu Site ID em{" "}
              <a href="https://insights.hotjar.com/settings/sites" target="_blank" rel="noopener noreferrer" className="text-primary underline">Hotjar → Settings → Sites</a>
              {" "}— mapa de calor, gravações e insights de comportamento.
            </p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={() => mutation.mutate()} size="lg" className="gap-2" disabled={mutation.isPending}>
        {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Salvar Configurações
      </Button>
    </div>
  );
}
