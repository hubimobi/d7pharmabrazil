import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { Lock, CreditCard, Truck, Package } from "lucide-react";

const FinalCTA = () => {
  const { data: settings } = useStoreSettings();

  const freeShippingEnabled = settings?.free_shipping_enabled ?? false;
  const freeShippingMin = settings?.free_shipping_min_value ?? 199;

  const highlights = [
    { icon: Lock, label: "Pagamento Seguro" },
    { icon: CreditCard, label: "Pix e Cartão" },
    ...(freeShippingEnabled
      ? [{ icon: Truck, label: `Frete Grátis acima de R$${freeShippingMin}` }]
      : []),
    { icon: Package, label: "Parcele em até 3x" },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-secondary py-12 md:py-24">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-foreground/5 to-transparent" />
      <div className="container relative text-center">
        <h2 className="text-2xl font-bold text-primary-foreground md:text-4xl">
          {(settings as any)?.cta_title || "Comece sua transformação agora"}
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-primary-foreground/80 text-sm md:text-lg">
          {(settings as any)?.cta_subtitle || "Milhares de clientes já confiam na D7 Pharma. Junte-se a eles e experimente suplementos de qualidade farmacêutica."}
        </p>
        <div className="mt-8 md:mt-10">
          <Link to="/produtos">
            <Button size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 hover:scale-105 px-10 md:px-14 py-6 md:py-7 text-base md:text-lg font-semibold shadow-xl rounded-xl transition-transform">
              Ver Produtos
            </Button>
          </Link>
        </div>
        <div className="mt-8 md:mt-12 flex flex-wrap justify-center gap-4 md:gap-8">
          {highlights.map((h) => (
            <div key={h.label} className="flex items-center gap-2 text-primary-foreground/80">
              <div className="flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-full bg-primary-foreground/10">
                <h.icon className="h-4 w-4 md:h-4.5 md:w-4.5" />
              </div>
              <span className="text-xs md:text-sm font-medium">{h.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;
