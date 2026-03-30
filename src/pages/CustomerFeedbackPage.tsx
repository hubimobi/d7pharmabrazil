import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Upload, Gift, CheckCircle, Camera } from "lucide-react";
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
  const [productPhoto, setProductPhoto] = useState<File | null>(null);
  const [authorPreview, setAuthorPreview] = useState<string | null>(null);
  const [productPreview, setProductPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [couponCode, setCouponCode] = useState("");

  const handleFileChange = (type: "author" | "product", file: File | null) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (type === "author") {
      setAuthorPhoto(file);
      setAuthorPreview(url);
    } else {
      setProductPhoto(file);
      setProductPreview(url);
    }
  };

  const uploadImage = async (file: File, prefix: string) => {
    const ext = file.name.split(".").pop();
    const path = `testimonials/${prefix}-${Date.now()}.${ext}`;
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
      let productImageUrl: string | undefined;

      if (authorPhoto) authorImageUrl = await uploadImage(authorPhoto, "author");
      if (productPhoto) productImageUrl = await uploadImage(productPhoto, "product");

      const { error } = await supabase.from("product_testimonials").insert({
        product_id: productId,
        author_name: name,
        content,
        rating,
        author_image_url: authorImageUrl || null,
        product_image_url: productImageUrl || null,
        source: "customer",
      } as any);
      if (error) throw error;

      // Check if there's a feedback bonus coupon
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

              <div className="grid grid-cols-2 gap-4">
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
                        <p className="text-xs text-muted-foreground">Enviar foto</p>
                      </div>
                    )}
                  </div>
                  <input id="author-photo" type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange("author", e.target.files?.[0] || null)} />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Camera className="h-4 w-4" /> Foto do Produto</Label>
                  <div
                    className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => document.getElementById("product-photo")?.click()}
                  >
                    {productPreview ? (
                      <img src={productPreview} alt="preview" className="h-20 w-20 rounded-lg object-cover mx-auto" />
                    ) : (
                      <div className="space-y-1">
                        <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Enviar foto</p>
                      </div>
                    )}
                  </div>
                  <input id="product-photo" type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange("product", e.target.files?.[0] || null)} />
                </div>
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
