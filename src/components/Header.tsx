import { useState, useCallback, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ShoppingCart, Menu, X, Phone, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/hooks/useCart";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useProducts, type Product } from "@/hooks/useProducts";

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const { items } = useCart();
  const { data: settings } = useStoreSettings();
  const { data: allProducts } = useProducts();
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotal = items.reduce((sum, i) => sum + i.quantity * i.product.price, 0);
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);

  const filtered = searchQuery.trim().length >= 2
    ? (allProducts || []).filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.shortDescription.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 6)
    : [];

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        searchRef.current && !searchRef.current.contains(e.target as Node) &&
        mobileSearchRef.current && !mobileSearchRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleAnchorClick = useCallback(
    (e: React.MouseEvent, hash: string) => {
      e.preventDefault();
      setMobileOpen(false);
      if (location.pathname !== "/") {
        navigate("/" + hash);
      } else {
        const el = document.querySelector(hash);
        el?.scrollIntoView({ behavior: "smooth" });
      }
    },
    [location.pathname, navigate]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/produtos?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setSearchOpen(false);
      setShowResults(false);
    }
  };

  const selectProduct = (product: Product) => {
    setSearchQuery("");
    setShowResults(false);
    setSearchOpen(false);
    navigate(`/produto/${product.slug}`);
  };

  const headerLogo = settings?.horizontal_logo_url || settings?.logo_url;

  const SearchResults = () => {
    if (!showResults || searchQuery.trim().length < 2) return null;
    return (
      <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-border bg-background shadow-lg z-50 overflow-hidden max-h-80 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">Nenhum produto encontrado</div>
        ) : (
          filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => selectProduct(p)}
              className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-muted/60 transition-colors"
            >
              <img src={p.image} alt={p.name} className="h-10 w-10 rounded-lg object-cover flex-shrink-0 bg-muted" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground">R$ {p.price.toFixed(2).replace(".", ",")}</p>
              </div>
            </button>
          ))
        )}
        {filtered.length > 0 && (
          <button
            onClick={() => handleSearch({ preventDefault: () => {} } as React.FormEvent)}
            className="w-full border-t border-border px-3 py-2.5 text-center text-xs font-medium text-primary hover:bg-muted/40 transition"
          >
            Ver todos os resultados para "{searchQuery}"
          </button>
        )}
      </div>
    );
  };

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur shadow-sm supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          {headerLogo ? (
            <img src={headerLogo} alt={settings?.store_name || "Logo"} className="h-10 w-auto max-w-[240px] object-contain" />
          ) : (
            <span className="text-xl font-bold text-primary">
              D7 <span className="text-secondary">Pharma</span> Brazil
            </span>
          )}
        </Link>

        {/* Desktop search */}
        <div ref={searchRef} className="hidden md:block flex-1 max-w-md relative">
          <form onSubmit={handleSearch}>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produtos..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowResults(true); }}
                onFocus={() => setShowResults(true)}
                className="pl-9 h-10 rounded-xl bg-muted border-none focus-visible:ring-1"
              />
            </div>
          </form>
          <SearchResults />
        </div>

        <nav className="hidden items-center gap-5 lg:flex">
          <Link to="/" className="text-sm font-medium text-foreground/70 hover:text-primary">Início</Link>
          <Link to="/produtos" className="text-sm font-medium text-foreground/70 hover:text-primary">Produtos</Link>
          <a href="/#beneficios" onClick={(e) => handleAnchorClick(e, "#beneficios")} className="text-sm font-medium text-foreground/70 hover:text-primary cursor-pointer">Benefícios</a>
          <a href="/#depoimentos" onClick={(e) => handleAnchorClick(e, "#depoimentos")} className="text-sm font-medium text-foreground/70 hover:text-primary cursor-pointer">Depoimentos</a>
          <Link to="/acompanhar-pedido" className="text-sm font-medium text-foreground/70 hover:text-primary">Meu Pedido</Link>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setSearchOpen(!searchOpen)}>
            <Search className="h-4 w-4" />
          </Button>

          <a href="tel:+5500000000000" className="hidden items-center gap-1 text-[13px] font-medium text-muted-foreground lg:flex">
            <Phone className="h-3.5 w-3.5" />
            Fale Conosco
          </a>
          <Link to="/checkout">
            <Button variant="ghost" size="sm" className="relative gap-1.5">
              <ShoppingCart className="h-4 w-4" />
              {totalItems > 0 && (
                <>
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-success text-2xs font-bold text-success-foreground">
                    {totalItems}
                  </span>
                  <span className="hidden md:inline text-xs text-muted-foreground">
                    R$ {cartTotal.toFixed(0)}
                  </span>
                </>
              )}
            </Button>
          </Link>
          <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile search bar */}
      {searchOpen && (
        <div ref={mobileSearchRef} className="border-t border-border bg-background p-3 md:hidden relative">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produtos..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowResults(true); }}
                onFocus={() => setShowResults(true)}
                className="pl-9 rounded-xl bg-muted border-none"
                autoFocus
              />
            </div>
          </form>
          <SearchResults />
        </div>
      )}

      {mobileOpen && (
        <div className="border-t border-border bg-background p-4 lg:hidden">
          <nav className="flex flex-col gap-3">
            <Link to="/" onClick={() => setMobileOpen(false)} className="text-sm font-medium">Início</Link>
            <Link to="/produtos" onClick={() => setMobileOpen(false)} className="text-sm font-medium">Produtos</Link>
            <a href="/#beneficios" onClick={(e) => handleAnchorClick(e, "#beneficios")} className="text-sm font-medium cursor-pointer">Benefícios</a>
            <a href="/#depoimentos" onClick={(e) => handleAnchorClick(e, "#depoimentos")} className="text-sm font-medium cursor-pointer">Depoimentos</a>
            <Link to="/checkout" onClick={() => setMobileOpen(false)} className="text-sm font-medium">Carrinho</Link>
            <Link to="/acompanhar-pedido" onClick={() => setMobileOpen(false)} className="text-sm font-medium">Meu Pedido</Link>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
