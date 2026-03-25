import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Star, ShoppingCart, ShieldCheck, Truck, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProduct } from "@/hooks/useProducts";
import { useCart } from "@/hooks/useCart";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import SEOHead from "@/components/SEOHead";
import { useState } from "react";

const ProductDetail = () => {
  const { slug } = useParams();
  const { data: product, isLoading } = useProduct(slug);
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container py-20 text-center"><p className="text-muted-foreground">Carregando...</p></div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold">Produto não encontrado</h1>
          <Link to="/produtos"><Button className="mt-4">Ver todos os produtos</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  const discountPercent = Math.round((1 - product.price / product.originalPrice) * 100);

  return (
    <div className="min-h-screen">
      <SEOHead title={product.name} description={product.shortDescription} />
      <Header />
      <main className="container py-8 md:py-16">
        <Link to="/produtos" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Voltar aos Produtos
        </Link>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="flex items-center justify-center rounded-lg bg-muted p-8">
            <img src={product.image} alt={product.name} className="max-h-80 w-auto object-contain" width={320} height={320} />
          </div>

          <div>
            {product.badge && <Badge className="mb-3 bg-secondary text-secondary-foreground">{product.badge}</Badge>}
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">{product.name}</h1>

            <div className="mt-2 flex items-center gap-2">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < Math.floor(product.rating) ? "fill-warning text-warning" : "text-border"}`} />
                ))}
              </div>
              <span className="text-sm font-medium">{product.rating}</span>
              <span className="text-sm text-muted-foreground">({product.reviews} avaliações)</span>
            </div>

            {product.description.startsWith("<") ? (
              <div className="mt-4 prose prose-sm max-w-none text-muted-foreground dark:prose-invert [&_table]:w-full [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:bg-muted [&_th]:font-semibold [&_hr]:my-4 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-foreground [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-foreground [&_a]:text-primary [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: product.description }} />
            ) : (
              <p className="mt-4 text-muted-foreground">{product.description}</p>
            )}

            <div className="mt-6">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-primary">R$ {product.price.toFixed(2).replace(".", ",")}</span>
                <span className="text-lg text-muted-foreground line-through">R$ {product.originalPrice.toFixed(2).replace(".", ",")}</span>
                <Badge variant="secondary" className="bg-success/10 text-success">-{discountPercent}%</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">ou 3x de R$ {(product.price / 3).toFixed(2).replace(".", ",")} sem juros</p>
              <p className="mt-1 text-sm font-medium text-success">💰 R$ {(product.price * 0.95).toFixed(2).replace(".", ",")} no Pix (5% off)</p>
            </div>

            {product.stock <= 10 && (
              <p className="mt-3 animate-pulse-soft text-sm font-semibold text-destructive">⚠️ Apenas {product.stock} unidades em estoque!</p>
            )}

            <div className="mt-6 flex items-center gap-3">
              <div className="flex items-center rounded-md border border-border">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-2 text-lg font-medium text-muted-foreground hover:text-foreground">−</button>
                <span className="min-w-[2rem] text-center text-sm font-semibold">{qty}</span>
                <button onClick={() => setQty(qty + 1)} className="px-3 py-2 text-lg font-medium text-muted-foreground hover:text-foreground">+</button>
              </div>
              <Button size="lg" className="flex-1 gap-2" onClick={() => addItem(product, qty)}>
                <ShoppingCart className="h-5 w-5" /> Adicionar ao Carrinho
              </Button>
            </div>

            <div className="mt-6 space-y-2">
              {product.benefits.map((b) => (
                <div key={b} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-success" /><span>{b}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-4 rounded-lg bg-muted p-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><ShieldCheck className="h-4 w-4 text-primary" /> Qualidade ANVISA</span>
              <span className="flex items-center gap-1"><Truck className="h-4 w-4 text-primary" /> Frete Grátis +R$199</span>
              <span className="flex items-center gap-1">🔒 Pagamento Seguro</span>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default ProductDetail;
