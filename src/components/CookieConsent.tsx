import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

const COOKIE_KEY = "lgpd_consent_accepted";

const CookieConsent = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem(COOKIE_KEY);
    if (!accepted) {
      const timer = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_KEY, "true");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] bg-card border-t border-border shadow-2xl animate-fade-in">
      <div className="container py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5 sm:mt-0" />
        <p className="text-sm text-muted-foreground flex-1">
          Utilizamos cookies e tecnologias semelhantes para melhorar sua experiência. Ao continuar navegando, você concorda com nossa{" "}
          <Link to="/politica-de-privacidade" className="underline text-foreground hover:text-primary">
            Política de Privacidade
          </Link>{" "}
          e nossos{" "}
          <Link to="/termos-de-uso" className="underline text-foreground hover:text-primary">
            Termos de Uso
          </Link>.
        </p>
        <Button onClick={handleAccept} size="sm" className="flex-shrink-0">
          Aceitar e Continuar
        </Button>
      </div>
    </div>
  );
};

export default CookieConsent;
