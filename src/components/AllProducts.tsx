import { useState, useMemo } from "react";
import ProductCard from "@/components/ProductCard";
import { useProducts } from "@/hooks/useProducts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown } from "lucide-react";

const PAGE_SIZE = 6;

const AllProducts = () => {
  const { data: products, isLoading } = useProducts();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [groupFilter, setGroupFilter] = useState("all");

  const groups = useMemo(() => {
    if (!products) return [];
    const set = new Set(products.map((p: any) => p.groupName || "").filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [products]);

  const filtered = useMemo(() => {
    if (!products) return [];
    if (groupFilter === "all") return products;
    return products.filter((p: any) => p.groupName === groupFilter);
  }, [products, groupFilter]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              Todos os Produtos
            </h2>
            <p className="mt-1 text-muted-foreground">
              Conheça nossa linha completa de suplementos
            </p>
          </div>
          {groups.length > 1 && (
            <Select value={groupFilter} onValueChange={(v) => { setGroupFilter(v); setVisibleCount(PAGE_SIZE); }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Grupos</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {isLoading ? (
          <p className="mt-12 text-center text-muted-foreground">Carregando...</p>
        ) : (
          <>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            {hasMore && (
              <div className="mt-8 text-center">
                <Button variant="outline" size="lg" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)} className="gap-2">
                  <ChevronDown className="h-4 w-4" /> Carregar Mais
                </Button>
              </div>
            )}
            {!isLoading && filtered.length === 0 && (
              <p className="mt-12 text-center text-muted-foreground">Nenhum produto encontrado.</p>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default AllProducts;
