import { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import ProductCard from "@/components/ProductCard";
import ComboCard from "@/components/ComboCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import ProductSidebar from "@/components/ProductSidebar";
import SEOHead from "@/components/SEOHead";
import { useProducts } from "@/hooks/useProducts";
import { useCombos } from "@/hooks/useCombos";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const PAGE_SIZE = 12;

type SortOption = "featured" | "price_asc" | "price_desc" | "best_sellers" | "name_asc";

type MixedItem =
  | { type: "product"; data: any }
  | { type: "combo"; data: any };

const SORT_LABELS: Record<SortOption, string> = {
  featured: "Destaque",
  price_asc: "Menor Preço",
  price_desc: "Maior Preço",
  best_sellers: "Mais Vendidos",
  name_asc: "Nome (A-Z)",
};

const ProductsPage = () => {
  const { data: products, isLoading } = useProducts();
  const { data: combos } = useCombos();
  const { data: settings } = useStoreSettings();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [groupFilter, setGroupFilter] = useState(searchParams.get("category") || "all");
  const [sort, setSort] = useState<SortOption>("featured");
  const [selectedManufacturers, setSelectedManufacturers] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 99999]);
  const [priceInitialized, setPriceInitialized] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const sidebarEnabled = (settings as any)?.products_sidebar_enabled !== false;

  // Derive filter options from products
  const manufacturers = useMemo(() => {
    if (!products) return [];
    const map = new Map<string, number>();
    products.forEach((p: any) => {
      const m = p.manufacturer || "";
      if (m) map.set(m, (map.get(m) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [products]);

  const categories = useMemo(() => {
    if (!products) return [];
    const map = new Map<string, number>();
    products.forEach((p: any) => {
      const g = p.groupName || "";
      if (g) map.set(g, (map.get(g) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [products]);

  const maxPrice = useMemo(() => {
    if (!products || products.length === 0) return 0;
    const max = Math.ceil(Math.max(...products.map((p: any) => p.price)));
    if (!priceInitialized && max > 0) {
      setPriceRange([0, max]);
      setPriceInitialized(true);
    }
    return max;
  }, [products, priceInitialized]);

  const hasCombos = combos && combos.length > 0;

  const groups = useMemo(() => {
    if (!products) return [];
    const set = new Set(products.map((p: any) => p.groupName || "").filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [products]);

  const toggleFilter = (list: string[], value: string, setter: (v: string[]) => void) => {
    setter(list.includes(value) ? list.filter((v2) => v2 !== value) : [...list, value]);
    setVisibleCount(PAGE_SIZE);
  };

  // Filter + sort
  const mixedItems: MixedItem[] = useMemo(() => {
    const items: MixedItem[] = [];

    if (groupFilter === "combos") {
      (combos ?? []).forEach((c) => items.push({ type: "combo", data: c }));
      return items;
    }

    if (groupFilter === "all" && combos) {
      combos.forEach((c) => items.push({ type: "combo", data: c }));
    }

    let filtered = groupFilter === "all"
      ? (products ?? [])
      : (products ?? []).filter((p: any) => p.groupName === groupFilter);

    // Apply sidebar filters
    if (selectedManufacturers.length > 0) {
      filtered = filtered.filter((p: any) => selectedManufacturers.includes(p.manufacturer || ""));
    }
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((p: any) => selectedCategories.includes(p.groupName || ""));
    }
    filtered = filtered.filter((p: any) => p.price >= priceRange[0] && p.price <= priceRange[1]);

    // Sort
    const sorted = [...filtered];
    switch (sort) {
      case "price_asc":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        sorted.sort((a, b) => b.price - a.price);
        break;
      case "best_sellers":
        sorted.sort((a, b) => (b.reviews || 0) - (a.reviews || 0));
        break;
      case "name_asc":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "featured":
        sorted.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        break;
    }

    sorted.forEach((p) => items.push({ type: "product", data: p }));
    return items;
  }, [products, combos, groupFilter, sort, selectedManufacturers, selectedCategories, priceRange]);

  const visible = mixedItems.slice(0, visibleCount);
  const hasMore = visibleCount < mixedItems.length;

  const activeFiltersCount = selectedManufacturers.length + selectedCategories.length + (priceRange[0] > 0 || priceRange[1] < maxPrice ? 1 : 0);

  const clearFilters = () => {
    setSelectedManufacturers([]);
    setSelectedCategories([]);
    setPriceRange([0, maxPrice]);
    setGroupFilter("all");
    setVisibleCount(PAGE_SIZE);
  };

  // Current breadcrumb label
  const breadcrumbLabel = groupFilter === "all" ? null : groupFilter === "combos" ? "Combos" : groupFilter;

  const sidebarContent = (
    <ProductSidebar
      manufacturers={manufacturers}
      selectedManufacturers={selectedManufacturers}
      onToggleManufacturer={(v) => toggleFilter(selectedManufacturers, v, setSelectedManufacturers)}
      categories={categories}
      selectedCategories={selectedCategories}
      onToggleCategory={(v) => toggleFilter(selectedCategories, v, setSelectedCategories)}
      priceRange={priceRange}
      maxPrice={maxPrice}
      onPriceChange={setPriceRange}
    />
  );

  return (
    <div className="min-h-screen">
      <SEOHead title="Produtos" description="Suplementos com qualidade farmacêutica D7 Pharma Brazil" />
      <Header />
      <main className="container py-6 md:py-12">
        {/* Breadcrumbs */}
        <nav className="mb-4 flex items-center gap-1 text-xs text-muted-foreground">
          <span className="font-semibold text-primary">Você está em:</span>
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3" />
          {breadcrumbLabel ? (
            <>
              <Link to="/produtos" className="hover:text-primary transition-colors">Produtos</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground font-medium">{breadcrumbLabel}</span>
            </>
          ) : (
            <span className="text-foreground font-medium">Produtos</span>
          )}
        </nav>

        {/* Title + Sort */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">
              {breadcrumbLabel ? breadcrumbLabel.toUpperCase() : "TODOS OS PRODUTOS"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {isMobile && sidebarEnabled && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMobileFilters(true)}
                className="gap-2 text-xs"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filtros
                {activeFiltersCount > 0 && (
                  <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">{activeFiltersCount}</span>
                )}
              </Button>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Ordenar por:</span>
              <Select value={sort} onValueChange={(v) => { setSort(v as SortOption); setVisibleCount(PAGE_SIZE); }}>
                <SelectTrigger className="w-[180px] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SORT_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Category tabs */}
        {(groups.length > 0 || hasCombos) && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
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

        {activeFiltersCount > 0 && (
          <div className="mt-3">
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground gap-1">
              <X className="h-3 w-3" /> Limpar filtros ({activeFiltersCount})
            </Button>
          </div>
        )}

        {/* Main content with optional sidebar */}
        <div className={`mt-6 ${sidebarEnabled ? "flex gap-8" : ""}`}>
          {/* Desktop sidebar */}
          {sidebarEnabled && !isMobile && (
            <div className="hidden md:block w-64 flex-shrink-0">
              {sidebarContent}
            </div>
          )}

          {/* Products grid */}
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
                {Array.from({ length: PAGE_SIZE }).map((_, i) => <ProductCardSkeleton key={i} />)}
              </div>
            ) : (
              <>
                <div className={`grid grid-cols-2 ${sidebarEnabled ? "lg:grid-cols-3" : "lg:grid-cols-4"} gap-3 md:gap-6`}>
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
          </div>
        </div>

        {/* Mobile filter drawer */}
        {showMobileFilters && (
          <div className="fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowMobileFilters(false)} />
            <div className="relative ml-auto w-80 max-w-[85vw] bg-background h-full overflow-y-auto p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold">Filtros</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowMobileFilters(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              {sidebarContent}
              <div className="mt-6">
                <Button className="w-full" onClick={() => setShowMobileFilters(false)}>
                  Aplicar Filtros
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default ProductsPage;
