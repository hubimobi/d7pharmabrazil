import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Product } from "@/hooks/useProducts";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { trackAddToCart } from "@/lib/tracking";
import { useTenant } from "@/hooks/useTenant";

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
  coupon_id?: string;
}

interface ComboState {
  productIds: string[];
  discount: number;
  freeShipping: boolean;
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
  comboFreeShipping: boolean;
  comboDiscount: number;
  comboQuantity: number;
  setComboDiscount: (v: number) => void;
  setComboFreeShipping: (v: boolean) => void;
  comboProductIds: string[];
  setComboProductIds: (ids: string[]) => void;
  removeCombo: () => void;
  setComboQuantity: (qty: number) => void;
  duplicateCombo: () => void;
  addCombo: (products: Product[], discount: number, freeShipping: boolean, qty?: number) => void;
}

const CartContext = createContext<CartContextType | null>(null);

const CART_STORAGE_KEY = "d7pharma_cart";
const COMBO_STORAGE_KEY = "d7pharma_combo";

function loadCartFromStorage(): CartItem[] {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function saveCartToStorage(items: CartItem[]) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

function loadComboFromStorage(): ComboState {
  try {
    const stored = localStorage.getItem(COMBO_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && Array.isArray(parsed.productIds)) return parsed;
    }
  } catch {}
  return { productIds: [], discount: 0, freeShipping: false };
}

function saveComboToStorage(combo: ComboState) {
  try {
    localStorage.setItem(COMBO_STORAGE_KEY, JSON.stringify(combo));
  } catch {}
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { tenantId } = useTenant();
  const [items, setItems] = useState<CartItem[]>(() => loadCartFromStorage());
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [comboState, setComboState] = useState<ComboState>(() => loadComboFromStorage());

  // Persist cart to localStorage
  useEffect(() => {
    saveCartToStorage(items);
  }, [items]);

  // Persist combo state to localStorage
  useEffect(() => {
    saveComboToStorage(comboState);
  }, [comboState]);

  // Validate combo state: if combo products are no longer in the cart, clear combo
  useEffect(() => {
    if (comboState.productIds.length === 0) return;
    const cartIds = new Set(items.map((i) => i.product.id));
    const allPresent = comboState.productIds.every((id) => cartIds.has(id));
    if (!allPresent) {
      setComboState({ productIds: [], discount: 0, freeShipping: false });
    }
  }, [items, comboState.productIds]);

  const addItem = (product: Product, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + qty } : i);
      }
      return [...prev, { product, quantity: qty }];
    });
    toast.success(`${product.name} adicionado ao carrinho!`);
    trackAddToCart({ id: product.id, name: product.name, price: product.price }, qty);
  };

  const removeItem = (productId: string) => {
    // Prevent removing individual combo items
    if (comboState.productIds.includes(productId)) return;
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const updateQuantity = (productId: string, qty: number) => {
    // Prevent changing individual combo item quantities
    if (comboState.productIds.includes(productId)) return;
    if (qty <= 0) return removeItem(productId);
    setItems((prev) => prev.map((i) => i.product.id === productId ? { ...i, quantity: qty } : i));
  };

  const clearCart = () => {
    setItems([]);
    setAppliedCoupon(null);
    setComboState({ productIds: [], discount: 0, freeShipping: false });
    localStorage.removeItem(CART_STORAGE_KEY);
    localStorage.removeItem(COMBO_STORAGE_KEY);
  };

  const removeCombo = () => {
    if (comboState.productIds.length === 0) return;
    setItems((prev) => prev.filter((i) => !comboState.productIds.includes(i.product.id)));
    setComboState({ productIds: [], discount: 0, freeShipping: false });
  };

  const setComboQuantity = (qty: number) => {
    if (comboState.productIds.length === 0 || qty < 1) return;
    setItems((prev) =>
      prev.map((i) =>
        comboState.productIds.includes(i.product.id)
          ? { ...i, quantity: qty }
          : i
      )
    );
  };

  const duplicateCombo = () => {
    if (comboState.productIds.length === 0) return;
    setItems((prev) =>
      prev.map((i) =>
        comboState.productIds.includes(i.product.id)
          ? { ...i, quantity: i.quantity + 1 }
          : i
      )
    );
  };

  // Centralized combo addition
  const addCombo = (products: Product[], discount: number, freeShipping: boolean, qty = 1) => {
    // Remove any existing combo first
    if (comboState.productIds.length > 0) {
      setItems((prev) => prev.filter((i) => !comboState.productIds.includes(i.product.id)));
    }

    // Add all combo products
    setItems((prev) => {
      let next = [...prev];
      for (const p of products) {
        const existing = next.find((i) => i.product.id === p.id);
        if (existing) {
          next = next.map((i) => i.product.id === p.id ? { ...i, quantity: qty } : i);
        } else {
          next.push({ product: p, quantity: qty });
        }
      }
      return next;
    });

    // Register combo state (persisted)
    setComboState({
      productIds: products.map((p) => p.id),
      discount,
      freeShipping,
    });

    // Reset coupon — no stacking discounts
    setAppliedCoupon(null);
  };

  // Setters that also update persisted state
  const setComboDiscount = (v: number) => {
    setComboState((prev) => ({ ...prev, discount: v }));
  };

  const setComboFreeShipping = (v: boolean) => {
    setComboState((prev) => ({ ...prev, freeShipping: v }));
  };

  const setComboProductIds = (ids: string[]) => {
    setComboState((prev) => ({ ...prev, productIds: ids }));
  };

  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  const applyCoupon = async (code: string): Promise<boolean> => {
    const upper = code.toUpperCase().trim();
    if (!upper) {
      toast.error("Digite um código de cupom");
      return false;
    }

    try {
      const { data, error } = await supabase
        .from("coupons_public" as any)
        .select("*")
        .eq("code", upper)
        .eq("active", true)
        .eq("tenant_id", tenantId)
        .single() as { data: any; error: any };

      if (error || !data) {
        toast.error("Cupom inválido");
        return false;
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        toast.error("Este cupom expirou");
        return false;
      }

      if (data.starts_at && new Date(data.starts_at) > new Date()) {
        toast.error("Este cupom ainda não está válido");
        return false;
      }

      if (data.max_uses && data.used_count >= data.max_uses) {
        toast.error("Este cupom atingiu o limite de usos");
        return false;
      }

      if (data.min_order_value && subtotal < Number(data.min_order_value)) {
        toast.error(`Valor mínimo de R$ ${Number(data.min_order_value).toFixed(2).replace(".", ",")} para usar este cupom`);
        return false;
      }

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
        coupon_id: data.id,
      });

      // Reset combo discount — no stacking discounts
      setComboState((prev) => ({ ...prev, discount: 0 }));

      toast.success("Cupom aplicado com sucesso!");
      return true;
    } catch {
      toast.error("Erro ao validar cupom");
      return false;
    }
  };

  // Calculate coupon discount
  let discount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.product_id) {
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

  // Derive combo quantity from first combo item
  const comboQuantity = comboState.productIds.length > 0
    ? (items.find((i) => comboState.productIds.includes(i.product.id))?.quantity ?? 1)
    : 0;

  // Combo discount is cumulative: per-unit discount × quantity
  const totalComboDiscount = comboState.discount * Math.max(comboQuantity, 1);
  const total = Math.max(0, subtotal - discount - totalComboDiscount);

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, updateQuantity, clearCart,
      total, coupon: appliedCoupon?.code ?? null, applyCoupon,
      discount, freeShipping,
      comboFreeShipping: comboState.freeShipping,
      comboDiscount: totalComboDiscount,
      comboQuantity,
      setComboDiscount, setComboFreeShipping,
      comboProductIds: comboState.productIds,
      setComboProductIds,
      removeCombo, setComboQuantity, duplicateCombo, addCombo,
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

export function useCartSafe() {
  return useContext(CartContext);
}
