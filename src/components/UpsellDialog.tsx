import { Product } from "@/hooks/useProducts";
import { useCart } from "@/hooks/useCart";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Gift, TrendingUp } from "lucide-react";

interface UpsellDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
}

const OFFERS = [
  { qty: 2, discount: 5, label: "Leve 2", icon: TrendingUp },
  { qty: 3, discount: 10, label: "Leve 3", icon: Gift },
];

const UpsellDialog = ({ open, onOpenChange, product }: UpsellDialogProps) => {
  const { addItem, items } = useCart();

  const currentQty = items.find((i) => i.product.id === product.id)?.quantity ?? 1;

  const handleSelect = (totalQty: number, discount: number) => {
    const extra = totalQty - currentQty;
    if (extra > 0) {
      addItem(product, extra);
    }
    onOpenChange(false);
  };

  const handleSkip = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Gift className="h-5 w-5 text-primary" />
            Aproveite e economize!
          </DialogTitle>
          <DialogDescription>
            Você adicionou <strong className="text-foreground">{product.name}</strong>. Leve mais e ganhe desconto!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {OFFERS.map((offer) => {
            const Icon = offer.icon;
            const unitPrice = product.price * (1 - offer.discount / 100);
            const totalPrice = unitPrice * offer.qty;
            const savings = product.price * offer.qty - totalPrice;

            return (
              <button
                key={offer.qty}
                onClick={() => handleSelect(offer.qty, offer.discount)}
                className="flex w-full items-center gap-4 rounded-lg border border-border p-4 text-left transition hover:border-primary hover:bg-primary/5"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{offer.label} unidades</span>
                    <Badge variant="secondary" className="bg-success/10 text-success text-xs">
                      -{offer.discount}% OFF
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    R$ {unitPrice.toFixed(2).replace(".", ",")} cada •{" "}
                    <span className="font-medium text-foreground">
                      R$ {totalPrice.toFixed(2).replace(".", ",")}
                    </span>
                  </p>
                  <p className="text-xs text-success font-medium">
                    Economize R$ {savings.toFixed(2).replace(".", ",")}
                  </p>
                </div>
                <ShoppingCart className="h-5 w-5 text-muted-foreground" />
              </button>
            );
          })}
        </div>

        <Button variant="ghost" className="w-full text-muted-foreground" onClick={handleSkip}>
          Não, obrigado — continuar com 1 unidade
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default UpsellDialog;
