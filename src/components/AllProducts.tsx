import { useState, useMemo } from "react";
import ProductCard from "@/components/ProductCard";
import ComboCard from "@/components/ComboCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import { useProducts } from "@/hooks/useProducts";
import { useCombos } from "@/hooks/useCombos";
import { Button } from "@/components/ui/button";
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
    <section className="py-12 md:py-24">
      <div className="container">
        <div className="flex flex-col gap-4">
          <div>
            <span className="label-section text-muted-foreground mb-2 block">Catálogo</span>
            <h2 className="heading-section text-foreground">
              Todos os Produtos
            </h2>
            <p className="mt-2 text-base md:text-lg text-muted-foreground">
              Conheça nossa linha completa de suplementos
            </p>
          </div>
          {groups.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => { setGroupFilter("all"); setVisibleCount(PAGE_SIZE); }}
                className={`flex-shrink-0 rounded-full px-5 py-2 text-[11.2px] font-semibold uppercase tracking-wide transition-all ${
                  groupFilter === "all"
                    ? "bg-foreground text-background shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Todos
              </button>
              {groups.map((g) => (
                <button
                  key={g}
                  onClick={() => { setGroupFilter(g); setVisibleCount(PAGE_SIZE); }}
                  className={`flex-shrink-0 rounded-full px-5 py-2 text-[11.2px] font-semibold uppercase tracking-wide transition-all whitespace-nowrap ${
                    groupFilter === g
                      ? "bg-foreground text-background shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
              {visible.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            {hasMore && (
              <div className="mt-10 text-center">
                <Button variant="outline" size="lg" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)} className="gap-2 rounded-full text-[11.2px] uppercase tracking-wide font-semibold px-8">
                  <ChevronDown className="h-4 w-4" /> Carregar Mais
                </Button>
              </div>
            )}
            {!isLoading && filtered.length === 0 && (
              <p className="mt-16 text-center text-muted-foreground">Nenhum produto encontrado.</p>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default AllProducts;
