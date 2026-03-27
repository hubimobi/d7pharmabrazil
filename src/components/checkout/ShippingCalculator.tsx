import { useState } from "react";
import { Truck, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ShippingOption {
  id: number;
  name: string;
  company: string;
  price: number;
  delivery_time: number;
  logo: string;
}

interface ShippingCalculatorProps {
  cep: string;
  onCepChange: (cep: string) => void;
  items: { price: number; quantity: number; weight: number; height: number; width: number; length: number }[];
  selectedOption: ShippingOption | null;
  onSelectOption: (option: ShippingOption) => void;
}

export default function ShippingCalculator({
  cep,
  onCepChange,
  items,
  selectedOption,
  onSelectOption,
}: ShippingCalculatorProps) {
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculated, setCalculated] = useState(false);

  const formatCep = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return digits;
  };

  const calculate = async () => {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) {
      toast.error("Digite um CEP válido com 8 dígitos");
      return;
    }

    setLoading(true);
    setOptions([]);
    setCalculated(false);

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
        setOptions(data.options);
        setCalculated(true);
      } else {
        toast.error("Nenhuma opção de frete disponível para esse CEP");
      }
    } catch {
      toast.error("Erro ao calcular frete. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-1.5 text-sm font-semibold">
        <Truck className="h-4 w-4" /> Calcular Frete
      </Label>
      <div className="flex gap-2">
        <Input
          placeholder="00000-000"
          value={cep}
          onChange={(e) => {
            onCepChange(formatCep(e.target.value));
            setCalculated(false);
          }}
          className="max-w-[160px]"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={calculate}
          disabled={loading}
          className={loading ? "" : "animate-pulse-soft border-primary text-primary hover:bg-primary/10"}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Calcular"}
        </Button>
      </div>

      {calculated && options.length > 0 && (
        <div className="space-y-2">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`flex w-full items-center gap-3 rounded-lg border-2 p-3 text-left transition ${
                selectedOption?.id === opt.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              }`}
              onClick={() => onSelectOption(opt)}
            >
              {opt.logo && (
                <img src={opt.logo} alt={opt.company} className="h-8 w-8 rounded object-contain" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {opt.company} — {opt.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Entrega em até {opt.delivery_time} dias úteis
                </p>
              </div>
              <span className="text-sm font-bold text-primary">
                {opt.price === 0
                  ? "Grátis"
                  : `R$ ${opt.price.toFixed(2).replace(".", ",")}`}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
