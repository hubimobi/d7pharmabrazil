import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Star, ShoppingCart, Zap } from "lucide-react";
import CountdownTimer from "@/components/CountdownTimer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Product } from "@/hooks/useProducts";
import { useCart } from "@/hooks/useCart";
import UpsellDialog from "@/components/UpsellDialog";

const ProductCard = ({ product }: { product: Product }) => {
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [showUpsell, setShowUpsell] = useState(false);
  const discountPercent = Math.round((1 - product.price / product.originalPrice) * 100);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      {product.badge && (
        <Badge className="absolute left-3 top-3 z-10 bg-secondary text-secondary-foreground">{product.badge}</Badge>
      )}
      {product.stock <= 10 && (
        <span className="absolute right-3 top-3 z-10 animate-pulse-soft rounded bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground">
          Últimas {product.stock} unidades!
        </span>
      )}
      <Link to={`/produto/${product.slug}`} className="overflow-hidden bg-muted p-6">
        <img
          src={product.image}
          alt={product.name}
          className="mx-auto h-48 w-48 object-contain transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          width={192}
          height={192}
        />
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-1">
          <Star className="h-3.5 w-3.5 fill-warning text-warning" />
              <span className="text-xs font-medium">{product.rating}</span>
            <span className="text-xs text-muted-foreground">({product.reviews < 500 ? product.reviews + 500 : product.reviews})</span>
        </div>
        <Link to={`/produto/${product.slug}`}>
          <h3 className="mt-1 text-sm font-semibold text-foreground line-clamp-2">{product.name}</h3>
        </Link>
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{product.shortDescription}</p>
        <div className="mt-auto pt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-primary">
              R$ {product.price.toFixed(2).replace(".", ",")}
            </span>
            <span className="text-xs text-muted-foreground line-through">
              R$ {product.originalPrice.toFixed(2).replace(".", ",")}
            </span>
            <span className="text-xs font-semibold text-success">-{discountPercent}%</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            ou até {product.price >= 500 ? "12" : product.price >= 200 ? "6" : "3"}x de R$ {(product.price / (product.price >= 500 ? 12 : product.price >= 200 ? 6 : 3)).toFixed(2).replace(".", ",")}
          </p>
          {product.showCountdown && <CountdownTimer label="Oferta expira em" className="mt-2" />}
          <div className="mt-2 flex gap-2">
            <Button
              className="flex-1 gap-1"
              size="sm"
              onClick={() => {
                addItem(product);
                setShowUpsell(true);
              }}
            >
              <ShoppingCart className="h-4 w-4" />
              Adicionar ao Carrinho
            </Button>
            <Button
              className="flex-1 gap-1 bg-success hover:bg-success/90 text-success-foreground"
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
