import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, Loader2, ShoppingCart, MessageSquareQuote, Flame, Gift, Truck, Sparkles, BarChart3 } from "lucide-react";

export default function CheckoutSettingsPage() {
  const { data: settings } = useStoreSettings();
  const qc = useQueryClient();

  const [showTestimonials, setShowTestimonials] = useState(true);
  const [showUrgency, setShowUrgency] = useState(true);
  const [showCombo, setShowCombo] = useState(true);
  const [showRecommendations, setShowRecommendations] = useState(true);
  const [showMotivation, setShowMotivation] = useState(true);
  const [showFreeShippingBar, setShowFreeShippingBar] = useState(true);
  const [metaPixelId, setMetaPixelId] = useState("");
  const [gtmId, setGtmId] = useState("");
  const [maxInstallments, setMaxInstallments] = useState(3);

  useEffect(() => {
    if (!settings) return;
    setShowTestimonials((settings as any).checkout_show_testimonials ?? true);
    setShowUrgency((settings as any).checkout_show_urgency ?? true);
    setShowCombo((settings as any).checkout_show_combo ?? true);
    setShowRecommendations((settings as any).checkout_show_recommendations ?? true);
    setShowMotivation((settings as any).checkout_show_motivation ?? true);
    setShowFreeShippingBar((settings as any).checkout_show_free_shipping_bar ?? true);
    setMetaPixelId((settings as any).meta_pixel_id || "");
    setGtmId((settings as any).gtm_id || "");
    setMaxInstallments((settings as any).max_installments ?? 3);
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
          meta_pixel_id: metaPixelId,
          gtm_id: gtmId,
          max_installments: maxInstallments,
        })
        .eq("id", settings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configurações do checkout salvas!");
      qc.invalidateQueries({ queryKey: ["store-settings"] });
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
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Checkout Inteligente</h1>
        <p className="text-sm text-muted-foreground mt-1">Ative ou desative as funcionalidades inteligentes do checkout de vendas.</p>
      </div>

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
            <Input
              value={metaPixelId}
              onChange={(e) => setMetaPixelId(e.target.value)}
              placeholder="Ex: 123456789012345"
              className="mt-1 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Encontre seu Pixel ID em{" "}
              <a href="https://business.facebook.com/events_manager" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                Meta Events Manager
              </a>
            </p>
          </div>
          <div>
            <Label>Google Tag Manager ID</Label>
            <Input
              value={gtmId}
              onChange={(e) => setGtmId(e.target.value)}
              placeholder="Ex: GTM-XXXXXXX"
              className="mt-1 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Encontre seu GTM ID em{" "}
              <a href="https://tagmanager.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                Google Tag Manager
              </a>
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
