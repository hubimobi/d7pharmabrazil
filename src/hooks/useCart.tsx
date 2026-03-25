import { createContext, useContext, useState, ReactNode } from "react";
import { Product } from "@/hooks/useProducts";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface CartItem {
  product: Product;
  quantity: number;
}

interface AppliedCoupon {
  code: string;
  discount_type: string;
  discount_value: number;
  free_shipping: boolean;
  product_id: string | null;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, qty?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;
  clearCart: () => void;
  total: number;
  coupon: string | null;
  applyCoupon: (code: string) => Promise<boolean>;
  discount: number;
  freeShipping: boolean;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  const addItem = (product: Product, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + qty } : i);
      }
      return [...prev, { product, quantity: qty }];
    });
    toast.success(`${product.name} adicionado ao carrinho!`);
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const updateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) return removeItem(productId);
    setItems((prev) => prev.map((i) => i.product.id === productId ? { ...i, quantity: qty } : i));
  };

  const clearCart = () => { setItems([]); setAppliedCoupon(null); };

  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  const applyCoupon = async (code: string): Promise<boolean> => {
    const upper = code.toUpperCase().trim();
    if (!upper) {
      toast.error("Digite um código de cupom");
      return false;
    }

    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", upper)
        .eq("active", true)
        .single();

      if (error || !data) {
        toast.error("Cupom inválido");
        return false;
      }

      // Check expiration
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        toast.error("Este cupom expirou");
        return false;
      }

      // Check start date
      if (data.starts_at && new Date(data.starts_at) > new Date()) {
        toast.error("Este cupom ainda não está válido");
        return false;
      }

      // Check max uses
      if (data.max_uses && data.used_count >= data.max_uses) {
        toast.error("Este cupom atingiu o limite de usos");
        return false;
      }

      // Check min order value
      if (data.min_order_value && subtotal < Number(data.min_order_value)) {
        toast.error(`Valor mínimo de R$ ${Number(data.min_order_value).toFixed(2).replace(".", ",")} para usar este cupom`);
        return false;
      }

      // Check product restriction
      if (data.product_id) {
        const hasProduct = items.some((i) => i.product.id === data.product_id);
        if (!hasProduct) {
          toast.error("Este cupom é válido apenas para um produto específico que não está no carrinho");
          return false;
        }
      }

      setAppliedCoupon({
        code: data.code,
        discount_type: data.discount_type,
        discount_value: Number(data.discount_value),
        free_shipping: data.free_shipping,
        product_id: data.product_id,
      });

      // Increment used_count (non-blocking)
      supabase.from("coupons").update({ used_count: data.used_count + 1 } as any).eq("id", data.id).then();

      toast.success("Cupom aplicado com sucesso!");
      return true;
    } catch {
      toast.error("Erro ao validar cupom");
      return false;
    }
  };

  // Calculate discount
  let discount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.product_id) {
      // Discount only on specific product
      const productItem = items.find((i) => i.product.id === appliedCoupon.product_id);
      if (productItem) {
        const productTotal = productItem.product.price * productItem.quantity;
        discount = appliedCoupon.discount_type === "percent"
          ? productTotal * (appliedCoupon.discount_value / 100)
          : Math.min(appliedCoupon.discount_value, productTotal);
      }
    } else {
      discount = appliedCoupon.discount_type === "percent"
        ? subtotal * (appliedCoupon.discount_value / 100)
        : Math.min(appliedCoupon.discount_value, subtotal);
    }
  }

  const freeShipping = appliedCoupon?.free_shipping ?? false;
  const total = Math.max(0, subtotal - discount);

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, updateQuantity, clearCart,
      total, coupon: appliedCoupon?.code ?? null, applyCoupon,
      discount, freeShipping,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
