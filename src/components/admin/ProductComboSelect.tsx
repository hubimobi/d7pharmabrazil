import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProducts } from "@/hooks/useProducts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package } from "lucide-react";

interface ProductComboSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  allowNone?: boolean;
  noneLabel?: string;
  /** When true, value is slug instead of id */
  useSlug?: boolean;
}

export default function ProductComboSelect({
  value,
  onValueChange,
  placeholder = "Selecione...",
  allowNone = false,
  noneLabel = "Nenhum",
  useSlug = false,
}: ProductComboSelectProps) {
  const { data: products } = useProducts();

  const { data: combos } = useQuery({
    queryKey: ["combos-admin-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_combos" as any)
        .select("id, name, slug, active")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string; slug: string; active: boolean }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowNone && <SelectItem value="none">{noneLabel}</SelectItem>}

        {/* Products */}
        {(products || []).length > 0 && (
          <>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Produtos</div>
            {(products || []).map((p) => (
              <SelectItem key={p.id} value={useSlug ? p.slug : p.id}>
                {p.name}
              </SelectItem>
            ))}
          </>
        )}

        {/* Combos */}
        {(combos || []).length > 0 && (
          <>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Package className="h-3 w-3" /> Combos
            </div>
            {(combos || []).map((c) => (
              <SelectItem key={`combo-${c.id}`} value={useSlug ? c.slug : c.id}>
                📦 {c.name}
              </SelectItem>
            ))}
          </>
        )}
      </SelectContent>
    </Select>
  );
}
