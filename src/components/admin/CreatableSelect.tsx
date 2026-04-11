import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronsUpDown, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  table: "product_groups" | "manufacturers";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function CreatableSelect({ table, value, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const { tenantId } = useTenant();
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const { data: items = [] } = useQuery({
    queryKey: [table],
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select("*").order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  const create = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from(table).insert({ name });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [table] });
    },
  });

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  const canCreate = search.trim() && !items.some(
    (i) => i.name.toLowerCase() === search.trim().toLowerCase()
  );

  const handleCreate = async () => {
    const name = search.trim();
    await create.mutateAsync(name);
    onChange(name);
    setSearch("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
          {value || <span className="text-muted-foreground">{placeholder || "Selecionar..."}</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="p-2">
          <Input
            placeholder="Buscar ou criar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
            autoFocus
          />
        </div>
        <div className="max-h-48 overflow-y-auto">
          {filtered.length === 0 && !canCreate && (
            <p className="p-3 text-center text-sm text-muted-foreground">Nenhum item encontrado</p>
          )}
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition",
                value === item.name && "bg-accent"
              )}
              onClick={() => {
                onChange(item.name);
                setSearch("");
                setOpen(false);
              }}
            >
              <Check className={cn("h-4 w-4", value === item.name ? "opacity-100" : "opacity-0")} />
              {item.name}
            </button>
          ))}
          {canCreate && (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-accent transition border-t"
              onClick={handleCreate}
              disabled={create.isPending}
            >
              <Plus className="h-4 w-4" />
              {create.isPending ? "Criando..." : `Criar "${search.trim()}"`}
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
