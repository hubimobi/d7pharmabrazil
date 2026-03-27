import { useState, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ShoppingCart, Menu, X, Phone, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/hooks/useCart";
import { useStoreSettings } from "@/hooks/useStoreSettings";

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { items } = useCart();
  const { data: settings } = useStoreSettings();
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotal = items.reduce((sum, i) => sum + i.quantity * i.product.price, 0);
  const navigate = useNavigate();
  const location = useLocation();

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
    }
  };

  const headerLogo = settings?.horizontal_logo_url || settings?.logo_url;

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
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produtos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 rounded-xl bg-muted border-none focus-visible:ring-1"
            />
          </div>
        </form>

        <nav className="hidden items-center gap-5 lg:flex">
          <Link to="/" className="text-sm font-medium text-foreground/70 hover:text-primary">Início</Link>
          <Link to="/produtos" className="text-sm font-medium text-foreground/70 hover:text-primary">Produtos</Link>
          <a href="/#beneficios" onClick={(e) => handleAnchorClick(e, "#beneficios")} className="text-sm font-medium text-foreground/70 hover:text-primary cursor-pointer">Benefícios</a>
          <a href="/#depoimentos" onClick={(e) => handleAnchorClick(e, "#depoimentos")} className="text-sm font-medium text-foreground/70 hover:text-primary cursor-pointer">Depoimentos</a>
          <Link to="/acompanhar-pedido" className="text-sm font-medium text-foreground/70 hover:text-primary">Meu Pedido</Link>
        </nav>

        <div className="flex items-center gap-2">
          {/* Mobile search toggle */}
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
        <div className="border-t border-border bg-background p-3 md:hidden">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produtos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-xl bg-muted border-none"
                autoFocus
              />
            </div>
          </form>
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
