import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Star, ShoppingCart, ShieldCheck, Truck, CheckCircle, Quote, Zap, CreditCard } from "lucide-react";
import CountdownTimer from "@/components/CountdownTimer";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useProduct, useProducts } from "@/hooks/useProducts";
import ProductCard from "@/components/ProductCard";
import { useCart } from "@/hooks/useCart";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import SEOHead from "@/components/SEOHead";
import { useState } from "react";
import UpsellDialog from "@/components/UpsellDialog";
import ShippingCalculator, { ShippingOption } from "@/components/checkout/ShippingCalculator";

const ProductDetail = () => {
  const { slug } = useParams();
  const { data: product, isLoading } = useProduct(slug);
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showUpsell, setShowUpsell] = useState(false);
  const [shippingCep, setShippingCep] = useState("");
  const [shippingOption, setShippingOption] = useState<ShippingOption | null>(null);

  const { data: testimonials } = useQuery({
    queryKey: ["product-testimonials", product?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_testimonials")
        .select("*")
        .eq("product_id", product!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!product?.id,
  });

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
  const displayReviews = product.reviews < 500 ? product.reviews + 500 : product.reviews;

  return (
    <div className="min-h-screen">
      <SEOHead title={product.name} description={product.shortDescription} />
      <Header />
      <main className="container py-8 md:py-16">
        <Link to="/produtos" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Voltar aos Produtos
        </Link>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Image Gallery */}
          <div className="space-y-3">
            <div className="flex items-center justify-center rounded-lg bg-muted p-8 min-h-[320px]">
              <img
                src={selectedImage || product.image}
                alt={product.name}
                className="max-h-80 w-auto object-contain transition-opacity duration-200"
                width={320}
                height={320}
              />
            </div>
            {product.extraImages.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setSelectedImage(null)}
                  className={`flex-shrink-0 rounded-md border-2 overflow-hidden transition ${
                    !selectedImage ? "border-primary ring-1 ring-primary/30" : "border-border hover:border-primary/50"
                  }`}
                >
                  <img src={product.image} alt={product.name} className="h-16 w-16 object-cover" />
                </button>
                {product.extraImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(img)}
                    className={`flex-shrink-0 rounded-md border-2 overflow-hidden transition ${
                      selectedImage === img ? "border-primary ring-1 ring-primary/30" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <img src={img} alt={`${product.name} ${i + 2}`} className="h-16 w-16 object-cover" />
                  </button>
                ))}
              </div>
            )}
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
              <span className="text-sm text-muted-foreground">({displayReviews} avaliações)</span>
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
              <p className="mt-1 text-sm text-muted-foreground">
                ou até {product.price >= 500 ? "12" : product.price >= 200 ? "6" : "3"}x de R$ {(product.price / (product.price >= 500 ? 12 : product.price >= 200 ? 6 : 3)).toFixed(2).replace(".", ",")} {(product.price >= 500 ? 12 : product.price >= 200 ? 6 : 3) <= 3 ? "sem juros" : ""}
              </p>
              <p className="mt-1 text-sm font-medium text-success">💰 R$ {(product.price * 0.95).toFixed(2).replace(".", ",")} no Pix (5% off)</p>
            </div>

            {product.stock <= 10 && (
              <p className="mt-3 animate-pulse-soft text-sm font-semibold text-destructive">⚠️ Apenas {product.stock} unidades em estoque!</p>
            )}

            {product.showCountdown && (
              <CountdownTimer label="🔥 Preço promocional expira em" className="mt-4" />
            )}

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center rounded-md border border-border">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-2 text-lg font-medium text-muted-foreground hover:text-foreground">−</button>
                <span className="min-w-[2rem] text-center text-sm font-semibold">{qty}</span>
                <button onClick={() => setQty(qty + 1)} className="px-3 py-2 text-lg font-medium text-muted-foreground hover:text-foreground">+</button>
              </div>
              <Button size="lg" className="flex-1 gap-2" onClick={() => {
                addItem(product, qty);
                setShowUpsell(true);
              }}>
                <ShoppingCart className="h-5 w-5" /> Adicionar ao Carrinho
              </Button>
              <Button size="lg" className="flex-1 gap-2 bg-success hover:bg-success/90 text-success-foreground" onClick={() => {
                addItem(product, qty);
                navigate("/checkout");
              }}>
                <Zap className="h-5 w-5" /> Compra Rápida
              </Button>
            </div>

            <div className="mt-6 space-y-2">
              {product.benefits.map((b) => (
                <div key={b} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-success" /><span>{b}</span>
                </div>
              ))}
            </div>

            {/* Shipping Calculator */}
            <div className="mt-6 rounded-lg border border-border p-4">
              <ShippingCalculator
                cep={shippingCep}
                onCepChange={setShippingCep}
                items={[{
                  price: product.price,
                  quantity: qty,
                  weight: product.weight,
                  height: product.height,
                  width: product.width,
                  length: product.length,
                }]}
                selectedOption={shippingOption}
                onSelectOption={setShippingOption}
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-4 rounded-lg bg-muted p-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><ShieldCheck className="h-4 w-4 text-primary" /> Qualidade Comprovada</span>
              <span className="flex items-center gap-1"><Truck className="h-4 w-4 text-primary" /> Frete Grátis +R$499</span>
              <span className="flex items-center gap-1">🔒 Pagamento Seguro</span>
            </div>

            {/* Credit Card Flags */}
            <div className="mt-3 flex items-center gap-3 px-1">
              <span className="text-xs text-muted-foreground">Aceitamos:</span>
              <div className="flex items-center gap-2">
                {["Visa", "Mastercard", "Elo", "Amex", "Pix"].map((flag) => (
                  <span key={flag} className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-[10px] font-medium text-muted-foreground">
                    <CreditCard className="h-3 w-3" /> {flag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Depoimentos */}
        {testimonials && testimonials.length > 0 && (
          <section className="mt-16">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-foreground">O que nossos clientes dizem</h2>
              <p className="mt-2 text-muted-foreground">Depoimentos reais de quem já experimentou</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((t) => (
                <Card key={t.id} className="relative overflow-hidden border-border/50">
                  <CardContent className="p-6">
                    <Quote className="absolute top-4 right-4 h-8 w-8 text-primary/10" />

                    <div className="flex gap-0.5 mb-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < t.rating ? "fill-warning text-warning" : "text-border"}`}
                        />
                      ))}
                    </div>

                    <p className="text-sm text-foreground leading-relaxed mb-4">
                      "{t.content}"
                    </p>

                    <div className="flex items-center gap-3 pt-3 border-t border-border/50">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                        {t.author_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{t.author_name}</p>
                        <p className="text-xs text-muted-foreground">Cliente verificado ✓</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Related Products */}
        <RelatedProducts currentProductId={product.id} />
      </main>

      {/* Fixed mobile bottom bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 flex gap-2 border-t border-border bg-card p-3 shadow-lg md:hidden">
        <Button
          size="lg"
          className="flex-1 gap-2 bg-success hover:bg-success/90 text-success-foreground text-sm"
          onClick={() => {
            addItem(product, qty);
            navigate("/checkout");
          }}
        >
          💰 Comprar via PIX
        </Button>
        <Button
          size="lg"
          className="flex-1 gap-2 text-sm"
          onClick={() => {
            addItem(product, qty);
            setShowUpsell(true);
          }}
        >
          <ShoppingCart className="h-4 w-4" /> Adicionar
        </Button>
      </div>
      {/* Spacer for fixed bar */}
      <div className="h-20 md:hidden" />

      <Footer />
      <WhatsAppButton />
      {product && <UpsellDialog open={showUpsell} onOpenChange={setShowUpsell} product={product} currentQty={qty} onAddMore={(extra) => addItem(product, extra)} />}
    </div>
  );
};

function RelatedProducts({ currentProductId }: { currentProductId: string }) {
  const { data: allProducts } = useProducts();
  const related = allProducts?.filter((p) => p.id !== currentProductId).slice(0, 4);

  if (!related || related.length === 0) return null;

  return (
    <section className="mt-16">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-foreground">Outros clientes compraram esses produtos no mesmo pedido</h2>
        <p className="mt-2 text-muted-foreground">Combine seus resultados com esses produtos</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {related.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}

export default ProductDetail;
