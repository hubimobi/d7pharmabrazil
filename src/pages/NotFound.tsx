import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { Button } from "@/components/ui/button";
import { Home, ShoppingBag, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: settings } = useStoreSettings();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <img
            src={settings?.logo_url || "/placeholder.svg"}
            alt={settings?.store_name || "Loja"}
            className="h-20 w-20 rounded-2xl object-contain"
          />
        </div>

        {/* Error code */}
        <div>
          <h1
            className="font-heading text-[clamp(72px,15vw,112px)] font-bold leading-none"
            style={{ color: "var(--design-title, hsl(var(--primary)))" }}
          >
            404
          </h1>
          <p
            className="mt-2 text-lg font-medium uppercase tracking-widest"
            style={{ color: "var(--design-text, hsl(var(--muted-foreground)))" }}
          >
            Página não encontrada
          </p>
        </div>

        {/* Message */}
        <div
          className="rounded-3xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 shadow-lg"
        >
          <p className="text-muted-foreground text-sm leading-relaxed">
            Ops! Parece que esta página não existe ou foi movida.
            <br />
            Mas não se preocupe, você pode voltar ao início ou explorar nossos produtos.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            size="lg"
            onClick={() => navigate("/")}
            className="gap-2 rounded-2xl"
          >
            <Home className="h-4 w-4" />
            Voltar ao Início
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate("/produtos")}
            className="gap-2 rounded-2xl"
          >
            <ShoppingBag className="h-4 w-4" />
            Ver Produtos
          </Button>
        </div>

        {/* Back link */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Voltar à página anterior
        </button>
      </div>
    </div>
  );
};

export default NotFound;
