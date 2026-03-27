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
  const { items, addItem, setComboDiscount, setComboFreeShipping } = useCart();
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

  if (!comboSettings?.combo_offer_enabled || !allProducts) return null;

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
    // Add missing products to cart
    comboProducts.forEach((p) => {
      if (!cartIds.has(p.id)) {
        addItem(p, 1);
      }
    });
    // Apply real combo discount to cart total
    setComboDiscount(totalSavings);
    if (comboSettings.combo_offer_free_shipping) {
      setComboFreeShipping(true);
    }
    setSavings(totalSavings);
    setAccepted(true);
  };

  const discountedTotal = originalTotal - totalSavings;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border-2 border-primary bg-gradient-to-br from-primary/5 to-accent/5 p-5"
    >
      <div className="flex items-center gap-2 mb-3">
        <Flame className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
          {comboSettings.combo_offer_label || "OFERTA EXCLUSIVA PARA VOCÊ"}
        </h3>
      </div>

      <p className="text-sm text-foreground mb-3">
        Leve o combo{" "}
        <strong>{comboProducts.map((p) => p.name).join(" + ")}</strong>{" "}
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

      <div className="flex items-center gap-3 mb-4">
        {comboProducts.map((p) => (
          <div key={p.id} className="flex items-center gap-2">
            <img src={p.image} alt={p.name} className="h-12 w-12 rounded object-contain bg-muted p-1" />
            <span className="text-xs font-medium text-muted-foreground truncate max-w-[80px]">{p.name}</span>
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

      <Button
        onClick={handleAccept}
        className="w-full gap-2 bg-success hover:bg-success/90 text-success-foreground font-bold text-sm"
        size="lg"
      >
        SIM, QUERO ECONOMIZAR + R$ {totalSavings.toFixed(0)}
      </Button>
    </motion.div>
  );
}
