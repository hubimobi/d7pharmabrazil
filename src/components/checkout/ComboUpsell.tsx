import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProducts, Product } from "@/hooks/useProducts";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, Check, Truck, TrendingUp, PartyPopper } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ComboUpsell() {
  const { data: allProducts } = useProducts();
  const { items, addCombo } = useCart();
  const [accepted, setAccepted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [savings, setSavings] = useState(0);

  const { data: comboSettings } = useQuery({
    queryKey: ["combo-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_settings" as any)
        .select("combo_offer_enabled, combo_offer_products, combo_offer_discount, combo_offer_free_shipping, combo_offer_label")
        .limit(1)
        .single();
      if (error) throw error;
      return data as any;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!comboSettings?.combo_offer_enabled || !allProducts || dismissed) return null;

  const comboProductIds: string[] = comboSettings.combo_offer_products || [];
  if (comboProductIds.length < 2) return null;

  const comboProducts = comboProductIds
    .map((id: string) => allProducts.find((p) => p.id === id))
    .filter(Boolean) as Product[];

  if (comboProducts.length < 2) return null;

  const cartIds = new Set(items.map((i) => i.product.id));
  const allInCart = comboProducts.every((p) => cartIds.has(p.id));
  if (allInCart || accepted) {
    if (accepted) {
      return (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-lg border-2 border-success bg-success/10 p-4 text-center"
          >
            <PartyPopper className="mx-auto h-8 w-8 text-success mb-2" />
            <p className="text-sm font-bold text-success">
              Perfeito! Você economizou R$ {savings.toFixed(2).replace(".", ",")} 🎉
            </p>
            <p className="text-xs text-muted-foreground mt-1">Ótima escolha! Seu combo foi adicionado.</p>
          </motion.div>
        </AnimatePresence>
      );
    }
    return null;
  }

  const discountPercent = Number(comboSettings.combo_offer_discount) || 17;
  const originalTotal = comboProducts.reduce((sum, p) => sum + p.price, 0);
  const totalSavings = originalTotal * (discountPercent / 100);

  const handleAccept = () => {
    addCombo(comboProducts, totalSavings, !!comboSettings.combo_offer_free_shipping);
    setSavings(totalSavings);
    setAccepted(true);
  };

  const discountedTotal = originalTotal - totalSavings;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border-2 border-primary bg-gradient-to-br from-primary/5 to-accent/5 p-4 sm:p-5 overflow-hidden"
    >
      <div className="flex items-center gap-2 mb-3">
        <Flame className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
          {comboSettings.combo_offer_label || "OFERTA EXCLUSIVA PARA VOCÊ"}
        </h3>
      </div>

      <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
        ⚡ Essa promoção pode aparecer apenas desta vez para você, aproveite e pague em{" "}
        <strong className="text-foreground">10X no Cartão</strong> por apenas mais{" "}
        <strong className="text-primary">R$ {(discountedTotal / 10).toFixed(2).replace(".", ",")}</strong> na parcela.
      </p>

      <p className="text-sm text-foreground mb-3">
        Leve o combo{" "}
        <strong className="break-words">{comboProducts.map((p) => p.name).join(" + ")}</strong>{" "}
        e GANHE:
      </p>

      <div className="space-y-1.5 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-success" />
          <span className="font-semibold text-foreground">{discountPercent}% OFF</span>
        </div>
        {comboSettings.combo_offer_free_shipping && (
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-success" />
            <span className="font-semibold text-foreground">Frete Grátis</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <TrendingUp className="h-4 w-4 text-success" />
          <span className="font-semibold text-foreground">Mais vendido</span>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4 overflow-x-auto pb-1">
        {comboProducts.map((p) => (
          <div key={p.id} className="flex items-center gap-2 shrink-0">
            <img src={p.image} alt={p.name} className="h-10 w-10 sm:h-12 sm:w-12 rounded object-contain bg-muted p-1" />
            <span className="text-xs font-medium text-muted-foreground truncate max-w-[70px] sm:max-w-[80px]">{p.name}</span>
          </div>
        ))}
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-xs text-muted-foreground line-through">
          R$ {originalTotal.toFixed(2).replace(".", ",")}
        </span>
        <span className="text-lg font-bold text-primary">
          R$ {discountedTotal.toFixed(2).replace(".", ",")}
        </span>
        <Badge variant="secondary" className="bg-success/10 text-success text-xs">
          -{discountPercent}%
        </Badge>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleAccept}
          className="flex-1 gap-1.5 bg-success hover:bg-success/90 text-success-foreground font-bold text-xs sm:text-sm"
          size="lg"
        >
          Quero Economizar R$ {totalSavings.toFixed(0)}
        </Button>
        <Button
          onClick={() => setDismissed(true)}
          variant="secondary"
          className="shrink-0 text-xs sm:text-sm font-medium"
          size="lg"
        >
          Não
        </Button>
      </div>

    </motion.div>
  );
}
