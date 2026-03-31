import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Upload, Gift, CheckCircle, Camera, X } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { useStoreSettings } from "@/hooks/useStoreSettings";

export default function CustomerFeedbackPage() {
  const [params] = useSearchParams();
  const orderId = params.get("pedido") || "";
  const productId = params.get("produto") || "";
  const productName = params.get("nome") || "";

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
    if (!name || !content || !productId) {
      toast.error("Preencha todos os campos obrigatórios.");
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
        product_id: productId,
        author_name: name,
        content,
        rating,
        author_image_url: authorImageUrl || null,
        product_image_url: productImageUrls[0] || null,
        product_image_urls: productImageUrls,
        source: "customer",
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
      toast.success("Feedback enviado com sucesso!");
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
          <p className="text-muted-foreground">Sua avaliação é muito importante para nós.</p>
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

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container max-w-lg py-12 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Dê seu Feedback</h1>
          <p className="text-muted-foreground">
            Conte como foi sua experiência{productName ? ` com ${productName}` : ""} e ganhe um bônus!
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
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

              <Button type="submit" className="w-full gap-2" disabled={submitting}>
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