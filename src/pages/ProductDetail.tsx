import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Star, ShoppingCart, ShieldCheck, Truck, CheckCircle, Quote, Zap, CreditCard, Copy, MessageCircle, ChevronDown, ChevronUp, HelpCircle, Headphones, Package } from "lucide-react";
import CountdownTimer from "@/components/CountdownTimer";
import FlashSaleBar from "@/components/FlashSaleBar";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useProduct, useProducts } from "@/hooks/useProducts";
import ProductCard from "@/components/ProductCard";
import { useCart } from "@/hooks/useCart";
import { useSavedCustomer } from "@/hooks/useSavedCustomer";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import SEOHead from "@/components/SEOHead";
import { useState, useEffect, useRef, useCallback } from "react";
import UpsellDialog from "@/components/UpsellDialog";
import ShippingCalculator, { ShippingOption } from "@/components/checkout/ShippingCalculator";
import ProductQA from "@/components/ProductQA";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const ProductDetail = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const { data: product, isLoading } = useProduct(slug);
  const { addItem } = useCart();
  const { hasSavedData } = useSavedCustomer();
  const navigate = useNavigate();
  const { data: settings } = useStoreSettings();
  const directCheckoutDone = useRef(false);

  // Direct checkout: ?ck=1&m or ?ck=2 etc. — auto-add to cart and redirect
  const ckParam = searchParams.get("ck");
  useEffect(() => {
    if (ckParam && product && !directCheckoutDone.current) {
      directCheckoutDone.current = true;
      addItem(product);
      const mParam = searchParams.has("m") ? "&m" : "";
      navigate(`/checkout?ck=${ckParam}${mParam}`, { replace: true });
    }
  }, [ckParam, product, addItem, navigate, searchParams]);
  const [qty, setQty] = useState(1);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showUpsell, setShowUpsell] = useState(false);
  const [shippingCep, setShippingCep] = useState("");
  const [shippingOption, setShippingOption] = useState<ShippingOption | null>(null);
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
  }, [product]);

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

  const { data: faqs } = useQuery({
    queryKey: ["product-faqs", product?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_faqs")
        .select("*")
        .eq("product_id", product!.id)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!product?.id,
  });

  // Fetch product groups for breadcrumb
  const { data: productGroups } = useQuery({
    queryKey: ["product-groups"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_groups").select("*");
      if (error) throw error;
      return data;
    },
  });

  const [descExpanded, setDescExpanded] = useState(false);

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
  const freeShippingMin = settings?.free_shipping_min_value ?? 499;
  const maxInstallments = settings?.max_installments ?? 3;
  const installmentValue = (product.price / maxInstallments).toFixed(2).replace(".", ",");

  const seoTitle = product.seoTitle || product.name;
  const seoDesc = product.seoDescription || product.shortDescription;
  const seoKeywords = product.seoKeywords || "";
  const productUrl = `https://d7pharmabrazil.lovable.app/produto/${product.slug}`;

  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription,
    image: product.image,
    sku: product.sku || product.slug,
    brand: { "@type": "Brand", name: "D7 Pharma Brazil" },
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "BRL",
      price: product.price.toFixed(2),
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: "D7 Pharma Brazil" },
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: product.rating.toString(),
      reviewCount: displayReviews.toString(),
    },
  };

  return (
    <div className="min-h-screen">
      <SEOHead
        title={seoTitle}
        description={seoDesc}
        image={product.image}
        keywords={seoKeywords}
        url={productUrl}
        canonical={productUrl}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header />
      <main className="container py-4 md:py-8">
        {/* Breadcrumbs ML-style */}
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link to="/">Início</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link to="/produtos">Produtos</Link></BreadcrumbLink>
            </BreadcrumbItem>
            {product.groupName && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to={`/produtos?grupo=${encodeURIComponent(product.groupName)}`}>{product.groupName}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            )}
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <span className="text-foreground font-medium text-sm">{product.name}</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Two-column layout */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">

          {/* ====== LEFT COLUMN ====== */}
          <div className="order-1 lg:order-none lg:flex-1 lg:min-w-0">
            {/* Images */}
            <div className="flex gap-3">
              {/* Vertical thumbnails - desktop */}
              {product.extraImages.length > 0 && (
                <div className="hidden lg:flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={() => setSelectedImage(null)}
                    className={`rounded-lg border-2 overflow-hidden transition-all ${!selectedImage ? "border-primary ring-1 ring-primary/30" : "border-transparent hover:border-primary/30"}`}
                  >
                    <img src={product.image} alt={product.name} className="h-16 w-16 object-cover" />
                  </button>
                  {product.extraImages.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(img)}
                      className={`rounded-lg border-2 overflow-hidden transition-all ${selectedImage === img ? "border-primary ring-1 ring-primary/30" : "border-transparent hover:border-primary/30"}`}
                    >
                      <img src={img} alt={`${product.name} ${i + 2}`} className="h-16 w-16 object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <div className="flex-1 aspect-square overflow-hidden rounded-xl bg-muted">
                <img
                  src={selectedImage || product.image}
                  alt={product.name}
                  className="h-full w-full object-cover transition-opacity duration-200"
                />
              </div>
            </div>

            {/* Horizontal thumbnails - mobile */}
            {product.extraImages.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 mt-3 lg:hidden">
                <button
                  onClick={() => setSelectedImage(null)}
                  className={`flex-shrink-0 rounded-lg border-2 overflow-hidden transition ${!selectedImage ? "border-primary ring-1 ring-primary/30" : "border-transparent"}`}
                >
                  <img src={product.image} alt={product.name} className="h-16 w-16 object-cover" />
                </button>
                {product.extraImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(img)}
                    className={`flex-shrink-0 rounded-lg border-2 overflow-hidden transition ${selectedImage === img ? "border-primary ring-1 ring-primary/30" : "border-transparent"}`}
                  >
                    <img src={img} alt={`${product.name} ${i + 2}`} className="h-16 w-16 object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* ---- Desktop-only below images ---- */}
            <div className="hidden lg:block space-y-6 mt-6">
              {/* Short Description */}
              {product.shortDescription && (
                <div className="rounded-xl border border-border bg-card p-4 md:p-5">
                  <p className="text-base font-medium text-foreground leading-relaxed">{product.shortDescription}</p>
                </div>
              )}
              {/* Description */}
              {product.description && (
                <div className="rounded-xl bg-muted/50 p-4 md:p-5">
                  <h2 className="text-lg font-bold text-foreground mb-3">Descrição do Produto</h2>
                  <div className={`relative overflow-hidden transition-all duration-300 ${!descExpanded ? "max-h-48" : ""}`}>
                    {product.description.startsWith("<") ? (
                      <div className="prose prose-sm max-w-none text-muted-foreground dark:prose-invert [&_table]:w-full [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:bg-muted [&_th]:font-semibold [&_hr]:my-4 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-foreground [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-foreground [&_a]:text-primary [&_a]:underline"
                        dangerouslySetInnerHTML={{ __html: product.description }} />
                    ) : (
                      <p className="text-muted-foreground">{product.description}</p>
                    )}
                    {!descExpanded && (
                      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-muted/50 to-transparent" />
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="mt-2 gap-1 text-primary" onClick={() => setDescExpanded(!descExpanded)}>
                    {descExpanded ? <><ChevronUp className="h-4 w-4" /> Ver menos</> : <><ChevronDown className="h-4 w-4" /> Ver mais</>}
                  </Button>
                </div>
              )}

              {/* Benefits - 3 columns, 2 per column */}
              {product.benefits.length > 0 && (
                <div className="rounded-xl bg-muted/50 p-4 md:p-5">
                  <h2 className="text-lg font-bold text-foreground mb-3">Benefícios</h2>
                  <div className="grid grid-cols-3 gap-3">
                    {product.benefits.map((b) => (
                      <div key={b} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" /><span>{b}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Testimonials - desktop */}
              {testimonials && testimonials.length > 0 && (
                <div className="rounded-xl bg-muted/50 p-4 md:p-5">
                  <h2 className="text-lg font-bold text-foreground mb-4">
                    Opinião de quem comprou <span className="text-sm font-normal text-muted-foreground">({displayReviews} avaliações)</span>
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

          {/* ====== RIGHT COLUMN (sticky on desktop) ====== */}
          <div className="order-2 lg:order-none lg:w-[420px] xl:w-[450px] lg:flex-shrink-0 lg:self-start lg:sticky lg:top-4 space-y-4">
            {/* Title, badge, share */}
            <div>
              {product.badge && <Badge className="mb-2 bg-secondary text-secondary-foreground">{product.badge}</Badge>}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs text-muted-foreground">Novo | {displayReviews} vendidos</span>
                  <h1 className="text-xl font-bold text-foreground lg:text-2xl mt-0.5">{product.name}</h1>
                </div>
                <div className="flex gap-1 flex-shrink-0 pt-1">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      import("sonner").then(({ toast }) => toast.success("Link copiado!"));
                    }}
                    className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                    title="Copiar link"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(product.name + " - " + window.location.href)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full p-2 text-muted-foreground hover:bg-success/10 hover:text-success transition"
                    title="Compartilhar no WhatsApp"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </a>
                </div>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < Math.floor(product.rating) ? "fill-warning text-warning" : "text-border"}`} />
                  ))}
                </div>
                <span className="text-sm font-semibold">{product.rating}</span>
                <span className="text-xs text-muted-foreground">({displayReviews} avaliações)</span>
              </div>
            </div>

            {/* Price */}
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground line-through">R$ {product.originalPrice.toFixed(2).replace(".", ",")}</span>
                <Badge variant="secondary" className="bg-success/10 text-success text-xs">-{discountPercent}% OFF</Badge>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-bold text-foreground">R$ {product.price.toFixed(2).replace(".", ",")}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                em até <strong>{maxInstallments}x</strong> de <strong>R$ {installmentValue}</strong> sem juros
              </p>
              <p className="text-sm font-medium text-success mt-1">💰 R$ {(product.price * 0.95).toFixed(2).replace(".", ",")} no Pix (5% off)</p>
            </div>

            {/* Countdown */}
            {product.showCountdown && (
              <CountdownTimer label="🔥 Preço promocional expira em" />
            )}

            {/* Quantity selector */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground">Quantidade:</span>
              <div className="flex items-center rounded-lg border border-border">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-1.5 text-lg font-medium text-muted-foreground hover:text-foreground">−</button>
                <span className="min-w-[2rem] text-center text-sm font-semibold">{qty}</span>
                <button onClick={() => setQty(Math.min(product.stock, qty + 1))} className="px-3 py-2 text-lg font-medium text-muted-foreground hover:text-foreground">+</button>
              </div>
              <span className="text-xs text-muted-foreground">({product.stock} disponíveis)</span>
            </div>

            {/* Shipping */}
            <div className="rounded-xl bg-muted/50 p-4">
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

            {/* Trust badges */}
            <div className="flex flex-wrap gap-3 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Truck className="h-3.5 w-3.5 text-success" /> Frete Grátis a partir de R$ {freeShippingMin} - Envio Rápido</span>
               <span className="flex items-center gap-1">🔒 Pagamento Seguro - Garantia de Satisfação</span>
            </div>

            {/* Stock warning */}
            {product.stock <= 10 && (
              <p className="animate-pulse-soft text-sm font-semibold text-destructive">⚠️ Apenas {product.stock} unidades em estoque!</p>
            )}

            {/* Action buttons */}
            <div ref={buyButtonsRef} className="flex flex-col gap-2">
              {hasSavedData && (
                <Button size="lg" className="h-14 text-base gap-2 w-full bg-amber-500 hover:bg-amber-600 text-white font-bold animate-pulse-soft" onClick={() => {
                  addItem(product, qty);
                  navigate("/checkout?oneclick=1");
                }}>
                  <Zap className="h-5 w-5" /> Comprar com 1 Clique
                </Button>
              )}
              <Button size="lg" className="h-14 text-base gap-2 w-full" onClick={() => {
                addItem(product, qty);
                setShowUpsell(true);
              }}>
                <ShoppingCart className="h-5 w-5" /> Adicionar ao Carrinho
              </Button>
              <Button size="lg" className="h-14 text-base gap-2 w-full bg-success hover:bg-success/90 text-success-foreground" onClick={() => {
                addItem(product, qty);
                navigate("/checkout");
              }}>
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

            {/* FAQ */}
            {faqs && faqs.length > 0 && (
              <div className="rounded-xl bg-muted/50 p-4">
                <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-primary" /> Perguntas Frequentes
                </h2>
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((f, i) => (
                    <AccordionItem key={f.id || i} value={`faq-${i}`}>
                      <AccordionTrigger className="text-sm font-medium text-left">{f.question}</AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground">{f.answer}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}

            {/* AI Q&A */}
            <ProductQA product={product} faqs={faqs as any} />

            {/* Support button */}
            <Button
              variant="outline"
              size="lg"
              className="w-full gap-2 h-12"
              onClick={() => {
                const whatsapp = settings?.whatsapp;
                if (whatsapp) {
                  window.open(`https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Tenho dúvidas sobre o produto: ${product.name}`)}`, "_blank");
                }
              }}
            >
              <Headphones className="h-5 w-5 text-primary" /> Falar com Suporte
            </Button>
          </div>

          {/* ====== MOBILE-ONLY: Description + Benefits + Testimonials below purchase ====== */}
          <div className="order-3 lg:hidden space-y-6">
            {/* Short Description - mobile */}
            {product.shortDescription && (
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-medium text-foreground leading-relaxed">{product.shortDescription}</p>
              </div>
            )}
            {/* Description */}
            {product.description && (
              <div className="rounded-xl bg-muted/50 p-4">
                <h2 className="text-lg font-bold text-foreground mb-3">Descrição do Produto</h2>
                <div className={`relative overflow-hidden transition-all duration-300 ${!descExpanded ? "max-h-48" : ""}`}>
                  {product.description.startsWith("<") ? (
                    <div className="prose prose-sm max-w-none text-muted-foreground dark:prose-invert [&_table]:w-full [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:bg-muted [&_th]:font-semibold"
                      dangerouslySetInnerHTML={{ __html: product.description }} />
                  ) : (
                    <p className="text-muted-foreground">{product.description}</p>
                  )}
                  {!descExpanded && (
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-muted/50 to-transparent" />
                  )}
                </div>
                <Button variant="ghost" size="sm" className="mt-2 gap-1 text-primary" onClick={() => setDescExpanded(!descExpanded)}>
                  {descExpanded ? <><ChevronUp className="h-4 w-4" /> Ver menos</> : <><ChevronDown className="h-4 w-4" /> Ver mais</>}
                </Button>
              </div>
            )}

            {/* Benefits - mobile (2 columns) */}
            {product.benefits.length > 0 && (
              <div className="rounded-xl bg-muted/50 p-4">
                <h2 className="text-lg font-bold text-foreground mb-3">Benefícios</h2>
                <div className="grid grid-cols-2 gap-3">
                  {product.benefits.map((b) => (
                    <div key={b} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" /><span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Testimonials - mobile */}
            {testimonials && testimonials.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-foreground mb-4">
                  Opinião de quem comprou <span className="text-sm font-normal text-muted-foreground">({displayReviews} avaliações)</span>
                </h2>
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

        {/* Related products */}
        <RelatedProducts currentProductId={product.id} />
      </main>

      {/* Fixed mobile bottom bar */}
      <div className="fixed bottom-0 inset-x-0 z-50 flex gap-2 border-t border-border bg-card p-3 shadow-lg md:hidden">
        <Button
          size="lg"
          className="flex-1 gap-2 bg-success hover:bg-success/90 text-success-foreground text-sm h-12"
          onClick={() => {
            addItem(product, qty);
            navigate("/checkout");
          }}
        >
          💰 Comprar via PIX
        </Button>
        <Button
          size="lg"
          className="flex-1 gap-2 text-sm h-12"
          onClick={() => {
            addItem(product, qty);
            setShowUpsell(true);
          }}
        >
          <ShoppingCart className="h-4 w-4" /> Adicionar
        </Button>
      </div>

      {/* Sticky desktop bottom bar — visible when buy buttons scroll out of view */}
      {showStickyBar && product && (
        <div className="fixed bottom-0 inset-x-0 z-50 hidden md:block animate-fade-in">
          <div className="border-t border-border bg-card/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
            <div className="container flex items-center justify-center gap-4 py-3 pr-24">
              <img
                src={product.image}
                alt={product.name}
                className="h-12 w-12 rounded-xl object-cover border border-border"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{product.name}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-foreground">R$ {product.price.toFixed(2).replace(".", ",")}</span>
                  <span className="text-xs text-muted-foreground line-through">R$ {product.originalPrice.toFixed(2).replace(".", ",")}</span>
                  <span className="text-xs text-success font-medium">ou R$ {(product.price * 0.95).toFixed(2).replace(".", ",")} no Pix</span>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-border">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-1.5 text-lg font-medium text-muted-foreground hover:text-foreground">−</button>
                <span className="min-w-[2rem] text-center text-sm font-semibold">{qty}</span>
                <button onClick={() => setQty(Math.min(product.stock, qty + 1))} className="px-3 py-1.5 text-lg font-medium text-muted-foreground hover:text-foreground">+</button>
              </div>
              <Button
                size="lg"
                className="h-12 gap-2 rounded-xl px-6"
                onClick={() => {
                  addItem(product, qty);
                  setShowUpsell(true);
                }}
              >
                <ShoppingCart className="h-4 w-4" /> Adicionar ao carrinho
              </Button>
              <Button
                size="lg"
                className="h-12 gap-2 rounded-xl px-6 bg-success hover:bg-success/90 text-success-foreground"
                onClick={() => {
                  addItem(product, qty);
                  navigate("/checkout");
                }}
              >
                Comprar Agora
              </Button>
            </div>
          </div>
        </div>
      )}

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
