import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star, X } from "lucide-react";
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
  }, [orders, dismissed]);

  useEffect(() => {
    if (!visible || !orders?.length || dismissed) return;

    // Auto-hide after 6 seconds
    const hideTimer = setTimeout(() => {
      setVisible(false);
    }, 6000);

    // Show next one after 25 seconds
    const nextTimer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % (orders?.length || 1));
      setVisible(true);
    }, 25000);

    return () => {
      clearTimeout(hideTimer);
      clearTimeout(nextTimer);
    };
  }, [visible, currentIndex, orders, dismissed]);

  if (!orders?.length || dismissed) return null;

  const order = orders[currentIndex % orders.length];
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
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed bottom-20 left-4 z-50 max-w-xs"
        >
          <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-lg">
            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setVisible(false);
                setDismissed(true);
              }}
              className="absolute right-2 top-2 rounded-full p-0.5 text-muted-foreground hover:text-foreground transition z-10"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={handleClick}>
              {/* Product Image */}
              <div className="flex-shrink-0 h-14 w-14 rounded-lg bg-muted overflow-hidden">
                <img
                  src={productImage}
                  alt={productName}
                  className="h-full w-full object-contain p-1"
                />
              </div>

              <div className="flex-1 min-w-0">
                {/* Customer info */}
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{firstName}</span> comprou de{" "}
                  <span className="font-medium">{city}</span>
                </p>

                {/* Product name */}
                <p className="text-sm font-medium text-foreground truncate mt-0.5">
                  {productName}
                </p>

                {/* Stars */}
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-warning text-warning" />
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{timeLabel}</span>
                </div>

                {/* CTA */}
                <p className="text-xs font-semibold text-primary mt-1 hover:underline">
                  Eu quero também →
                </p>
              </div>
            </div>

            {/* Subtle progress bar */}
            <motion.div
              className="h-0.5 bg-primary"
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
