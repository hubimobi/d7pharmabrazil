import { useParams, Link, useNavigate } from "react-router-dom";
import { sanitizeHtml } from "@/lib/sanitize";
import { Star, ShoppingCart, ShieldCheck, Truck, CheckCircle, Quote, Zap, CreditCard, Copy, MessageCircle, ChevronDown, ChevronUp, Headphones, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useProducts, Product } from "@/hooks/useProducts";
import { useCombos } from "@/hooks/useCombos";
import ProductCard from "@/components/ProductCard";
import { useCart } from "@/hooks/useCart";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import SEOHead from "@/components/SEOHead";
import { useState, useEffect, useRef } from "react";
import ShippingCalculator, { ShippingOption } from "@/components/checkout/ShippingCalculator";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import CountdownTimer from "@/components/CountdownTimer";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function ComboDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data: combos, isLoading } = useCombos();
  const { data: allProducts } = useProducts();
  const { addItem } = useCart();
  const { data: settings } = useStoreSettings();

  const combo = combos?.find((c) => c.slug === slug);
  const comboProducts = combo
    ? combo.product_ids.map((id) => allProducts?.find((p) => p.id === id)).filter(Boolean) as Product[]
    : [];

  const [qty, setQty] = useState(1);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [shippingCep, setShippingCep] = useState("");
  const [shippingOption, setShippingOption] = useState<ShippingOption | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const buyButtonsRef = useRef<HTMLDivElement>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);

  useEffect(() => {
    const el = buyButtonsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [combo]);

  // Aggregate testimonials from combo products
  const { data: testimonials } = useQuery({
    queryKey: ["combo-testimonials", combo?.product_ids],
    queryFn: async () => {
      if (!combo?.product_ids.length) return [];
      const { data, error } = await supabase
        .from("product_testimonials")
        .select("*")
        .in("product_id", combo.product_ids)
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data;
    },
    enabled: !!combo?.product_ids.length,
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

  if (!combo) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold">Combo não encontrado</h1>
          <Link to="/produtos"><Button className="mt-4">Ver todos os produtos</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  const discountPercent = combo.original_price > 0 ? Math.round((1 - combo.price / combo.original_price) * 100) : 0;
  const avgRating = comboProducts.length > 0
    ? (comboProducts.reduce((sum, p) => sum + p.rating, 0) / comboProducts.length)
    : 5;
  const totalReviews = comboProducts.reduce((sum, p) => sum + (p.reviews < 500 ? p.reviews + 500 : p.reviews), 0);
  const maxInstallments = settings?.max_installments ?? 3;
  const installmentValue = (combo.price / maxInstallments).toFixed(2).replace(".", ",");
  const freeShippingMin = settings?.free_shipping_min_value ?? 499;
  const freeShippingEnabled = settings?.free_shipping_enabled ?? false;
  const hasFreeShipping = freeShippingEnabled && combo.price >= freeShippingMin;
  const comboImage = combo.image_url || comboProducts[0]?.image || "/placeholder.svg";

  const productImages = comboProducts.map((p) => p.image).filter(Boolean);

  const totalWeight = comboProducts.reduce((s, p) => s + (p.weight || 0.3), 0);
  const maxHeight = Math.max(...comboProducts.map((p) => p.height || 5));
  const maxWidth = Math.max(...comboProducts.map((p) => p.width || 15));
  const totalLength = comboProducts.reduce((s, p) => s + (p.length || 20), 0);

  const handleAddCombo = () => {
    comboProducts.forEach((p) => addItem(p, qty));
  };

  const handleQuickBuy = () => {
    comboProducts.forEach((p) => addItem(p, qty));
    navigate("/checkout");
  };

  return (
    <div className="min-h-screen">
      <SEOHead title={combo.name} description={combo.description} image={comboImage} />
      <Header />
      <main className="container py-4 md:py-8">
        {/* Breadcrumbs */}
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink asChild><Link to="/">Início</Link></BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbLink asChild><Link to="/produtos">Produtos</Link></BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><span className="text-foreground font-medium text-sm">{combo.name}</span></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
          {/* LEFT COLUMN */}
          <div className="order-1 lg:order-none lg:flex-1 lg:min-w-0">
            {/* Images */}
            <div className="flex gap-3">
              {productImages.length > 1 && (
                <div className="hidden lg:flex flex-col gap-2 flex-shrink-0">
                  {combo.image_url && (
                    <button
                      onClick={() => setSelectedImage(combo.image_url)}
                      className={`rounded-lg border-2 overflow-hidden transition-all ${selectedImage === combo.image_url || !selectedImage ? "border-primary ring-1 ring-primary/30" : "border-transparent hover:border-primary/30"}`}
                    >
                      <img src={combo.image_url} alt={combo.name} className="h-16 w-16 object-cover" />
                    </button>
                  )}
                  {comboProducts.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedImage(p.image)}
                      className={`rounded-lg border-2 overflow-hidden transition-all ${selectedImage === p.image ? "border-primary ring-1 ring-primary/30" : "border-transparent hover:border-primary/30"}`}
                    >
                      <img src={p.image} alt={p.name} className="h-16 w-16 object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <div className="flex-1 aspect-square overflow-hidden rounded-xl bg-muted">
                <img
                  src={selectedImage || comboImage}
                  alt={combo.name}
                  className="h-full w-full object-cover transition-opacity duration-200"
                />
              </div>
            </div>

            {/* Horizontal thumbnails - mobile */}
            {productImages.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 mt-3 lg:hidden">
                {combo.image_url && (
                  <button
                    onClick={() => setSelectedImage(combo.image_url)}
                    className={`flex-shrink-0 rounded-lg border-2 overflow-hidden transition ${!selectedImage || selectedImage === combo.image_url ? "border-primary ring-1 ring-primary/30" : "border-transparent"}`}
                  >
                    <img src={combo.image_url} alt={combo.name} className="h-16 w-16 object-cover" />
                  </button>
                )}
                {comboProducts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedImage(p.image)}
                    className={`flex-shrink-0 rounded-lg border-2 overflow-hidden transition ${selectedImage === p.image ? "border-primary ring-1 ring-primary/30" : "border-transparent"}`}
                  >
                    <img src={p.image} alt={p.name} className="h-16 w-16 object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Desktop content */}
            <div className="hidden lg:block space-y-6 mt-6">
              {/* Description */}
              {combo.description && (
                <div className="rounded-xl bg-muted/50 p-4 md:p-5">
                  <h2 className="text-lg font-bold text-foreground mb-3">Sobre este Combo</h2>
                  <div className={`relative overflow-hidden transition-all duration-300 ${!descExpanded ? "max-h-48" : ""}`}>
                    {combo.description.startsWith("<") ? (
                      <div className="prose prose-sm max-w-none text-muted-foreground dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(combo.description) }} />
                    ) : (
                      <p className="text-muted-foreground">{combo.description}</p>
                    )}
                    {!descExpanded && combo.description.length > 300 && (
                      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-muted/50 to-transparent" />
                    )}
                  </div>
                  {combo.description.length > 300 && (
                    <Button variant="ghost" size="sm" className="mt-2 gap-1 text-primary" onClick={() => setDescExpanded(!descExpanded)}>
                      {descExpanded ? <><ChevronUp className="h-4 w-4" /> Ver menos</> : <><ChevronDown className="h-4 w-4" /> Ver mais</>}
                    </Button>
                  )}
                </div>
              )}

              {/* Products in combo */}
              <div className="rounded-xl bg-muted/50 p-4 md:p-5">
                <h2 className="text-lg font-bold text-foreground mb-3">Produtos Incluídos ({comboProducts.length})</h2>
                <div className="grid gap-3">
                  {comboProducts.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                      <img src={p.image} alt={p.name} className="h-16 w-16 rounded-lg object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <Link to={`/produto/${p.slug}`} className="text-sm font-semibold text-foreground hover:text-primary transition-colors line-clamp-1">
                          {p.name}
                        </Link>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{p.shortDescription}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground line-through">R$ {p.originalPrice.toFixed(2).replace(".", ",")}</span>
                          <span className="text-sm font-bold text-foreground">R$ {p.price.toFixed(2).replace(".", ",")}</span>
                        </div>
                      </div>
                      <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Benefits from all products */}
              {comboProducts.some((p) => p.benefits.length > 0) && (
                <div className="rounded-xl bg-muted/50 p-4 md:p-5">
                  <h2 className="text-lg font-bold text-foreground mb-3">Benefícios</h2>
                  <div className="grid grid-cols-3 gap-3">
                    {Array.from(new Set(comboProducts.flatMap((p) => p.benefits))).map((b) => (
                      <div key={b} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" /><span>{b}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Testimonials desktop */}
              {testimonials && testimonials.length > 0 && (
                <div className="rounded-xl bg-muted/50 p-4 md:p-5">
                  <h2 className="text-lg font-bold text-foreground mb-4">
                    Opinião de quem comprou <span className="text-sm font-normal text-muted-foreground">({totalReviews} avaliações)</span>
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {testimonials.slice(0, 6).map((t) => (
                      <Card key={t.id} className="relative overflow-hidden border-border/50">
                        <CardContent className="p-4">
                          <Quote className="absolute top-3 right-3 h-6 w-6 text-primary/10" />
                          <div className="flex gap-0.5 mb-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`h-3.5 w-3.5 ${i < t.rating ? "fill-warning text-warning" : "text-border"}`} />
                            ))}
                          </div>
                          <p className="text-sm text-foreground leading-relaxed mb-3">"{t.content}"</p>
                          <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                              {t.author_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-foreground">{t.author_name}</p>
                              <p className="text-2xs text-muted-foreground">Cliente verificado ✓</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="order-2 lg:order-none lg:w-[420px] xl:w-[450px] lg:flex-shrink-0 lg:self-start lg:sticky lg:top-4 space-y-4">
            <div>
              {combo.badge && <Badge className="mb-2 bg-secondary text-secondary-foreground">{combo.badge}</Badge>}
              <Badge variant="secondary" className="mb-2 ml-1 bg-primary/10 text-primary text-xs">
                COMBO • {combo.product_ids.length} produtos
              </Badge>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs text-muted-foreground">Combo | {totalReviews} vendidos</span>
                  <h1 className="text-xl font-bold text-foreground lg:text-2xl mt-0.5">{combo.name}</h1>
                </div>
                <div className="flex gap-1 flex-shrink-0 pt-1">
                  <button onClick={() => { navigator.clipboard.writeText(window.location.href); import("sonner").then(({ toast }) => toast.success("Link copiado!")); }}
                    className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition" title="Copiar link">
                    <Copy className="h-4 w-4" />
                  </button>
                  <a href={`https://wa.me/?text=${encodeURIComponent(combo.name + " - " + window.location.href)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="rounded-full p-2 text-muted-foreground hover:bg-success/10 hover:text-success transition" title="Compartilhar">
                    <MessageCircle className="h-4 w-4" />
                  </a>
                </div>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < Math.floor(avgRating) ? "fill-warning text-warning" : "text-border"}`} />
                  ))}
                </div>
                <span className="text-sm font-semibold">{avgRating.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">({totalReviews} avaliações)</span>
              </div>
            </div>

            {/* Price */}
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground line-through">R$ {combo.original_price.toFixed(2).replace(".", ",")}</span>
                {discountPercent > 0 && <Badge variant="secondary" className="bg-success/10 text-success text-xs">-{discountPercent}% OFF</Badge>}
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-bold text-foreground">R$ {combo.price.toFixed(2).replace(".", ",")}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                em até <strong>{maxInstallments}x</strong> de <strong>R$ {installmentValue}</strong> sem juros
              </p>
              <p className="text-sm font-medium text-success mt-1">💰 R$ {(combo.price * 0.95).toFixed(2).replace(".", ",")} no Pix (5% off)</p>
              {hasFreeShipping && (
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-success">
                  <Truck className="h-3.5 w-3.5" /> Frete Grátis
                </span>
              )}
            </div>

            {/* Countdown */}
            <CountdownTimer label="🔥 Oferta do combo expira em" />

            {/* Quantity */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground">Quantidade:</span>
              <div className="flex items-center rounded-lg border border-border">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-1.5 text-lg font-medium text-muted-foreground hover:text-foreground">−</button>
                <span className="min-w-[2rem] text-center text-sm font-semibold">{qty}</span>
                <button onClick={() => setQty(qty + 1)} className="px-3 py-2 text-lg font-medium text-muted-foreground hover:text-foreground">+</button>
              </div>
            </div>

            {/* Shipping */}
            <div className="rounded-xl bg-muted/50 p-4">
              <ShippingCalculator
                cep={shippingCep}
                onCepChange={setShippingCep}
                items={[{
                  price: combo.price,
                  quantity: qty,
                  weight: totalWeight,
                  height: maxHeight,
                  width: maxWidth,
                  length: totalLength,
                }]}
                selectedOption={shippingOption}
                onSelectOption={setShippingOption}
              />
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-3 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Truck className="h-3.5 w-3.5 text-success" /> Frete Grátis a partir de R$ {freeShippingMin} - Envio Rápido</span>
              <span className="flex items-center gap-1">🔒 Pagamento Seguro - Garantia de Satisfação</span>
            </div>

            {/* Action buttons */}
            <div ref={buyButtonsRef} className="flex flex-col gap-2">
              <Button size="lg" className="h-14 text-base gap-2 w-full" onClick={handleAddCombo}>
                <ShoppingCart className="h-5 w-5" /> Adicionar ao Carrinho
              </Button>
              <Button size="lg" className="h-14 text-base gap-2 w-full bg-success hover:bg-success/90 text-success-foreground" onClick={handleQuickBuy}>
                <Zap className="h-5 w-5" /> Compra Rápida
              </Button>
            </div>

            {/* Payment methods */}
            <div className="px-1">
              <span className="text-xs text-muted-foreground">Aceitamos:</span>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                {["Visa", "Mastercard", "Elo", "Amex", "Pix", "Boleto"].map((flag) => (
                  <span key={flag} className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-2xs font-medium text-muted-foreground">
                    <CreditCard className="h-3 w-3" /> {flag}
                  </span>
                ))}
              </div>
            </div>

            {/* Support */}
            <Button variant="outline" size="lg" className="w-full gap-2 h-12"
              onClick={() => {
                const whatsapp = settings?.whatsapp;
                if (whatsapp) window.open(`https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Tenho dúvidas sobre o combo: ${combo.name}`)}`, "_blank");
              }}>
              <Headphones className="h-5 w-5 text-primary" /> Falar com Suporte
            </Button>
          </div>

          {/* MOBILE content */}
          <div className="order-3 lg:hidden space-y-6">
            {combo.description && (
              <div className="rounded-xl bg-muted/50 p-4">
                <h2 className="text-lg font-bold text-foreground mb-3">Sobre este Combo</h2>
                {combo.description.startsWith("<") ? (
                  <div className="prose prose-sm max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: combo.description }} />
                ) : (
                  <p className="text-muted-foreground text-sm">{combo.description}</p>
                )}
              </div>
            )}

            {/* Products included - mobile */}
            <div className="rounded-xl bg-muted/50 p-4">
              <h2 className="text-lg font-bold text-foreground mb-3">Produtos Incluídos ({comboProducts.length})</h2>
              <div className="grid gap-3">
                {comboProducts.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                    <img src={p.image} alt={p.name} className="h-14 w-14 rounded-lg object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <Link to={`/produto/${p.slug}`} className="text-sm font-semibold text-foreground hover:text-primary line-clamp-1">{p.name}</Link>
                      <span className="text-sm font-bold text-foreground">R$ {p.price.toFixed(2).replace(".", ",")}</span>
                    </div>
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>

            {/* Testimonials - mobile */}
            {testimonials && testimonials.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-foreground mb-4">Opinião de quem comprou</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {testimonials.slice(0, 4).map((t) => (
                    <Card key={t.id} className="relative overflow-hidden border-border/50">
                      <CardContent className="p-4">
                        <Quote className="absolute top-3 right-3 h-6 w-6 text-primary/10" />
                        <div className="flex gap-0.5 mb-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-3.5 w-3.5 ${i < t.rating ? "fill-warning text-warning" : "text-border"}`} />
                          ))}
                        </div>
                        <p className="text-sm text-foreground leading-relaxed mb-3">"{t.content}"</p>
                        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                            {t.author_name.charAt(0).toUpperCase()}
                          </div>
                          <p className="text-xs font-semibold text-foreground">{t.author_name}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related products */}
        <section className="mt-16">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-foreground">Você também pode gostar</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {allProducts?.filter((p) => !combo.product_ids.includes(p.id)).slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      </main>

      {/* Mobile bottom bar */}
      <div className="fixed bottom-0 inset-x-0 z-50 flex gap-2 border-t border-border bg-card p-3 shadow-lg md:hidden">
        <Button size="lg" className="flex-1 gap-2 bg-success hover:bg-success/90 text-success-foreground text-sm h-12" onClick={handleQuickBuy}>
          💰 Comprar via PIX
        </Button>
        <Button size="lg" className="flex-1 gap-2 text-sm h-12" onClick={handleAddCombo}>
          <ShoppingCart className="h-4 w-4" /> Adicionar
        </Button>
      </div>

      {/* Sticky desktop bar */}
      {showStickyBar && (
        <div className="fixed bottom-0 inset-x-0 z-50 hidden md:block animate-fade-in">
          <div className="border-t border-border bg-card/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
            <div className="container flex items-center justify-center gap-4 py-3 pr-24">
              <img src={comboImage} alt={combo.name} className="h-12 w-12 rounded-xl object-cover border border-border" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{combo.name}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-foreground">R$ {combo.price.toFixed(2).replace(".", ",")}</span>
                  <span className="text-xs text-muted-foreground line-through">R$ {combo.original_price.toFixed(2).replace(".", ",")}</span>
                  <span className="text-xs text-success font-medium">ou R$ {(combo.price * 0.95).toFixed(2).replace(".", ",")} no Pix</span>
                </div>
              </div>
              <Button size="lg" className="h-12 gap-2 rounded-xl px-6" onClick={handleAddCombo}>
                <ShoppingCart className="h-4 w-4" /> Adicionar ao carrinho
              </Button>
              <Button size="lg" className="h-12 gap-2 rounded-xl px-6 bg-success hover:bg-success/90 text-success-foreground" onClick={handleQuickBuy}>
                Comprar Agora
              </Button>
            </div>
          </div>
        </div>
      )}

      <Footer />
      <WhatsAppButton />
    </div>
  );
}
