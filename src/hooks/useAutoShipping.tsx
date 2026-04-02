import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShippingOption } from "@/components/checkout/ShippingCalculator";

interface ShippingItem {
  price: number;
  quantity: number;
  weight: number;
  height: number;
  width: number;
  length: number;
}

export function useAutoShipping() {
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null);

  const calculateShipping = useCallback(async (cep: string, items: ShippingItem[]) => {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8 || items.length === 0) return;

    setShippingLoading(true);
    setShippingOptions([]);

    try {
      const produtos = items.map((i) => ({
        price: i.price,
        quantity: i.quantity,
        weight: i.weight,
        height: i.height,
        width: i.width,
        length: i.length,
      }));

      const { data, error } = await supabase.functions.invoke("calculate-shipping", {
        body: { cep_destino: clean, produtos },
      });

      if (error) throw error;

      if (data?.options?.length > 0) {
        setShippingOptions(data.options);
      }
    } catch {
      // silently fail - shipping options just won't show
    } finally {
      setShippingLoading(false);
    }
  }, []);

  return {
    shippingOptions,
    shippingLoading,
    selectedShipping,
    setSelectedShipping,
    calculateShipping,
  };
}
