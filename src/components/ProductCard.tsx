import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Star, ShoppingCart, Zap, Truck } from "lucide-react";
import CountdownTimer from "@/components/CountdownTimer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Product } from "@/hooks/useProducts";
import { useCart } from "@/hooks/useCart";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import UpsellDialog from "@/components/UpsellDialog";

const ProductCard = ({ product }: { product: Product }) => {
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [showUpsell, setShowUpsell] = useState(false);
  const { data: settings } = useStoreSettings();
  const discountPercent = Math.round((1 - product.price / product.originalPrice) * 100);
  const pixPrice = (product.price * 0.95).toFixed(2).replace(".", ",");

  const freeShippingEnabled = settings?.free_shipping_enabled ?? false;
  const freeShippingMin = settings?.free_shipping_min_value ?? 199;
  const hasFreeShipping = freeShippingEnabled && product.price >= freeShippingMin;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl bg-card shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      {/* Discount pill */}
      {discountPercent > 0 && (
        <span className="absolute left-2 top-2 z-10 rounded-full bg-success px-2 py-0.5 text-2xs md:text-xs font-bold text-success-foreground">
          -{discountPercent}%
        </span>
      )}
      {product.badge && (
        <Badge className="absolute right-2 top-2 z-10 bg-secondary text-secondary-foreground text-2xs md:text-xs">{product.badge}</Badge>
      )}
      {product.stock <= 10 && (
         <span className="absolute right-2 top-10 z-10 animate-pulse-soft rounded-full bg-destructive px-2 py-0.5 text-2xs font-bold text-destructive-foreground">
           Últimas {product.stock}!
         </span>
      )}
      <Link to={`/produto/${product.slug}`} className="relative block aspect-square overflow-hidden bg-muted">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
          width={400}
          height={400}
        />
      </Link>
      <div className="flex flex-1 flex-col p-3 md:p-4">
        <div className="flex items-center gap-1">
          <Star className="h-3 w-3 md:h-3.5 md:w-3.5 fill-warning text-warning" />
          <span className="text-2xs md:text-xs font-medium">{product.rating}</span>
          <span className="text-2xs md:text-xs text-muted-foreground">({product.reviews < 500 ? product.reviews + 500 : product.reviews})</span>
        </div>
        <Link to={`/produto/${product.slug}`}>
          <h3 className="mt-1 text-xs md:text-sm font-semibold text-foreground line-clamp-2 leading-tight">{product.name}</h3>
        </Link>
        <p className="mt-1 hidden md:block text-[13px] text-muted-foreground line-clamp-2">{product.shortDescription}</p>
        <div className="mt-auto pt-2 md:pt-3">
          <div className="flex items-baseline gap-1.5 md:gap-2">
            <span className="text-base md:text-xl font-bold text-foreground">
              R$ {product.price.toFixed(2).replace(".", ",")}
            </span>
            <span className="text-2xs md:text-xs text-muted-foreground line-through">
              R$ {product.originalPrice.toFixed(2).replace(".", ",")}
            </span>
          </div>
          <p className="text-2xs md:text-xs font-medium text-success mt-0.5">
            R$ {pixPrice} <span className="text-muted-foreground font-normal">no Pix</span>
          </p>
          <p className="hidden md:block text-xs text-muted-foreground mt-0.5">
            ou até {product.price >= 500 ? "12" : product.price >= 200 ? "6" : "3"}x de R$ {(product.price / (product.price >= 500 ? 12 : product.price >= 200 ? 6 : 3)).toFixed(2).replace(".", ",")}
          </p>
          {hasFreeShipping && (
            <span className="mt-1 inline-flex items-center gap-1 text-2xs md:text-xs font-semibold text-success">
              <Truck className="h-3 w-3" /> Frete Grátis
            </span>
          )}
          {product.showCountdown && <CountdownTimer label="Oferta expira em" className="mt-2" />}
          <div className="mt-2 flex flex-col gap-1.5">
            <Button
              className="w-full gap-1 text-xs md:text-sm rounded-lg"
              size="sm"
              onClick={() => {
                addItem(product);
                setShowUpsell(true);
              }}
            >
              <ShoppingCart className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="md:hidden">Comprar</span>
              <span className="hidden md:inline">Adicionar ao Carrinho</span>
            </Button>
            <Button
              className="hidden md:flex w-full gap-1 bg-success hover:bg-success/90 text-success-foreground rounded-lg"
              size="sm"
              onClick={() => {
                addItem(product);
                navigate("/checkout");
              }}
            >
              <Zap className="h-4 w-4" />
              Compra Rápida
            </Button>
          </div>
        </div>
      </div>
      <UpsellDialog open={showUpsell} onOpenChange={setShowUpsell} product={product} onAddMore={(extra) => addItem(product, extra)} />
    </div>
  );
};

export default ProductCard;
