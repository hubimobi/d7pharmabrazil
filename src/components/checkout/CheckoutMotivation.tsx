import { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface CartItem {
  product: { benefits?: string[] };
}

interface Props {
  step: number;
  items: CartItem[];
}

export default function CheckoutMotivation({ step, items }: Props) {
  const [benefitIndex, setBenefitIndex] = useState(0);

  const allBenefits = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      (item.product.benefits || []).forEach((b) => {
        if (b) set.add(b.toLowerCase());
      });
    });
    return set.size > 0 ? Array.from(set) : ["melhorar sua performance"];
  }, [items]);

  useEffect(() => {
    if (allBenefits.length <= 1) return;
    const interval = setInterval(() => {
      setBenefitIndex((prev) => (prev + 1) % allBenefits.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [allBenefits.length]);

  const stepsLeft = step === 1 ? "2 passos" : "1 passo";

  return (
    <div className="mt-6 flex items-center gap-4">
      {[1, 2].map((s) => (
        <div
          key={s}
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold shrink-0 ${
            step >= s
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {s}
        </div>
      ))}

      {items.length > 0 && (
        <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 overflow-hidden">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-semibold text-primary whitespace-nowrap">
            Você está a 1 PASSO de ter
          </span>
          <AnimatePresence mode="wait">
            <motion.span
              key={benefitIndex}
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -16, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="text-sm font-bold text-primary truncate max-w-[200px] sm:max-w-none"
            >
              {allBenefits[benefitIndex]}
            </motion.span>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
