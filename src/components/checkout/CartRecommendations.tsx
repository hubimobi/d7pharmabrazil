import { useProducts, Product } from "@/hooks/useProducts";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Sparkles, TrendingUp, Gift } from "lucide-react";

interface CartRecommendationsProps {
  cartItems: { product: Product; quantity: number }[];
  showOnlyUpsell?: boolean;
}

export default function CartRecommendations({ cartItems, showOnlyUpsell = false }: CartRecommendationsProps) {
  const { data: allProducts } = useProducts();
  const { addItem } = useCart();
  const cartIds = new Set(cartItems.map((i) => i.product.id));

  if (!allProducts || allProducts.length <= 1) return null;

  // Collect configured upsell product IDs from cart items
  const configuredUpsellIds = new Set<string>();
  cartItems.forEach((i) => {
    i.product.upsellProductIds?.forEach((id) => configuredUpsellIds.add(id));
  });

  // Cross-sell: prefer configured upsell products, then fallback to others
  const configuredCrossSell = allProducts.filter(
    (p) => configuredUpsellIds.has(p.id) && !cartIds.has(p.id) && p.stock > 0
  );
  const fallbackCrossSell = allProducts.filter(
    (p) => !cartIds.has(p.id) && !configuredUpsellIds.has(p.id) && p.stock > 0
  );
  const crossSell = [...configuredCrossSell, ...fallbackCrossSell].slice(0, 3);

  // Upsell: if any item has qty < 3, suggest "leve 3 pague 2" style
  const upsellItems = cartItems
    .filter((i) => i.quantity < 3)
    .slice(0, 2);

  const cartTotal = cartItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const freeShippingThreshold = 199;
  const remaining = freeShippingThreshold - cartTotal;

  return (
    <div className="w-full min-w-0 space-y-6 overflow-hidden">
      {/* Free shipping progress - only in full mode */}
      {!showOnlyUpsell && remaining > 0 && (
        <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4">
          <p className="text-sm font-medium text-foreground flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" />
            Faltam <span className="font-bold text-primary">R$ {remaining.toFixed(2).replace(".", ",")}</span> para frete grátis!
          </p>
          <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${Math.min(100, (cartTotal / freeShippingThreshold) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Upsell: quantity upgrade */}
      {upsellItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <TrendingUp className="h-4 w-4 text-primary" />
            Aproveite e economize
          </h3>
          {upsellItems.map((item) => {
            const savingsPercent = 10;
            const bulkPrice = item.product.price * 3 * (1 - savingsPercent / 100);
            return (
              <div key={item.product.id} className="flex w-full min-w-0 flex-col gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <img src={item.product.image} alt="" className="h-12 w-12 shrink-0 rounded object-contain" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground break-words">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Leve <span className="font-bold text-primary">3 unidades</span> e ganhe{" "}
                      <span className="font-bold text-success">{savingsPercent}% OFF</span>
                    </p>
                    <p className="text-xs text-muted-foreground break-words">
                      De <span className="line-through">R$ {(item.product.price * 3).toFixed(2).replace(".", ",")}</span>{" "}
                      por <span className="font-bold text-primary">R$ {bulkPrice.toFixed(2).replace(".", ",")}</span>
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="default"
                  className="w-full shrink-0 text-xs sm:w-auto"
                  onClick={() => {
                    const qtyToAdd = 3 - item.quantity;
                    if (qtyToAdd > 0) addItem(item.product, qtyToAdd);
                  }}
                >
                  Quero 3!
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Cross-sell: related products - only in full mode */}
      {!showOnlyUpsell && crossSell.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            Você também pode gostar
          </h3>
          <div className="grid gap-3">
            {crossSell.map((p) => {
              const discount = p.originalPrice > p.price
                ? Math.round((1 - p.price / p.originalPrice) * 100)
                : 0;
              return (
                <div key={p.id} className="flex w-full min-w-0 flex-col gap-3 overflow-hidden rounded-lg border border-border bg-card p-3 transition hover:border-primary/30 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <img src={p.image} alt={p.name} className="h-14 w-14 shrink-0 rounded object-contain bg-muted p-1" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground break-words">{p.name}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-primary">R$ {p.price.toFixed(2).replace(".", ",")}</span>
                      {discount > 0 && (
                        <>
                          <span className="text-xs text-muted-foreground line-through">R$ {p.originalPrice.toFixed(2).replace(".", ",")}</span>
                          <Badge variant="secondary" className="text-2xs px-1.5 py-0 bg-success/10 text-success">-{discount}%</Badge>
                        </>
                      )}
                    </div>
                  </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full shrink-0 gap-1 text-xs sm:w-auto"
                    onClick={() => addItem(p)}
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                    Adicionar
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
