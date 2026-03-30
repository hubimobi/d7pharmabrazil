import { useNavigate } from "react-router-dom";
import { ShoppingCart, Package } from "lucide-react";
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
  const installmentValue = maxInstallments > 1
    ? (combo.price / maxInstallments).toFixed(2).replace(".", ",")
    : null;

  const pixPrice = (combo.price * 0.95).toFixed(2).replace(".", ",");

  const handleAddCombo = () => {
    comboProducts.forEach((p) => {
      addItem(p, 1);
    });
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-card shadow-elegant transition-all duration-500 hover:shadow-elevated hover:-translate-y-1">
      {discountPercent > 0 && (
        <span className="absolute left-3 top-3 z-10 rounded-full bg-success px-2.5 py-0.5 text-[10.4px] font-bold uppercase tracking-wide text-success-foreground">
          -{discountPercent}%
        </span>
      )}

      {combo.badge && (
        <Badge className="absolute right-3 top-3 z-10 bg-primary text-primary-foreground text-[10px]">
          {combo.badge}
        </Badge>
      )}

      {/* Image / product preview */}
      <div className="relative aspect-square overflow-hidden bg-muted p-2">
        {combo.image_url ? (
          <img
            src={combo.image_url}
            alt={combo.name}
            className="h-full w-full object-contain transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full flex flex-wrap items-center justify-center gap-1 p-2">
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
        <div className="absolute bottom-2 left-2 right-2">
          <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary">
            COMBO • {combo.product_ids.length} produtos
          </Badge>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-3 md:p-4">
        <h3 className="text-sm font-bold leading-tight text-foreground line-clamp-2 min-h-[2.5em]">
          {combo.name}
        </h3>

        {comboProducts.length > 0 && (
          <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">
            {comboProducts.map((p) => p.name).join(" + ")}
          </p>
        )}

        <div className="mt-auto pt-2">
          {combo.original_price > combo.price && (
            <p className="text-xs text-muted-foreground line-through">
              R$ {combo.original_price.toFixed(2).replace(".", ",")}
            </p>
          )}
          <p className="text-lg font-extrabold text-primary leading-tight">
            R$ {combo.price.toFixed(2).replace(".", ",")}
          </p>
          <p className="text-[10px] text-success font-semibold">
            R$ {pixPrice} no Pix
          </p>
          {installmentValue && (
            <p className="text-[10px] text-muted-foreground">
              ou {maxInstallments}x de R$ {installmentValue}
            </p>
          )}
        </div>

        <Button
          size="sm"
          className="mt-3 w-full gap-1.5 text-xs font-bold"
          onClick={handleAddCombo}
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          Comprar Combo
        </Button>
      </div>
    </div>
  );
};

export default ComboCard;
