import { useStoreSettings } from "@/hooks/useStoreSettings";
import { Lock, CreditCard, Truck, Package } from "lucide-react";

const TrustBadges = () => {
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
    <section className="py-6 md:py-8">
      <div className="container">
        <div className="flex flex-wrap justify-center gap-4 md:gap-8">
          {highlights.map((h) => (
            <div key={h.label} className="flex items-center gap-2 text-muted-foreground">
              <div className="flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-full bg-muted">
                <h.icon className="h-4 w-4 md:h-[18px] md:w-[18px]" />
              </div>
              <span className="text-xs md:text-sm font-medium">{h.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustBadges;
