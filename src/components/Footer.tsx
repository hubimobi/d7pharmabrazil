import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t border-border bg-card py-12">
    <div className="container">
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <h3 className="text-lg font-bold text-primary">D7 Pharma Brazil</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Suplementos de alta performance com qualidade farmacêutica.
          </p>
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
            <span>contato@d7pharma.com.br</span>
            <span>(11) 99999-9999</span>
            <span>São Paulo, SP - Brasil</span>
          </div>
        </div>
      </div>
      <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} D7 Pharma Brazil. Todos os direitos reservados.
      </div>
    </div>
  </footer>
);

export default Footer;
