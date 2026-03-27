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
    <section className="relative overflow-hidden bg-gradient-to-br from-primary to-primary/80 py-16 md:py-24">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-foreground/5 to-transparent" />
      <div className="container relative text-center">
        <h2 className="text-2xl font-bold text-primary-foreground md:text-4xl">
          Comece sua transformação agora
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-primary-foreground/80 text-lg">
          Milhares de clientes já confiam na D7 Pharma. Junte-se a eles e experimente suplementos de qualidade farmacêutica.
        </p>
        <div className="mt-8">
          <Link to="/produtos">
            <Button size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 px-10 py-6 text-base font-semibold shadow-lg">
              Ver Produtos
            </Button>
          </Link>
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-6 md:gap-8">
          {highlights.map((h) => (
            <div key={h.label} className="flex items-center gap-2 text-primary-foreground/80">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/10">
                <h.icon className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium">{h.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;
