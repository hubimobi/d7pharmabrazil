import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star, X, Bell } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

interface RecentOrder {
  customer_name: string;
  items: { name: string; product_id?: string }[];
  created_at: string;
}

// Brazilian cities for fallback
const CITIES = [
  "São Paulo/SP", "Rio de Janeiro/RJ", "Belo Horizonte/MG", "Curitiba/PR",
  "Porto Alegre/RS", "Salvador/BA", "Fortaleza/CE", "Brasília/DF",
  "Recife/PE", "Goiânia/GO", "Manaus/AM", "Campinas/SP",
];

// Fallback fake purchases when no real orders exist
const FALLBACK_PURCHASES: RecentOrder[] = [
  { customer_name: "Ana C.", items: [{ name: "TCF-4 Premium" }], created_at: new Date(Date.now() - 3 * 60000).toISOString() },
  { customer_name: "Marcos S.", items: [{ name: "Vitamina D3 10.000UI" }], created_at: new Date(Date.now() - 8 * 60000).toISOString() },
  { customer_name: "Juliana R.", items: [{ name: "Ômega 3 Ultra" }], created_at: new Date(Date.now() - 15 * 60000).toISOString() },
  { customer_name: "Carlos M.", items: [{ name: "Magnésio Quelado" }], created_at: new Date(Date.now() - 22 * 60000).toISOString() },
  { customer_name: "Fernanda L.", items: [{ name: "Complexo B Premium" }], created_at: new Date(Date.now() - 35 * 60000).toISOString() },
];

export default function RecentPurchasePopup() {
  const [visible, setVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  const { data: orders } = useQuery({
    queryKey: ["recent-orders-popup"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("recent-orders");
      if (error) throw error;
      return (data?.orders || []) as RecentOrder[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: products } = useQuery({
    queryKey: ["products-popup"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, slug, image_url")
        .eq("active", true);
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
  // Merge real orders with fallbacks to always have at least 5
  const displayOrders = [...(orders || []), ...FALLBACK_PURCHASES].slice(0, Math.max(5, orders?.length || 0));

  useEffect(() => {
    if (!displayOrders.length || dismissed || isAdmin) return;

    // Show first popup after 8 seconds
    const initialTimer = setTimeout(() => {
      setVisible(true);
    }, 8000);

    return () => clearTimeout(initialTimer);
  }, [displayOrders.length, dismissed, isAdmin]);

  useEffect(() => {
    if (!visible || !displayOrders.length || dismissed || isAdmin) return;

    const hideTimer = setTimeout(() => {
      setVisible(false);
    }, 6000);

    const nextTimer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % displayOrders.length);
      setVisible(true);
    }, 25000);

    return () => {
      clearTimeout(hideTimer);
      clearTimeout(nextTimer);
    };
  }, [visible, currentIndex, displayOrders.length, dismissed, isAdmin]);

  if (!displayOrders.length || dismissed || isAdmin) return null;

  const order = displayOrders[currentIndex % displayOrders.length];
  const firstName = order.customer_name?.split(" ")[0] || "Cliente";
  const city = CITIES[currentIndex % CITIES.length];
  const orderItems = Array.isArray(order.items) ? order.items : [];
  const firstItem = orderItems[0];
  const productName = firstItem?.name || "Produto";

  // Find product image
  const matchedProduct = products?.find(
    (p) => firstItem?.product_id === p.id || p.name === firstItem?.name
  );
  const productImage = matchedProduct?.image_url || "/placeholder.svg";
  const productSlug = matchedProduct?.slug;

  // Time ago
  const minutesAgo = Math.max(
    2,
    Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000)
  );
  const timeLabel = minutesAgo < 60
    ? `há ${minutesAgo} min`
    : minutesAgo < 1440
      ? `há ${Math.floor(minutesAgo / 60)}h`
      : `há ${Math.floor(minutesAgo / 1440)}d`;

  const handleClick = () => {
    setVisible(false);
    if (productSlug) {
      navigate(`/produto/${productSlug}`);
    } else {
      navigate("/produtos");
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="fixed bottom-6 left-6 z-50 w-[340px] sm:w-[380px]"
        >
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            {/* Close button */}
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

            {/* Alert badge */}
            <div className="flex items-center gap-1.5 px-4 pt-3 pb-1">
              <div className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10">
                <Bell className="h-3 w-3 text-primary" />
              </div>
              <span className="text-xs font-medium text-primary uppercase tracking-wide">Compra recente</span>
            </div>

            <div className="flex items-center gap-4 px-4 pb-4 pt-1 cursor-pointer" onClick={handleClick}>
              {/* Product Image */}
              <div className="flex-shrink-0 h-[72px] w-[72px] rounded-xl bg-muted overflow-hidden border border-border">
                <img
                  src={productImage}
                  alt={productName}
                  className="h-full w-full object-contain p-1.5"
                />
              </div>

              <div className="flex-1 min-w-0">
                {/* Customer name */}
                <p className="text-sm text-foreground">
                  <span className="font-bold">{firstName}</span>{" "}
                  <span className="text-muted-foreground">comprou</span>
                </p>

                {/* City */}
                <p className="text-xs text-muted-foreground mt-0.5">
                  📍 {city}
                </p>

                {/* Product name */}
                <p className="text-sm font-semibold text-foreground truncate mt-1">
                  {productName}
                </p>

                {/* Stars + time */}
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-warning text-warning" />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">{timeLabel}</span>
                </div>

                {/* CTA */}
                <p className="text-xs font-bold text-primary mt-1.5 hover:underline">
                  Eu quero também →
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <motion.div
              className="h-1 bg-primary/80 rounded-b-2xl"
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 6, ease: "linear" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
