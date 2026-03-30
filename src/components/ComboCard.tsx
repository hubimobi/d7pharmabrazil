import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShoppingCart, Zap, Truck, Star, Package } from "lucide-react";
import CountdownTimer from "@/components/CountdownTimer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductCombo } from "@/hooks/useCombos";
import { useProducts, Product } from "@/hooks/useProducts";
import { useCart } from "@/hooks/useCart";
import { useStoreSettings } from "@/hooks/useStoreSettings";

const ComboCard = ({ combo }: { combo: ProductCombo }) => {
  const { addItem } = useCart();
  const navigate = useNavigate();
  const { data: allProducts } = useProducts();
  const { data: settings } = useStoreSettings();

  const comboProducts = combo.product_ids
    .map((id) => allProducts?.find((p) => p.id === id))
    .filter(Boolean) as Product[];

  const discountPercent = combo.original_price > 0
    ? Math.round((1 - combo.price / combo.original_price) * 100)
    : 0;

  const maxInstallments = settings?.max_installments ?? 3;
  const pixPrice = (combo.price * 0.95).toFixed(2).replace(".", ",");

  const freeShippingEnabled = settings?.free_shipping_enabled ?? false;
  const freeShippingMin = settings?.free_shipping_min_value ?? 199;
  const hasFreeShipping = freeShippingEnabled && combo.price >= freeShippingMin;

  const handleAddCombo = () => {
    comboProducts.forEach((p) => addItem(p, 1));
  };

  const handleQuickBuy = () => {
    comboProducts.forEach((p) => addItem(p, 1));
    navigate("/checkout");
  };

  // Average rating from combo products
  const avgRating = comboProducts.length > 0
    ? (comboProducts.reduce((sum, p) => sum + p.rating, 0) / comboProducts.length).toFixed(1)
    : "5.0";
  const totalReviews = comboProducts.reduce((sum, p) => sum + (p.reviews < 500 ? p.reviews + 500 : p.reviews), 0);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-card shadow-elegant transition-all duration-500 hover:shadow-elevated hover:-translate-y-1">
      {/* Discount pill */}
      {discountPercent > 0 && (
        <span className="absolute left-3 top-3 z-10 rounded-full bg-success px-2.5 py-0.5 text-[10.4px] font-bold uppercase tracking-wide text-success-foreground">
          -{discountPercent}%
        </span>
      )}
      {combo.badge && (
        <Badge className="absolute right-3 top-3 z-10 bg-secondary text-secondary-foreground text-[10.4px]">{combo.badge}</Badge>
      )}

      {/* Image — clickable link to combo detail */}
      <Link to={`/combo/${combo.slug}`} className="relative block aspect-square overflow-hidden bg-muted rounded-2xl">
        {combo.image_url ? (
          <img
            src={combo.image_url}
            alt={combo.name}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
            width={400}
            height={400}
          />
        ) : (
          <div className="h-full w-full flex flex-wrap items-center justify-center gap-1 p-4">
            {comboProducts.slice(0, 4).map((p) => (
              <img
                key={p.id}
                src={p.image}
                alt={p.name}
                className="h-[45%] w-[45%] object-contain rounded"
                loading="lazy"
              />
            ))}
            {comboProducts.length === 0 && (
              <Package className="h-12 w-12 text-muted-foreground" />
            )}
          </div>
        )}
        <div className="absolute bottom-2 left-2">
          <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary backdrop-blur-sm">
            COMBO • {combo.product_ids.length} produtos
          </Badge>
        </div>
      </Link>

      {/* Info — same structure as ProductCard */}
      <div className="flex flex-1 flex-col p-3 md:p-4">
        <div className="flex items-center gap-1">
          <Star className="h-3 w-3 md:h-3.5 md:w-3.5 fill-warning text-warning" />
          <span className="text-2xs md:text-xs font-medium">{avgRating}</span>
          <span className="text-2xs md:text-xs text-muted-foreground">({totalReviews})</span>
        </div>

        <h3 className="mt-1.5 text-xs md:text-sm font-semibold text-foreground line-clamp-2 leading-tight">
          {combo.name}
        </h3>

        {comboProducts.length > 0 && (
          <p className="mt-1 hidden md:block text-[13px] text-muted-foreground line-clamp-2">
            {comboProducts.map((p) => p.name).join(" + ")}
          </p>
        )}

        <div className="mt-auto pt-3">
          <div className="flex items-baseline gap-1.5 md:gap-2">
            <span className="text-base md:text-xl font-bold text-foreground font-display">
              R$ {combo.price.toFixed(2).replace(".", ",")}
            </span>
            {combo.original_price > combo.price && (
              <span className="text-2xs md:text-xs text-muted-foreground line-through">
                R$ {combo.original_price.toFixed(2).replace(".", ",")}
              </span>
            )}
          </div>
          <p className="text-2xs md:text-xs font-medium text-success mt-0.5">
            R$ {pixPrice} <span className="text-muted-foreground font-normal">no Pix</span>
          </p>
          <p className="hidden md:block text-xs text-muted-foreground mt-0.5">
            Parcele em até {maxInstallments}x sem juros de R$ {(combo.price / maxInstallments).toFixed(2).replace(".", ",")}
          </p>

          {hasFreeShipping && (
            <span className="mt-1 inline-flex items-center gap-1 text-2xs md:text-xs font-semibold text-success">
              <Truck className="h-3 w-3" /> Frete Grátis
            </span>
          )}

          <CountdownTimer label="Oferta expira em" className="mt-2" />

          <div className="mt-3 flex flex-col gap-1.5">
            <Button
              className="w-full gap-1.5 text-[11.2px] uppercase tracking-wide font-semibold rounded-full"
              size="sm"
              onClick={handleAddCombo}
            >
              <ShoppingCart className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="md:hidden">Comprar</span>
              <span className="hidden md:inline">Adicionar ao Carrinho</span>
            </Button>
            <Button
              className="hidden md:flex w-full gap-1.5 bg-success hover:bg-success/90 text-success-foreground rounded-full text-[11.2px] uppercase tracking-wide font-semibold"
              size="sm"
              onClick={handleQuickBuy}
            >
              <Zap className="h-4 w-4" />
              Compra Rápida
            </Button>
          </div>
          <p className="mt-2 text-center text-2xs md:text-xs text-muted-foreground font-medium">📦 Envio em até 24h úteis</p>
        </div>
      </div>
    </div>
  );
};

export default ComboCard;
