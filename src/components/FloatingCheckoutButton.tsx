import { ShoppingCart } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

const VISIBLE_PATHS = ["/", "/produtos"];

const FloatingCheckoutButton = () => {
  const { items } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const isVisible = VISIBLE_PATHS.includes(location.pathname);

  if (!isVisible || items.length === 0) return null;

  return (
    <button
      onClick={() => navigate("/checkout")}
      className={`fixed bottom-6 left-6 z-40 flex items-center gap-2 rounded-full bg-[hsl(var(--success))] px-5 py-3 text-sm font-bold text-[hsl(var(--success-foreground))] shadow-lg transition-transform duration-300 hover:scale-105 hover:shadow-xl animate-fade-in ${pulse ? "scale-125" : "scale-100"}`}
      aria-label="Finalizar compra agora"
    >
      <ShoppingCart className="h-5 w-5" />
      <span>Finalizar Compra</span>
      {items.length > 0 && (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
          {items.reduce((sum, i) => sum + i.quantity, 0)}
        </span>
      )}
    </button>
  );
};

export default FloatingCheckoutButton;
