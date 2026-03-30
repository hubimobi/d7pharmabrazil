import { useState, useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import ProductCard from "@/components/ProductCard";
import ComboCard from "@/components/ComboCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import SEOHead from "@/components/SEOHead";
import { useProducts } from "@/hooks/useProducts";
import { useCombos } from "@/hooks/useCombos";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

const PAGE_SIZE = 8;

type MixedItem =
  | { type: "product"; data: any }
  | { type: "combo"; data: any };

const ProductsPage = () => {
  const { data: products, isLoading } = useProducts();
  const { data: combos } = useCombos();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [groupFilter, setGroupFilter] = useState("all");

  const groups = useMemo(() => {
    if (!products) return [];
    const set = new Set(products.map((p: any) => p.groupName || "").filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [products]);

  const hasCombos = combos && combos.length > 0;

  const mixedItems: MixedItem[] = useMemo(() => {
    const items: MixedItem[] = [];

    if (groupFilter === "combos") {
      (combos ?? []).forEach((c) => items.push({ type: "combo", data: c }));
      return items;
    }

    if (groupFilter === "all" && combos) {
      combos.forEach((c) => items.push({ type: "combo", data: c }));
    }

    const filteredProducts = groupFilter === "all"
      ? (products ?? [])
      : (products ?? []).filter((p: any) => p.groupName === groupFilter);

    filteredProducts.forEach((p) => items.push({ type: "product", data: p }));

    return items;
  }, [products, combos, groupFilter]);

  const visible = mixedItems.slice(0, visibleCount);
  const hasMore = visibleCount < mixedItems.length;

  return (
    <div className="min-h-screen">
      <SEOHead title="Produtos" description="Suplementos com qualidade farmacêutica D7 Pharma Brazil" />
      <Header />
      <main className="container py-8 md:py-16">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">Nossos Produtos</h1>
        <p className="mt-2 text-muted-foreground">Suplementos com qualidade farmacêutica para resultados reais</p>

        {(groups.length > 0 || hasCombos) && (
          <div className="mt-6 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
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
            {hasCombos && (
              <button
                onClick={() => { setGroupFilter("combos"); setVisibleCount(PAGE_SIZE); }}
                className={`flex-shrink-0 rounded-full px-5 py-2 text-[11.2px] font-semibold uppercase tracking-wide transition-all whitespace-nowrap ${
                  groupFilter === "combos"
                    ? "bg-foreground text-background shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                🔥 Combos
              </button>
            )}
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

        {isLoading ? (
          <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
              {visible.map((item) =>
                item.type === "combo" ? (
                  <ComboCard key={`combo-${item.data.id}`} combo={item.data} />
                ) : (
                  <ProductCard key={`prod-${item.data.id}`} product={item.data} />
                )
              )}
            </div>
            {hasMore && (
              <div className="mt-10 text-center">
                <Button variant="outline" size="lg" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)} className="gap-2 rounded-full text-[11.2px] uppercase tracking-wide font-semibold px-8">
                  <ChevronDown className="h-4 w-4" /> Carregar Mais
                </Button>
              </div>
            )}
            {!isLoading && mixedItems.length === 0 && (
              <p className="mt-16 text-center text-muted-foreground">Nenhum produto encontrado.</p>
            )}
          </>
        )}
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default ProductsPage;
