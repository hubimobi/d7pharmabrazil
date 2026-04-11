import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Upload, Gift, CheckCircle, Camera, X, Package } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface OrderProduct {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function CustomerFeedbackPage() {
  const [params] = useSearchParams();
  const orderId = params.get("pedido") || "";
  const emailParam = params.get("email") || "";

  const { tenantId } = useTenant();
  const { data: settings } = useStoreSettings();
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(5);
  const [authorPhoto, setAuthorPhoto] = useState<File | null>(null);
  const [authorPreview, setAuthorPreview] = useState<string | null>(null);
  const [productPhotos, setProductPhotos] = useState<File[]>([]);
  const [productPreviews, setProductPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [couponCode, setCouponCode] = useState("");

  // Order-linked state
  const [orderProducts, setOrderProducts] = useState<OrderProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [orderValid, setOrderValid] = useState<boolean | null>(null);

  // Fetch order products on load
  useEffect(() => {
    if (!orderId || !emailParam) return;
    setLoadingOrder(true);
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-order", {
          body: { order_id: orderId, customer_email: emailParam },
        });
        if (error || !data) {
          setOrderValid(false);
          return;
        }
        // The edge function returns { order: {...} }
        const orderData = data.order || data;
        if (!orderData || orderData.error || !orderData.items) {
          setOrderValid(false);
          return;
        }
        setOrderValid(true);
        setName(orderData.customer_name || "");
        const items: OrderProduct[] = (orderData.items || []).map((i: any) => ({
          product_id: i.product_id || i.id,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
        }));
        setOrderProducts(items);
        if (items.length === 1) setSelectedProductId(items[0].product_id);
      } catch {
        setOrderValid(false);
      } finally {
        setLoadingOrder(false);
      }
    })();
  }, [orderId, emailParam]);

  const handleAuthorFile = (file: File | null) => {
    if (!file) return;
    setAuthorPhoto(file);
    setAuthorPreview(URL.createObjectURL(file));
  };

  const addProductPhotos = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files);
    const remaining = 4 - productPhotos.length;
    const toAdd = newFiles.slice(0, remaining);
    setProductPhotos((prev) => [...prev, ...toAdd]);
    setProductPreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);
  };

  const removeProductPhoto = (idx: number) => {
    setProductPhotos((prev) => prev.filter((_, i) => i !== idx));
    setProductPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const uploadImage = async (file: File, prefix: string) => {
    const ext = file.name.split(".").pop();
    const path = `testimonials/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("images").upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("images").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !content || !selectedProductId) {
      toast.error("Preencha todos os campos obrigatórios e selecione o produto.");
      return;
    }
    setSubmitting(true);
    try {
      let authorImageUrl: string | undefined;
      if (authorPhoto) authorImageUrl = await uploadImage(authorPhoto, "author");

      const productImageUrls: string[] = [];
      for (const f of productPhotos) {
        const url = await uploadImage(f, "product");
        productImageUrls.push(url);
      }

      const { error } = await supabase.from("product_testimonials").insert({
        product_id: selectedProductId,
        author_name: name,
        content,
        rating,
        author_image_url: authorImageUrl || null,
        product_image_url: productImageUrls[0] || null,
        product_image_urls: productImageUrls,
        source: "customer",
        order_id: orderId || null,
        approved: false,
        tenant_id: tenantId,
      } as any);
      if (error) throw error;

      if ((settings as any)?.feedback_bonus_coupon_id) {
        const { data: coupon } = await supabase
          .from("coupons")
          .select("code")
          .eq("id", (settings as any).feedback_bonus_coupon_id)
          .single();
        if (coupon?.code) setCouponCode(coupon.code);
      }

      setSubmitted(true);
      toast.success("Feedback enviado para aprovação!");
    } catch (err: any) {
      toast.error("Erro ao enviar: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container max-w-lg py-16 text-center space-y-6">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold">Obrigado pelo seu feedback!</h1>
          <p className="text-muted-foreground">Sua avaliação será analisada e publicada em breve.</p>
          {couponCode && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-6 space-y-3">
                <Gift className="h-10 w-10 text-primary mx-auto" />
                <p className="font-semibold text-lg">🎁 Seu bônus de agradecimento!</p>
                <p className="text-sm text-muted-foreground">Use o cupom abaixo na sua próxima compra:</p>
                <div className="bg-card border-2 border-dashed border-primary rounded-lg py-3 px-6 inline-block">
                  <span className="text-xl font-bold text-primary tracking-wider">{couponCode}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
        <Footer />
      </div>
    );
  }

  // If no orderId or email, show error
  if (!orderId || !emailParam) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container max-w-lg py-16 text-center space-y-4">
          <X className="h-16 w-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold">Link inválido</h1>
          <p className="text-muted-foreground">Este link de feedback requer um pedido e e-mail válidos.</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (loadingOrder) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container max-w-lg py-16 text-center">
          <p className="text-muted-foreground animate-pulse">Carregando dados do pedido...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (orderValid === false) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container max-w-lg py-16 text-center space-y-4">
          <X className="h-16 w-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold">Pedido não encontrado</h1>
          <p className="text-muted-foreground">Não foi possível localizar o pedido informado.</p>
        </main>
        <Footer />
      </div>
    );
  }

  const selectedProduct = orderProducts.find((p) => p.product_id === selectedProductId);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container max-w-lg py-12 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Dê seu Feedback</h1>
          <p className="text-muted-foreground">
            Conte como foi sua experiência e ganhe um bônus!
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Product selection from order */}
              {orderProducts.length > 1 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Package className="h-4 w-4" /> Qual produto você deseja avaliar? *</Label>
                  <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {orderProducts.map((p) => (
                        <SelectItem key={p.product_id} value={p.product_id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {orderProducts.length === 1 && (
                <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{orderProducts[0].name}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label>Seu Nome *</Label>
                <Input placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label>Avaliação *</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} type="button" onClick={() => setRating(s)} className="p-1 hover:scale-110 transition-transform">
                      <Star className={`h-7 w-7 ${s <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Seu Depoimento *</Label>
                <Textarea
                  placeholder="Conte como foi sua experiência com o produto..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  required
                />
              </div>

              {/* Author Photo */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Camera className="h-4 w-4" /> Sua Foto</Label>
                <div
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => document.getElementById("author-photo")?.click()}
                >
                  {authorPreview ? (
                    <img src={authorPreview} alt="preview" className="h-20 w-20 rounded-full object-cover mx-auto" />
                  ) : (
                    <div className="space-y-1">
                      <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Enviar sua foto</p>
                    </div>
                  )}
                </div>
                <input id="author-photo" type="file" accept="image/*" className="hidden" onChange={(e) => handleAuthorFile(e.target.files?.[0] || null)} />
              </div>

              {/* Product Photos - up to 4 */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Camera className="h-4 w-4" /> Fotos do Produto (até 4)</Label>
                <div className="flex flex-wrap gap-3">
                  {productPreviews.map((url, i) => (
                    <div key={i} className="relative group">
                      <img src={url} alt="preview" className="h-20 w-20 rounded-lg object-cover" />
                      <button
                        type="button"
                        onClick={() => removeProductPhoto(i)}
                        className="absolute -top-1 -right-1 rounded-full bg-destructive p-0.5 text-destructive-foreground opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {productPhotos.length < 4 && (
                    <div
                      className="h-20 w-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => document.getElementById("product-photos")?.click()}
                    >
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <p className="text-[10px] text-muted-foreground">Adicionar</p>
                    </div>
                  )}
                </div>
                <input id="product-photos" type="file" accept="image/*" multiple className="hidden" onChange={(e) => addProductPhotos(e.target.files)} />
              </div>

              <Button type="submit" className="w-full gap-2" disabled={submitting || !selectedProductId}>
                {submitting ? "Enviando..." : (
                  <>
                    <Gift className="h-4 w-4" />
                    Enviar Feedback e Ganhar Bônus
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
