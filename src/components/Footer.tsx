import { Link } from "react-router-dom";
import { useStoreSettings } from "@/hooks/useStoreSettings";

const Footer = () => {
  const { data: settings } = useStoreSettings();

  const storeName = settings?.store_name || "D7 Pharma Brazil";
  const email = settings?.email || "contato@d7pharma.com.br";
  const whatsapp = settings?.whatsapp || "(11) 99999-9999";
  const city = settings?.address_city || "São Paulo";
  const state = settings?.address_state || "SP";

  const socials = [
    { label: "Instagram", url: settings?.instagram },
    { label: "Facebook", url: settings?.facebook },
    { label: "TikTok", url: settings?.tiktok },
    { label: "YouTube", url: settings?.youtube },
  ].filter((s) => s.url);

  return (
    <footer className="border-t border-border bg-card py-12">
      <div className="container">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="text-lg font-bold text-primary">{storeName}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Suplementos de alta performance com qualidade farmacêutica.
            </p>
            {socials.length > 0 && (
              <div className="mt-4 flex gap-3">
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-muted-foreground hover:text-primary transition"
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">Navegação</h4>
            <nav className="mt-3 flex flex-col gap-2">
              <Link to="/" className="text-sm text-muted-foreground hover:text-primary">Início</Link>
              <Link to="/produtos" className="text-sm text-muted-foreground hover:text-primary">Produtos</Link>
              <Link to="/checkout" className="text-sm text-muted-foreground hover:text-primary">Carrinho</Link>
            </nav>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">Institucional</h4>
            <nav className="mt-3 flex flex-col gap-2">
              <span className="text-sm text-muted-foreground">Política de Privacidade</span>
              <span className="text-sm text-muted-foreground">Termos de Uso</span>
              <span className="text-sm text-muted-foreground">Trocas e Devoluções</span>
            </nav>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">Contato</h4>
            <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
              <span>{email}</span>
              <span>{whatsapp}</span>
              <span>{city}, {state} - Brasil</span>
              {settings?.cnpj && <span className="text-xs">CNPJ: {settings.cnpj}</span>}
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {storeName}. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
