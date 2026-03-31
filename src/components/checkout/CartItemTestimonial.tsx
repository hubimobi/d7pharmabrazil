import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface Props {
  productId: string;
  customerState?: string;
}

const STATES_SHORT: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia",
  CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás",
  MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais",
  PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí",
  RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RS: "Rio Grande do Sul",
  RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo",
  SE: "Sergipe", TO: "Tocantins",
};

export default function CartItemTestimonial({ productId, customerState }: Props) {
  const [index, setIndex] = useState(0);

  const { data: testimonials } = useQuery({
    queryKey: ["cart-testimonials", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_testimonials")
        .select("author_name, content, rating")
        .eq("product_id", productId)
        .eq("approved", true)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const displayTestimonials = useMemo(() => {
    if (!testimonials?.length) return [];
    return testimonials.map((t) => ({
      ...t,
      state: customerState || "SP",
    }));
  }, [testimonials, customerState]);

  useEffect(() => {
    if (displayTestimonials.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % displayTestimonials.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [displayTestimonials.length]);

  if (!displayTestimonials.length) return null;

  const t = displayTestimonials[index];
  const stateName = STATES_SHORT[t.state] || t.state;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.3 }}
        className="mt-1"
      >
        <p className="text-xs text-muted-foreground italic leading-relaxed">
          <span className="inline-flex gap-0.5 mr-1 align-middle">
            {Array.from({ length: Math.min(5, t.rating) }).map((_, i) => (
              <Star key={i} className="h-2.5 w-2.5 fill-warning text-warning inline" />
            ))}
          </span>
          "{t.content.length > 80 ? t.content.slice(0, 80) + "…" : t.content}"
          {" "}— <span className="font-medium text-foreground/70">{t.author_name}</span>, {stateName}
        </p>
      </motion.div>
    </AnimatePresence>
  );
}
