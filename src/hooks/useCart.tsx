import { createContext, useContext, useState, ReactNode } from "react";
import { Product } from "@/hooks/useProducts";
import { toast } from "sonner";

interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, qty?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;
  clearCart: () => void;
  total: number;
  coupon: string | null;
  applyCoupon: (code: string) => boolean;
  discount: number;
}

const CartContext = createContext<CartContextType | null>(null);

const COUPONS: Record<string, { type: "percent" | "fixed" | "frete"; value: number }> = {
  D7PHARMA10: { type: "percent", value: 10 },
  PRIMEIRACOMPRA: { type: "fixed", value: 30 },
  FRETEGRATIS: { type: "frete", value: 0 },
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [coupon, setCoupon] = useState<string | null>(null);

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

  const clearCart = () => setItems([]);

  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  const applyCoupon = (code: string) => {
    const upper = code.toUpperCase();
    if (COUPONS[upper]) {
      setCoupon(upper);
      toast.success("Cupom aplicado com sucesso!");
      return true;
    }
    toast.error("Cupom inválido");
    return false;
  };

  const discount = coupon && COUPONS[coupon]
    ? COUPONS[coupon].type === "percent"
      ? subtotal * (COUPONS[coupon].value / 100)
      : COUPONS[coupon].type === "fixed"
        ? COUPONS[coupon].value
        : 0
    : 0;

  const total = Math.max(0, subtotal - discount);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, total, coupon, applyCoupon, discount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
