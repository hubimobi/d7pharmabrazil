import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star, X, Bell, ShoppingCart } from "lucide-react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useCartSafe } from "@/hooks/useCart";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { Product } from "@/hooks/useProducts";

interface RecentOrder {
  customer_name: string;
  items: { name: string; product_id?: string }[];
  created_at: string;
  city?: string;
}

const CITIES = [
  "São Paulo/SP", "Rio de Janeiro/RJ", "Belo Horizonte/MG", "Curitiba/PR",
  "Porto Alegre/RS", "Salvador/BA", "Fortaleza/CE", "Brasília/DF",
  "Recife/PE", "Goiânia/GO", "Manaus/AM", "Campinas/SP",
];

const FALLBACK_PURCHASES: RecentOrder[] = [
  { customer_name: "Ana C.", items: [{ name: "TCF-4 Premium" }], created_at: new Date(Date.now() - 3 * 60000).toISOString() },
  { customer_name: "Marcos S.", items: [{ name: "Vitamina D3 10.000UI" }], created_at: new Date(Date.now() - 8 * 60000).toISOString() },
  { customer_name: "Juliana R.", items: [{ name: "Ômega 3 Ultra" }], created_at: new Date(Date.now() - 15 * 60000).toISOString() },
  { customer_name: "Carlos M.", items: [{ name: "Magnésio Quelado" }], created_at: new Date(Date.now() - 22 * 60000).toISOString() },
  { customer_name: "Fernanda L.", items: [{ name: "Complexo B Premium" }], created_at: new Date(Date.now() - 35 * 60000).toISOString() },
];

const DISPLAY_DURATION = 5000;
const BURST_GAP = 1500;

export default function RecentPurchasePopup() {
  const [visible, setVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const burstCount = useRef(0);
  const phase = useRef<"idle" | "burst" | "recurring">("idle");
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  const isPublicStorefront = ["/", "/produtos"].includes(location.pathname) || location.pathname.startsWith("/produto/");
  const cart = useCartSafe();
  const addItem = cart?.addItem;
  const { data: popupSettings } = useStoreSettings();

  // Settings with defaults
  const popupEnabled = popupSettings?.sales_popup_enabled ?? true;
  const popupPosition = popupSettings?.sales_popup_position || "bottom-left";
  const buttonColor = popupSettings?.sales_popup_button_color || "#f97316";
  const intervalMin = (popupSettings?.sales_popup_interval_min ?? 10) * 1000;
  const intervalMax = (popupSettings?.sales_popup_interval_max ?? 15) * 1000;
  const burstMax = popupSettings?.sales_popup_burst_count ?? 4;
  const includeReal = popupSettings?.sales_popup_include_real_orders ?? true;
  const customEntries = (popupSettings?.sales_popup_custom_entries || []) as Array<{ customer_name: string; product_name: string; city: string }>;

  const { data: orders } = useQuery({
    queryKey: ["recent-orders-popup"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("recent-orders");
      if (error) throw error;
      return (data?.orders || []) as RecentOrder[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: includeReal && popupEnabled,
  });

  const { data: products } = useQuery({
    queryKey: ["products-popup"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, slug, image_url, price, original_price, short_description, description, rating, reviews_count, stock, weight, height, width, length, unit, benefits, extra_images, badge")
        .eq("active", true);
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: popupEnabled,
  });

  // Build display orders from real + custom + fallback
  const customOrders: RecentOrder[] = customEntries
    .filter((e) => e.customer_name && e.product_name)
    .map((e) => ({
      customer_name: e.customer_name,
      items: [{ name: e.product_name }],
      created_at: new Date(Date.now() - Math.random() * 30 * 60000).toISOString(),
      city: e.city,
    }));

  const realOrders = includeReal ? (orders || []) : [];
  const displayOrders = [...realOrders, ...customOrders, ...FALLBACK_PURCHASES].slice(0, Math.max(5, realOrders.length + customOrders.length));

  const showNext = useCallback(() => {
    if (dismissed || !isPublicStorefront || !displayOrders.length || !popupEnabled) return;
    setCurrentIndex((prev) => (prev + 1) % displayOrders.length);
    setVisible(true);
  }, [dismissed, isPublicStorefront, displayOrders.length, popupEnabled]);

  // Phase controller
  useEffect(() => {
    if (!displayOrders.length || dismissed || !isPublicStorefront || !popupEnabled) return;
    let timeouts: ReturnType<typeof setTimeout>[] = [];
    if (phase.current === "idle") {
      phase.current = "burst";
      burstCount.current = 0;
      const t = setTimeout(() => {
        setVisible(true);
        burstCount.current = 1;
      }, 5000);
      timeouts.push(t);
    }
    return () => timeouts.forEach(clearTimeout);
  }, [displayOrders.length, dismissed, isAdmin, popupEnabled]);

  // Handle burst and recurring transitions
  useEffect(() => {
    if (!visible || dismissed || isAdmin || !popupEnabled) return;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const hideT = setTimeout(() => setVisible(false), DISPLAY_DURATION);
    timeouts.push(hideT);

    if (phase.current === "burst" && burstCount.current < burstMax) {
      const nextT = setTimeout(() => {
        burstCount.current += 1;
        showNext();
      }, DISPLAY_DURATION + BURST_GAP);
      timeouts.push(nextT);
    } else {
      phase.current = "recurring";
      const delay = intervalMin + Math.random() * (intervalMax - intervalMin);
      const nextT = setTimeout(() => showNext(), DISPLAY_DURATION + delay);
      timeouts.push(nextT);
    }
    return () => timeouts.forEach(clearTimeout);
  }, [visible, currentIndex, dismissed, isPublicStorefront, showNext, popupEnabled, burstMax, intervalMin, intervalMax]);

  if (!displayOrders.length || dismissed || !isPublicStorefront || !popupEnabled) return null;

  const order = displayOrders[currentIndex % displayOrders.length];
  const firstName = order.customer_name?.split(" ")[0] || "Cliente";
  const city = order.city || CITIES[currentIndex % CITIES.length];
  const orderItems = Array.isArray(order.items) ? order.items : [];
  const firstItem = orderItems[0];
  const productName = firstItem?.name || "Produto";

  const matchedProduct = products?.find(
    (p) => firstItem?.product_id === p.id || p.name === firstItem?.name
  );
  const productImage = matchedProduct?.image_url || "/placeholder.svg";

  const minutesAgo = Math.max(
    2,
    Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000)
  );
  const timeLabel = minutesAgo < 60
    ? `há ${minutesAgo} min`
    : minutesAgo < 1440
      ? `há ${Math.floor(minutesAgo / 60)}h`
      : `há ${Math.floor(minutesAgo / 1440)}d`;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!matchedProduct) return;
    const p: Product = {
      id: matchedProduct.id,
      name: matchedProduct.name,
      slug: matchedProduct.slug,
      shortDescription: matchedProduct.short_description || "",
      description: matchedProduct.description || "",
      price: matchedProduct.price,
      originalPrice: matchedProduct.original_price,
      image: matchedProduct.image_url || "/placeholder.svg",
      extraImages: (matchedProduct.extra_images as string[]) || [],
      rating: matchedProduct.rating,
      reviews: matchedProduct.reviews_count,
      badge: matchedProduct.badge || undefined,
      stock: matchedProduct.stock,
      weight: matchedProduct.weight,
      height: matchedProduct.height,
      width: matchedProduct.width,
      length: matchedProduct.length,
      showCountdown: false,
      countdownMode: "end_of_day",
      countdownEndTime: null,
      countdownEndDate: null,
      countdownDurationMinutes: 60,
      featured: false,
      groupName: "",
      seoTitle: "",
      seoDescription: "",
      seoKeywords: "",
      sku: "",
      upsellProductIds: Array.isArray((matchedProduct as any).upsell_product_ids) ? (matchedProduct as any).upsell_product_ids : [],
      benefits: (matchedProduct.benefits as string[]) || [],
    };
    addItem(p, 1);
    setVisible(false);
  };

  // Position classes
  const positionMap: Record<string, string> = {
    "bottom-left": "bottom-4 left-4",
    "bottom-right": "bottom-4 right-4",
    "top-left": "top-20 left-4",
    "top-right": "top-20 right-4",
  };
  const positionCls = positionMap[popupPosition] || positionMap["bottom-left"];

  const isTop = popupPosition.startsWith("top");
  const animY = isTop ? -80 : 80;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: animY, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: animY, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className={`fixed z-50 w-[340px] sm:w-[380px] ${positionCls}`}
        >
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setVisible(false);
                setDismissed(true);
              }}
              className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition z-10"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-1.5 px-4 pt-3 pb-1">
              <div className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10">
                <Bell className="h-3 w-3 text-primary" />
              </div>
              <span className="text-xs font-medium text-primary uppercase tracking-wide">Compra recente</span>
            </div>

            <div className="flex items-center gap-4 px-4 pb-3 pt-1">
              <div className="flex-shrink-0 h-[72px] w-[72px] rounded-xl bg-muted overflow-hidden border border-border">
                <img src={productImage} alt={productName} className="h-full w-full object-contain p-1.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">
                  <span className="font-bold">{firstName}</span>{" "}
                  <span className="text-muted-foreground">comprou</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">📍 {city}</p>
                <p className="text-sm font-semibold text-foreground truncate mt-1">{productName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-warning text-warning" />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">{timeLabel}</span>
                </div>
              </div>
            </div>

            <div className="px-4 pb-3">
              <button
                onClick={handleAddToCart}
                disabled={!matchedProduct}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all animate-pulse disabled:opacity-50 disabled:animate-none"
                style={{ backgroundColor: buttonColor }}
              >
                <ShoppingCart className="h-4 w-4" />
                Eu quero também!
              </button>
            </div>

            <motion.div
              className="h-1 bg-primary/80 rounded-b-2xl"
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: DISPLAY_DURATION / 1000, ease: "linear" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
