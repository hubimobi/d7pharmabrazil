import { useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingCart, Menu, X, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { useStoreSettings } from "@/hooks/useStoreSettings";

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { items } = useCart();
  const { data: settings } = useStoreSettings();
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt={settings?.store_name || "Logo"} className="h-10 object-contain" />
          ) : (
            <span className="text-xl font-bold text-primary">
              D7 <span className="text-secondary">Pharma</span> Brazil
            </span>
          )}
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link to="/" className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary">Início</Link>
          <Link to="/produtos" className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary">Produtos</Link>
          <Link to="/#beneficios" className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary">Benefícios</Link>
          <Link to="/#depoimentos" className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary">Depoimentos</Link>
          <Link to="/acompanhar-pedido" className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary">Meu Pedido</Link>
        </nav>

        <div className="flex items-center gap-3">
          <a href="tel:+5500000000000" className="hidden items-center gap-1 text-xs font-medium text-muted-foreground md:flex">
            <Phone className="h-3.5 w-3.5" />
            Fale Conosco
          </a>
          <Link to="/checkout">
            <Button variant="outline" size="sm" className="relative">
              <ShoppingCart className="h-4 w-4" />
              {totalItems > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground">
                  {totalItems}
                </span>
              )}
            </Button>
          </Link>
          <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-background p-4 md:hidden">
          <nav className="flex flex-col gap-3">
            <Link to="/" onClick={() => setMobileOpen(false)} className="text-sm font-medium">Início</Link>
            <Link to="/produtos" onClick={() => setMobileOpen(false)} className="text-sm font-medium">Produtos</Link>
            <Link to="/checkout" onClick={() => setMobileOpen(false)} className="text-sm font-medium">Carrinho</Link>
            <Link to="/acompanhar-pedido" onClick={() => setMobileOpen(false)} className="text-sm font-medium">Meu Pedido</Link>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
