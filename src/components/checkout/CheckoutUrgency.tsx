import { useState, useEffect, useRef } from "react";
import { Clock, Gift, Truck, ShieldCheck, Headphones, Package, Users, Flame, Eye } from "lucide-react";

interface CheckoutUrgencyProps {
  reviewsCount?: number;
  firstBenefit?: string;
}

/** Returns remaining orders based on hour: 01h→40, 23h→5, linearly */
function getRemainingOrders(): number {
  const hour = new Date().getHours();
  const orders = Math.round(40 - ((hour - 1) * 35) / 22);
  return Math.max(3, Math.min(40, orders));
}

function getBuyersThisMonth(reviewsCount: number): number {
  return Math.max(142, reviewsCount + 100 + Math.floor(reviewsCount * 0.3));
}

function getInitialViewers(): number {
  const hour = new Date().getHours();
  // More viewers during peak hours (10-22h)
  if (hour >= 10 && hour <= 22) return Math.floor(Math.random() * 15) + 18; // 18-32
  return Math.floor(Math.random() * 8) + 7; // 7-14
}

export default function CheckoutUrgency({ reviewsCount = 500, firstBenefit }: CheckoutUrgencyProps) {
  const [remainingOrders] = useState(getRemainingOrders);
  const buyersThisMonth = getBuyersThisMonth(reviewsCount);
  const [viewers, setViewers] = useState(getInitialViewers);
  const viewersRef = useRef(viewers);
  const [giftSeconds, setGiftSeconds] = useState(() => {
    const saved = sessionStorage.getItem("d7-gift-timer-end");
    if (saved) {
      const remaining = Math.max(0, Math.floor((Number(saved) - Date.now()) / 1000));
      return remaining;
    }
    const end = Date.now() + 15 * 60 * 1000;
    sessionStorage.setItem("d7-gift-timer-end", String(end));
    return 15 * 60;
  });

  useEffect(() => {
    if (giftSeconds <= 0) return;
    const interval = setInterval(() => {
      setGiftSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [giftSeconds]);

  const giftMin = Math.floor(giftSeconds / 60);
  const giftSec = giftSeconds % 60;

  return (
    <div className="space-y-3">
      {/* Alta demanda */}
      <div className="flex items-center gap-2 rounded-lg bg-warning/10 border border-warning/20 px-3 py-2.5">
        <Flame className="h-4 w-4 text-warning flex-shrink-0" />
        <div className="text-xs">
          <span className="font-semibold text-warning">Alta demanda</span>
          <span className="text-foreground">: restam poucas unidades desse lote</span>
        </div>
      </div>

      {/* Social proof - buyers this month */}
      <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
        <Users className="h-4 w-4 text-primary flex-shrink-0" />
        <span className="text-xs font-medium text-foreground">
          +{buyersThisMonth} clientes compraram este mês
        </span>
      </div>

      {/* Shipping promise */}
      <div className="flex items-center gap-2 rounded-lg bg-success/10 border border-success/20 px-3 py-2">
        <Truck className="h-4 w-4 text-success flex-shrink-0" />
        <span className="text-xs font-medium text-success">📦 Envio em até 24h úteis</span>
      </div>

      {/* Gift countdown */}
      {giftSeconds > 0 && (
        <div className="rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 px-3 py-3">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary animate-pulse flex-shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-foreground">
                Compre nos próximos{" "}
                <span className="inline-flex items-center gap-0.5">
                  <span className="rounded bg-primary px-1.5 py-0.5 font-bold text-primary-foreground tabular-nums">
                    {String(giftMin).padStart(2, "0")}:{String(giftSec).padStart(2, "0")}
                  </span>
                </span>
              </p>
              <p className="text-muted-foreground mt-0.5">🎁 Receba um <strong className="text-foreground">Presente Especial</strong> na sua Primeira Compra</p>
            </div>
          </div>
        </div>
      )}

      {/* Trust badges */}
      <div className="rounded-lg border border-border bg-muted/50 px-3 py-3">
        <p className="text-xs font-semibold text-foreground mb-2">Na D7 Pharma você tem:</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Truck className="h-3.5 w-3.5 text-primary flex-shrink-0" />
            <span>✅ <strong className="text-foreground">Garantia de Entrega Rápida</strong></span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Headphones className="h-3.5 w-3.5 text-primary flex-shrink-0" />
            <span>✅ <strong className="text-foreground">Suporte Humanizado 24/7</strong></span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary flex-shrink-0" />
            <span>✅ <strong className="text-foreground">Segurança e Transparência</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
