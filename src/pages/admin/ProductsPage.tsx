import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Upload, Trash2, Star, X, Truck, Loader2, Package, Crop, ImageMinus, Link2, Check, Eye, Download, ArrowUpRight, RefreshCw, Search, MoreHorizontal, Power, PowerOff, Copy, TrendingUp, TrendingDown, CheckCircle, AlertTriangle } from "lucide-react";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { CropImageDialog } from "@/components/admin/CropImageDialog";
import { useToast } from "@/hooks/use-toast";
import RichTextEditor from "@/components/admin/RichTextEditor";
import CreatableSelect from "@/components/admin/CreatableSelect";

interface ProdForm {
  name: string; slug: string; short_description: string; description: string;
  price: string; original_price: string; cost_price: string; badge: string; stock: string;
  benefits: string;
  weight: string; height: string; width: string; length: string;
  group_name: string; manufacturer: string;
  sku: string; ncm: string; gtin: string; unit: string;
  show_countdown: boolean;
  countdown_mode: string;
  countdown_end_time: string;
  countdown_end_date: string;
  countdown_duration_minutes: string;
  featured: boolean;
  seo_title: string; seo_description: string; seo_keywords: string;
  upsell_product_ids: string[];
}

const emptyForm: ProdForm = {
  name: "", slug: "", short_description: "", description: "",
  price: "", original_price: "", cost_price: "", badge: "", stock: "",
  benefits: "",
  weight: "0.3", height: "5", width: "15", length: "20",
  group_name: "", manufacturer: "",
  sku: "", ncm: "", gtin: "", unit: "UN",
  show_countdown: true,
  countdown_mode: "end_of_day",
  countdown_end_time: "",
  countdown_end_date: "",
  countdown_duration_minutes: "60",
  featured: false,
  seo_title: "", seo_description: "", seo_keywords: "",
  upsell_product_ids: [],
};

interface Testimonial {
  id?: string;
  author_name: string;
  content: string;
  rating: number;
  author_image_url?: string;
  product_image_url?: string;
  source?: string;
}

interface FaqItem {
  id?: string;
  question: string;
  answer: string;
}

export default function ProductsPage() {
  const { canDelete } = useAuth();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ProdForm>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [extraFiles, setExtraFiles] = useState<File[]>([]);
  const [existingExtras, setExistingExtras] = useState<string[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [newTestimonial, setNewTestimonial] = useState<Testimonial>({ author_name: "", content: "", rating: 5, source: "manual" });
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [newFaq, setNewFaq] = useState<FaqItem>({ question: "", answer: "" });
  const [cropOpen, setCropOpen] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState("");
  const [removingBg, setRemovingBg] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: storeSettings } = useStoreSettings();
  const marginGoal = (storeSettings as any)?.goal_profit_margin ?? 30;

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      // Validate SKU uniqueness
      if (form.sku && form.sku.trim() !== "") {
        const skuQuery = supabase.from("products").select("id").eq("sku", form.sku.trim());
        if (editId) skuQuery.neq("id", editId);
        const { data: skuCheck } = await skuQuery;
        if (skuCheck && skuCheck.length > 0) {
          throw new Error("SKU já está em uso por outro produto.");
        }
      }

      let image_url: string | undefined;

      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("product-images").upload(path, imageFile);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
        image_url = urlData.publicUrl;
      }

      // Upload extra images
      const uploadedExtras: string[] = [...existingExtras];
      for (const file of extraFiles) {
        const ext = file.name.split(".").pop();
        const path = `extras/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("product-images").upload(path, file);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
        uploadedExtras.push(urlData.publicUrl);
      }

      const benefits = form.benefits.split("\n").filter(Boolean);
      const payload: any = {
        name: form.name, slug: form.slug,
        short_description: form.short_description, description: form.description,
        price: parseFloat(form.price), original_price: parseFloat(form.original_price),
        cost_price: parseFloat(form.cost_price) || 0,
        badge: form.badge || null, stock: parseInt(form.stock) || 0, benefits,
        show_countdown: form.show_countdown,
        countdown_mode: form.countdown_mode,
        countdown_end_time: form.countdown_end_time || null,
        countdown_end_date: form.countdown_end_date || null,
        countdown_duration_minutes: parseInt(form.countdown_duration_minutes) || 60,
        featured: form.featured,
        weight: parseFloat(form.weight) || 0.3,
        height: parseFloat(form.height) || 5,
        width: parseFloat(form.width) || 15,
        length: parseFloat(form.length) || 20,
        group_name: form.group_name, manufacturer: form.manufacturer,
        sku: form.sku, ncm: form.ncm, gtin: form.gtin, unit: form.unit,
        extra_images: uploadedExtras,
        seo_title: form.seo_title || null,
        seo_description: form.seo_description || null,
        seo_keywords: form.seo_keywords || null,
        upsell_product_ids: form.upsell_product_ids,
      };
      if (image_url) payload.image_url = image_url;

      let productId = editId;
      if (editId) {
        const { error } = await supabase.from("products").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("products").insert(payload).select("id").single();
        if (error) throw error;
        productId = data.id;
      }

      // Save testimonials
      if (productId) {
        // Delete existing and re-insert
        await supabase.from("product_testimonials").delete().eq("product_id", productId);
        if (testimonials.length > 0) {
          const rows = testimonials.map((t) => ({
            product_id: productId!,
            author_name: t.author_name,
            content: t.content,
            rating: t.rating,
            author_image_url: t.author_image_url || null,
            product_image_url: t.product_image_url || null,
            source: t.source || "manual",
          } as any));
          const { error } = await supabase.from("product_testimonials").insert(rows);
          if (error) throw error;
        }

        // Save FAQs
        await supabase.from("product_faqs").delete().eq("product_id", productId);
        if (faqs.length > 0) {
          const faqRows = faqs.map((f, i) => ({
            product_id: productId!,
            question: f.question,
            answer: f.answer,
            sort_order: i,
          }));
          const { error: faqErr } = await supabase.from("product_faqs").insert(faqRows);
          if (faqErr) throw faqErr;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      setOpen(false); resetForm();
      toast({ title: editId ? "Produto atualizado" : "Produto cadastrado" });
    },
    onError: (err: any) => toast({ title: err?.message || "Erro ao salvar", variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("products").update({ active: !active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      // Delete related data first
      await supabase.from("product_testimonials").delete().eq("product_id", id);
      await supabase.from("product_faqs").delete().eq("product_id", id);
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Produto excluído com sucesso" });
    },
    onError: () => toast({ title: "Erro ao excluir produto", variant: "destructive" }),
  });

  const duplicateProduct = useMutation({
    mutationFn: async (p: NonNullable<typeof products>[number]) => {
      // Load testimonials and FAQs
      const [{ data: testimonialData }, { data: faqData }] = await Promise.all([
        supabase.from("product_testimonials").select("*").eq("product_id", p.id),
        supabase.from("product_faqs").select("*").eq("product_id", p.id).order("sort_order"),
      ]);

      const newSlug = `${p.slug}-copia-${Date.now()}`;
      const { data: newProd, error } = await supabase.from("products").insert({
        name: `${p.name} [COPIA]`,
        slug: newSlug,
        short_description: p.short_description,
        description: p.description,
        price: p.price,
        original_price: p.original_price,
        badge: p.badge,
        stock: p.stock,
        benefits: p.benefits as any,
        show_countdown: p.show_countdown,
        countdown_mode: (p as any).countdown_mode || "end_of_day",
        countdown_end_time: (p as any).countdown_end_time,
        countdown_end_date: (p as any).countdown_end_date,
        countdown_duration_minutes: (p as any).countdown_duration_minutes || 60,
        featured: p.featured,
        weight: p.weight,
        height: p.height,
        width: p.width,
        length: p.length,
        group_name: p.group_name,
        manufacturer: p.manufacturer,
        sku: "",
        ncm: p.ncm,
        gtin: p.gtin,
        unit: p.unit,
        image_url: p.image_url,
        extra_images: p.extra_images as any,
        active: false,
        rating: p.rating,
        reviews_count: p.reviews_count,
        seo_title: p.seo_title,
        seo_description: p.seo_description,
        seo_keywords: p.seo_keywords,
      }).select("id").single();
      if (error) throw error;

      // Duplicate testimonials
      if (testimonialData && testimonialData.length > 0) {
        await supabase.from("product_testimonials").insert(
          testimonialData.map((t: any) => ({
            product_id: newProd.id,
            author_name: t.author_name,
            content: t.content,
            rating: t.rating,
            author_image_url: t.author_image_url,
            product_image_url: t.product_image_url,
            source: t.source || "manual",
          } as any))
        );
      }

      // Duplicate FAQs
      if (faqData && faqData.length > 0) {
        await supabase.from("product_faqs").insert(
          faqData.map((f: any, i: number) => ({
            product_id: newProd.id,
            question: f.question,
            answer: f.answer,
            sort_order: i,
          }))
        );
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Produto duplicado com sucesso! SKU removido." });
    },
    onError: () => toast({ title: "Erro ao duplicar produto", variant: "destructive" }),
  });

  const resetForm = () => {
    setForm(emptyForm); setEditId(null); setImageFile(null);
    setExtraFiles([]); setExistingExtras([]); setTestimonials([]);
    setNewTestimonial({ author_name: "", content: "", rating: 5, source: "manual" });
    setFaqs([]); setNewFaq({ question: "", answer: "" });
    setImagePreview(null);
  };

  const openEdit = async (p: NonNullable<typeof products>[number]) => {
    setEditId(p.id);
    const benefits = Array.isArray(p.benefits) ? (p.benefits as string[]).join("\n") : "";
    const extras = Array.isArray((p as any).extra_images) ? (p as any).extra_images as string[] : [];
    setExistingExtras(extras);
    setForm({
      name: p.name, slug: p.slug, short_description: p.short_description,
      description: p.description, price: String(p.price), original_price: String(p.original_price),
      cost_price: String((p as any).cost_price ?? 0),
      badge: p.badge ?? "", stock: String(p.stock), benefits,
      weight: String((p as any).weight ?? 0.3),
      height: String((p as any).height ?? 5),
      width: String((p as any).width ?? 15),
      length: String((p as any).length ?? 20),
      group_name: (p as any).group_name ?? "",
      manufacturer: (p as any).manufacturer ?? "",
      sku: (p as any).sku ?? "",
      ncm: (p as any).ncm ?? "",
      gtin: (p as any).gtin ?? "",
      unit: (p as any).unit ?? "UN",
      show_countdown: (p as any).show_countdown !== false,
      countdown_mode: (p as any).countdown_mode ?? "end_of_day",
      countdown_end_time: (p as any).countdown_end_time ?? "",
      countdown_end_date: (p as any).countdown_end_date ? new Date((p as any).countdown_end_date).toISOString().slice(0, 16) : "",
      countdown_duration_minutes: String((p as any).countdown_duration_minutes ?? 60),
      featured: (p as any).featured === true,
      seo_title: (p as any).seo_title ?? "",
      seo_description: (p as any).seo_description ?? "",
      seo_keywords: (p as any).seo_keywords ?? "",
      upsell_product_ids: Array.isArray((p as any).upsell_product_ids) ? (p as any).upsell_product_ids : [],
    });

    // Load testimonials
    const { data } = await supabase.from("product_testimonials")
      .select("*").eq("product_id", p.id).order("created_at");
    setTestimonials((data ?? []).map((t: any) => ({
      id: t.id, author_name: t.author_name, content: t.content, rating: t.rating,
      author_image_url: t.author_image_url, product_image_url: t.product_image_url, source: t.source || "manual",
    })));

    // Load FAQs
    const { data: faqData } = await supabase.from("product_faqs")
      .select("*").eq("product_id", p.id).order("sort_order");
    setFaqs((faqData ?? []).map((f: any) => ({
      id: f.id, question: f.question, answer: f.answer,
    })));

    setOpen(true);
  };

  const addTestimonial = () => {
    if (!newTestimonial.author_name || !newTestimonial.content) return;
    setTestimonials([...testimonials, { ...newTestimonial }]);
    setNewTestimonial({ author_name: "", content: "", rating: 5, source: "manual" });
  };

  const removeTestimonial = (idx: number) => {
    setTestimonials(testimonials.filter((_, i) => i !== idx));
  };

  const removeExistingExtra = (idx: number) => {
    setExistingExtras(existingExtras.filter((_, i) => i !== idx));
  };

  const fmt = (v: number) => `R$ ${Number(v).toFixed(2).replace(".", ",")}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold">Produtos</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <BlingImportDialog onImported={() => qc.invalidateQueries({ queryKey: ["admin-products"] })} />
          <BlingExportDialog products={products || []} />
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Novo Produto</Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? "Editar" : "Novo"} Produto</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
              <Tabs defaultValue="basic">
                <TabsList className="grid w-full grid-cols-7">
                  <TabsTrigger value="basic">Dados</TabsTrigger>
                  <TabsTrigger value="dimensions">Frete</TabsTrigger>
                  <TabsTrigger value="bling">Fiscal/Bling</TabsTrigger>
                  <TabsTrigger value="images">Imagens</TabsTrigger>
                  <TabsTrigger value="testimonials">Depoimentos</TabsTrigger>
                  <TabsTrigger value="faq">FAQ</TabsTrigger>
                  <TabsTrigger value="seo">SEO</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                    <div className="space-y-2"><Label>Slug *</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Grupo</Label>
                      <CreatableSelect table="product_groups" value={form.group_name} onChange={(v) => setForm({ ...form, group_name: v })} placeholder="Selecionar grupo..." />
                    </div>
                    <div className="space-y-2">
                      <Label>Fabricante</Label>
                      <CreatableSelect table="manufacturers" value={form.manufacturer} onChange={(v) => setForm({ ...form, manufacturer: v })} placeholder="Selecionar fabricante..." />
                    </div>
                  </div>
                  <div className="space-y-2"><Label>Descrição Curta</Label><Input value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} /></div>
                  <div className="space-y-2">
                    <Label>Descrição Completa (HTML)</Label>
                    <RichTextEditor value={form.description} onChange={(val) => setForm({ ...form, description: val })} placeholder="Escreva a descrição do produto com formatação rica..." />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-2">
                      <Label>Preço de Custo (R$)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                        <Input className="pl-10" type="number" step="0.01" min="0" value={form.cost_price} onChange={(e) => {
                          const newCost = e.target.value;
                          const updatedForm = { ...form, cost_price: newCost };
                          // Auto-suggest price if empty
                          if (newCost && parseFloat(newCost) > 0 && (!form.price || parseFloat(form.price) === 0)) {
                            const suggested = parseFloat(newCost) / (1 - marginGoal / 100);
                            updatedForm.price = suggested.toFixed(2);
                          }
                          setForm(updatedForm);
                        }} placeholder="0,00" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Preço de Venda (R$) <span className="text-destructive">*</span></Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                        <Input className="pl-10" type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required placeholder="0,00" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Preço Original (R$)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                        <Input className="pl-10" type="number" step="0.01" min="0" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })} placeholder="0,00" />
                      </div>
                    </div>
                    <div className="space-y-2"><Label>Estoque</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
                  </div>
                  {/* Margin indicator */}
                  {parseFloat(form.cost_price) > 0 && parseFloat(form.price) > 0 && (() => {
                    const cost = parseFloat(form.cost_price);
                    const sale = parseFloat(form.price);
                    const margin = ((sale - cost) / sale) * 100;
                    const isOk = margin >= marginGoal;
                    const isTooHigh = margin > marginGoal * 2;
                    const isLow = margin < marginGoal;
                    const suggestedPrice = cost / (1 - marginGoal / 100);
                    return (
                      <div className={`flex items-center gap-3 rounded-lg border p-3 ${isOk && !isTooHigh ? 'border-green-500/30 bg-green-50 dark:bg-green-950/20' : isTooHigh ? 'border-yellow-500/30 bg-yellow-50 dark:bg-yellow-950/20' : 'border-red-500/30 bg-red-50 dark:bg-red-950/20'}`}>
                        {isOk && !isTooHigh ? (
                          <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                        ) : isTooHigh ? (
                          <TrendingUp className="h-5 w-5 text-yellow-600 shrink-0" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-red-600 shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            Margem de Lucro: <span className="font-bold">{margin.toFixed(1)}%</span>
                            <span className="text-muted-foreground ml-2">(Meta: {marginGoal}%)</span>
                          </p>
                          {isLow && (
                            <p className="text-xs text-red-600 mt-0.5">
                              ⚠️ Abaixo da meta. Preço sugerido: <span className="font-semibold">R$ {suggestedPrice.toFixed(2)}</span>
                            </p>
                          )}
                          {isTooHigh && (
                            <p className="text-xs text-yellow-600 mt-0.5">
                              Margem muito acima da meta — verifique competitividade
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                  <div className="space-y-2"><Label>Badge</Label><Input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder="ex: Mais Vendido" /></div>
                  <div className="flex items-center justify-between rounded-lg border border-border p-3 mt-2">
                    <div>
                      <Label htmlFor="show_countdown" className="font-medium">Contador de Oferta</Label>
                      <p className="text-xs text-muted-foreground">Exibir cronômetro de promoção no produto</p>
                    </div>
                    <Switch id="show_countdown" checked={form.show_countdown} onCheckedChange={(checked) => setForm({ ...form, show_countdown: checked })} />
                  </div>
                  {form.show_countdown && (
                    <div className="space-y-3 rounded-lg border border-border p-3">
                      <div className="space-y-2">
                        <Label className="font-medium">Modo do Contador</Label>
                        <select
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={form.countdown_mode}
                          onChange={(e) => setForm({ ...form, countdown_mode: e.target.value })}
                        >
                          <option value="end_of_day">Até o final do dia (todos os dias)</option>
                          <option value="daily_until">Até horário específico (todos os dias)</option>
                          <option value="specific_datetime">Até data e hora específicas</option>
                          <option value="after_access">X minutos após o usuário acessar</option>
                        </select>
                      </div>
                      {form.countdown_mode === "daily_until" && (
                        <div className="space-y-2">
                          <Label>Horário limite (HH:MM)</Label>
                          <Input type="time" value={form.countdown_end_time} onChange={(e) => setForm({ ...form, countdown_end_time: e.target.value })} />
                        </div>
                      )}
                      {form.countdown_mode === "specific_datetime" && (
                        <div className="space-y-2">
                          <Label>Data e Hora final</Label>
                          <Input type="datetime-local" value={form.countdown_end_date} onChange={(e) => setForm({ ...form, countdown_end_date: e.target.value })} />
                        </div>
                      )}
                      {form.countdown_mode === "after_access" && (
                        <div className="space-y-2">
                          <Label>Duração em minutos</Label>
                          <Input type="number" value={form.countdown_duration_minutes} onChange={(e) => setForm({ ...form, countdown_duration_minutes: e.target.value })} placeholder="60" />
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <Label htmlFor="featured" className="font-medium">Produto Destaque</Label>
                      <p className="text-xs text-muted-foreground">Exibir no carrossel de destaques da home</p>
                    </div>
                    <Switch id="featured" checked={form.featured} onCheckedChange={(checked) => setForm({ ...form, featured: checked })} />
                  </div>
                  <div className="space-y-2"><Label>Benefícios (um por linha)</Label><Textarea value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} rows={4} /></div>

                  {/* Upsell Products */}
                  <div className="space-y-2">
                    <Label className="font-medium">Produtos de Upsell</Label>
                    <p className="text-xs text-muted-foreground">Selecione quais produtos serão sugeridos como upsell no checkout, página do produto e mensagens de WhatsApp.</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto rounded-lg border border-border p-3">
                      {products?.filter(pr => pr.id !== editId && pr.active).map(pr => (
                        <label key={pr.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded p-1.5 transition">
                          <Checkbox
                            checked={form.upsell_product_ids.includes(pr.id)}
                            onCheckedChange={(checked) => {
                              setForm(prev => ({
                                ...prev,
                                upsell_product_ids: checked
                                  ? [...prev.upsell_product_ids, pr.id]
                                  : prev.upsell_product_ids.filter(id => id !== pr.id),
                              }));
                            }}
                          />
                          <img src={pr.image_url || ""} alt="" className="h-8 w-8 rounded object-contain bg-muted" />
                          <span className="text-sm truncate">{pr.name}</span>
                          <span className="text-xs text-muted-foreground ml-auto">R$ {Number(pr.price).toFixed(2).replace(".", ",")}</span>
                        </label>
                      ))}
                      {(!products || products.filter(pr => pr.id !== editId && pr.active).length === 0) && (
                        <p className="text-sm text-muted-foreground text-center py-2">Nenhum outro produto ativo disponível</p>
                      )}
                    </div>
                    {form.upsell_product_ids.length > 0 && (
                      <p className="text-xs text-primary font-medium">{form.upsell_product_ids.length} produto(s) selecionado(s)</p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="dimensions" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">Dados usados para cálculo automático de frete via Melhor Envio.</p>
                  
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => {
                      setForm({ ...form, weight: "0.3", height: "10", width: "20", length: "25" });
                    }}>
                      <Package className="h-4 w-4" /> Caixa Padrão (até 4 potes)
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Peso (kg) *</Label><Input type="number" step="0.01" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Altura (cm) *</Label><Input type="number" step="0.1" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Largura (cm) *</Label><Input type="number" step="0.1" value={form.width} onChange={(e) => setForm({ ...form, width: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Comprimento (cm) *</Label><Input type="number" step="0.1" value={form.length} onChange={(e) => setForm({ ...form, length: e.target.value })} /></div>
                  </div>

                  <AdminShippingSimulator form={form} />
                </TabsContent>

                <TabsContent value="bling" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">Campos necessários para integração com o Bling ERP e emissão de NF-e.</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>SKU / Código</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="ex: PROT-KIDS-001" /></div>
                    <div className="space-y-2"><Label>Unidade</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="UN, PÇ, KG..." /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>NCM</Label><Input value={form.ncm} onChange={(e) => setForm({ ...form, ncm: e.target.value })} placeholder="ex: 2106.90.90" /></div>
                    <div className="space-y-2"><Label>GTIN / EAN</Label><Input value={form.gtin} onChange={(e) => setForm({ ...form, gtin: e.target.value })} placeholder="Código de barras" /></div>
                  </div>
                </TabsContent>

                <TabsContent value="images" className="space-y-4 mt-4">
                  <div className="space-y-3">
                    <Label>Imagem Destaque</Label>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => document.getElementById("prod-img")?.click()}>
                        <Upload className="h-4 w-4" /> Selecionar
                      </Button>
                      {(imagePreview || (editId && products?.find(p => p.id === editId)?.image_url)) && (
                        <>
                          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => {
                            const url = imagePreview || products?.find(p => p.id === editId)?.image_url;
                            if (url) { setCropImageUrl(url); setCropOpen(true); }
                          }}>
                            <Crop className="h-4 w-4" /> Recortar
                          </Button>
                          <Button type="button" variant="outline" size="sm" className="gap-1" disabled={removingBg} onClick={async () => {
                            const url = imagePreview || products?.find(p => p.id === editId)?.image_url;
                            if (!url) return;
                            setRemovingBg(true);
                            try {
                              const { data, error } = await supabase.functions.invoke("remove-background", { body: { image_url: url } });
                              if (error || !data?.image_base64) throw new Error(data?.error || "Erro ao remover fundo");
                              const byteString = atob(data.image_base64);
                              const ab = new ArrayBuffer(byteString.length);
                              const ia = new Uint8Array(ab);
                              for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
                              const blob = new Blob([ab], { type: data.mime_type || "image/png" });
                              const file = new File([blob], "sem-fundo.png", { type: "image/png" });
                              setImageFile(file);
                              setImagePreview(URL.createObjectURL(blob));
                              toast({ title: "Fundo removido com sucesso!" });
                            } catch (err: any) {
                              toast({ title: err.message || "Erro ao remover fundo", variant: "destructive" });
                            } finally { setRemovingBg(false); }
                          }}>
                            {removingBg ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageMinus className="h-4 w-4" />}
                            {removingBg ? "Processando..." : "Remover Fundo"}
                          </Button>
                        </>
                      )}
                    </div>
                    {(imagePreview || (editId && products?.find(p => p.id === editId)?.image_url)) && (
                      <img src={imagePreview || products?.find(p => p.id === editId)?.image_url || ""} alt="Preview" className="h-24 w-24 rounded border border-border object-contain bg-muted" />
                    )}
                    <input id="prod-img" type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setImageFile(file);
                      if (file) setImagePreview(URL.createObjectURL(file));
                    }} />
                    {!imagePreview && !editId && <span className="text-sm text-muted-foreground">{imageFile?.name || "Nenhum arquivo"}</span>}
                  </div>

                  <CropImageDialog
                    open={cropOpen}
                    onOpenChange={setCropOpen}
                    imageUrl={cropImageUrl}
                    aspect={1}
                    onCropComplete={(blob) => {
                      const file = new File([blob], "cropped.png", { type: "image/png" });
                      setImageFile(file);
                      setImagePreview(URL.createObjectURL(blob));
                    }}
                  />

                  <div className="space-y-2">
                    <Label>Imagens Extras</Label>
                    {existingExtras.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {existingExtras.map((url, i) => (
                          <div key={i} className="relative group">
                            <img src={url} alt="" className="h-16 w-16 rounded border object-cover" />
                            <button type="button" onClick={() => removeExistingExtra(i)}
                              className="absolute -top-1 -right-1 rounded-full bg-destructive p-0.5 text-destructive-foreground opacity-0 group-hover:opacity-100 transition">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => document.getElementById("extra-imgs")?.click()}>
                        <Upload className="h-4 w-4" /> Adicionar Extras
                      </Button>
                      <span className="text-sm text-muted-foreground">{extraFiles.length > 0 ? `${extraFiles.length} arquivo(s)` : ""}</span>
                    </div>
                    <input id="extra-imgs" type="file" accept="image/*" multiple className="hidden"
                      onChange={(e) => setExtraFiles(Array.from(e.target.files || []))} />
                  </div>
                </TabsContent>

                <TabsContent value="testimonials" className="space-y-4 mt-4">
                  {/* Feedback link */}
                  {editId && (
                    <div className="rounded-lg border border-dashed p-3 bg-muted/30 space-y-2">
                      <p className="text-sm font-medium">📩 Link para Feedback do Cliente</p>
                      <div className="flex gap-2">
                        <Input readOnly value={`${window.location.origin}/feedback?pedido=&produto=${editId}&nome=${encodeURIComponent(form.name)}`} className="text-xs" />
                        <Button type="button" variant="outline" size="sm" onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/feedback?pedido=&produto=${editId}&nome=${encodeURIComponent(form.name)}`);
                          toast({ title: "Link copiado!" });
                        }}>Copiar</Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Envie esse link por WhatsApp ou email para o cliente deixar seu depoimento.</p>
                    </div>
                  )}

                  {testimonials.map((t, i) => (
                    <div key={i} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-start gap-3">
                        {t.author_image_url && (
                          <img src={t.author_image_url} alt="" className="h-10 w-10 rounded-full object-cover flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{t.author_name}</span>
                            <span className="flex text-amber-500">
                              {Array.from({ length: t.rating }).map((_, j) => <Star key={j} className="h-3 w-3 fill-current" />)}
                            </span>
                            <Badge variant={t.source === "ai" ? "secondary" : t.source === "customer" ? "default" : "outline"} className="text-[10px]">
                              {t.source === "ai" ? "🤖 IA" : t.source === "customer" ? "👤 Cliente" : "✍️ Manual"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{t.content}</p>
                          {t.product_image_url && (
                            <img src={t.product_image_url} alt="" className="h-16 w-16 rounded-lg object-cover mt-2" />
                          )}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button type="button" variant="ghost" size="icon" onClick={() => {
                            setEditingTestimonialIdx(i);
                            setNewTestimonial({ ...t });
                          }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeTestimonial(i)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="space-y-3 rounded-lg border border-dashed p-4">
                    <p className="text-sm font-medium">{editingTestimonialIdx !== null ? "Editar Depoimento" : "Adicionar Depoimento"}</p>
                    <div className="grid grid-cols-3 gap-3">
                      <Input placeholder="Nome do autor" value={newTestimonial.author_name}
                        onChange={(e) => setNewTestimonial({ ...newTestimonial, author_name: e.target.value })} />
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Nota:</Label>
                        <Input type="number" min={1} max={5} className="w-16" value={newTestimonial.rating}
                          onChange={(e) => setNewTestimonial({ ...newTestimonial, rating: parseInt(e.target.value) || 5 })} />
                      </div>
                      <Select value={newTestimonial.source || "manual"} onValueChange={(v) => setNewTestimonial({ ...newTestimonial, source: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">✍️ Manual</SelectItem>
                          <SelectItem value="ai">🤖 Gerado por IA</SelectItem>
                          <SelectItem value="customer">👤 Cliente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Textarea placeholder="Texto do depoimento..." value={newTestimonial.content}
                      onChange={(e) => setNewTestimonial({ ...newTestimonial, content: e.target.value })} rows={2} />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Foto do Autor (URL)</Label>
                        <Input placeholder="https://..." value={newTestimonial.author_image_url || ""}
                          onChange={(e) => setNewTestimonial({ ...newTestimonial, author_image_url: e.target.value })} />
                      </div>
                      <div>
                        <Label className="text-xs">Foto do Produto (URL)</Label>
                        <Input placeholder="https://..." value={newTestimonial.product_image_url || ""}
                          onChange={(e) => setNewTestimonial({ ...newTestimonial, product_image_url: e.target.value })} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => {
                        if (!newTestimonial.author_name || !newTestimonial.content) return;
                        if (editingTestimonialIdx !== null) {
                          const updated = [...testimonials];
                          updated[editingTestimonialIdx] = { ...newTestimonial };
                          setTestimonials(updated);
                          setEditingTestimonialIdx(null);
                        } else {
                          setTestimonials([...testimonials, { ...newTestimonial }]);
                        }
                        setNewTestimonial({ author_name: "", content: "", rating: 5, source: "manual" });
                      }}>
                        <Plus className="h-4 w-4 mr-1" /> {editingTestimonialIdx !== null ? "Salvar" : "Adicionar"}
                      </Button>
                      {editingTestimonialIdx !== null && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => {
                          setEditingTestimonialIdx(null);
                          setNewTestimonial({ author_name: "", content: "", rating: 5, source: "manual" });
                        }}>Cancelar</Button>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="faq" className="space-y-4 mt-4">
                  {faqs.map((f, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{f.question}</p>
                        <p className="text-sm text-muted-foreground mt-1">{f.answer}</p>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => setFaqs(faqs.filter((_, j) => j !== i))}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}

                  <div className="space-y-3 rounded-lg border border-dashed p-4">
                    <p className="text-sm font-medium">Adicionar Pergunta</p>
                    <Input placeholder="Pergunta" value={newFaq.question}
                      onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })} />
                    <Textarea placeholder="Resposta..." value={newFaq.answer}
                      onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })} rows={2} />
                    <Button type="button" variant="outline" size="sm" onClick={() => {
                      if (!newFaq.question || !newFaq.answer) return;
                      setFaqs([...faqs, { ...newFaq }]);
                      setNewFaq({ question: "", answer: "" });
                    }}>
                      <Plus className="h-4 w-4 mr-1" /> Adicionar
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="seo" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">Otimize como seu produto aparece nos mecanismos de busca (Google, Bing, etc).</p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Título SEO</Label>
                      <span className={`text-xs ${form.seo_title.length > 60 ? "text-destructive" : form.seo_title.length >= 50 ? "text-success" : "text-muted-foreground"}`}>
                        {form.seo_title.length}/60
                      </span>
                    </div>
                    <Input value={form.seo_title} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} placeholder={form.name || "Título do produto para SEO"} />
                    <p className="text-xs text-muted-foreground">Ideal: 50-60 caracteres. Se vazio, usa o nome do produto.</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Meta Description</Label>
                      <span className={`text-xs ${form.seo_description.length > 160 ? "text-destructive" : form.seo_description.length >= 120 ? "text-success" : "text-muted-foreground"}`}>
                        {form.seo_description.length}/160
                      </span>
                    </div>
                    <Textarea value={form.seo_description} onChange={(e) => setForm({ ...form, seo_description: e.target.value })} placeholder={form.short_description || "Descrição curta para mecanismos de busca"} rows={3} />
                    <p className="text-xs text-muted-foreground">Ideal: 120-160 caracteres. Se vazio, usa a descrição curta.</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Palavras-chave</Label>
                    <Input value={form.seo_keywords} onChange={(e) => setForm({ ...form, seo_keywords: e.target.value })} placeholder="suplemento, proteína, saúde, etc." />
                    <p className="text-xs text-muted-foreground">Separadas por vírgula.</p>
                  </div>

                  {/* Google Preview */}
                  <div className="rounded-lg border border-border p-4 bg-muted/30">
                    <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1"><Search className="h-3 w-3" /> Preview no Google</p>
                    <div className="space-y-1">
                      <p className="text-[#1a0dab] text-lg leading-tight truncate">
                        {form.seo_title || form.name || "Título do Produto"} | D7 Pharma Brazil
                      </p>
                      <p className="text-[#006621] text-sm truncate">
                        d7pharmabrazil.lovable.app/produto/{form.slug || "slug-do-produto"}
                      </p>
                      <p className="text-sm text-[#545454] line-clamp-2">
                        {form.seo_description || form.short_description || "Descrição do produto aparecerá aqui nos resultados de busca..."}
                      </p>
                    </div>
                  </div>
                </TabsContent>

              </Tabs>

              <Button type="submit" className="w-full" disabled={save.isPending}>
                {save.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="hidden md:table-cell">SKU</TableHead>
                <TableHead className="hidden lg:table-cell">Grupo</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : !products?.length ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum produto</TableCell></TableRow>
              ) : (
                products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-xs">{(p as any).sku || "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">{(p as any).group_name || "—"}</TableCell>
                    <TableCell>{fmt(p.price)}</TableCell>
                    <TableCell>{p.stock}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge variant={p.active ? "default" : "secondary"} className="cursor-pointer" onClick={() => toggleActive.mutate({ id: p.id, active: p.active })}>
                          {p.active ? "Ativo" : "Inativo"}
                        </Badge>
                        {(p as any).featured && <Badge variant="outline" className="text-xs">⭐</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(p)}>
                            <Pencil className="h-4 w-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <a href={`/produto/${p.slug}`} target="_blank" rel="noopener noreferrer">
                              <Eye className="h-4 w-4 mr-2" /> Visualizar
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/produto/${p.slug}?ref=direct`);
                            toast({ title: "Link copiado!" });
                          }}>
                            <Link2 className="h-4 w-4 mr-2" /> Copiar Link
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicateProduct.mutate(p)}>
                            <Copy className="h-4 w-4 mr-2" /> Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => toggleActive.mutate({ id: p.id, active: p.active })}>
                            {p.active ? <PowerOff className="h-4 w-4 mr-2" /> : <Power className="h-4 w-4 mr-2" />}
                            {p.active ? "Desativar" : "Ativar"}
                          </DropdownMenuItem>
                          {canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                    <Trash2 className="h-4 w-4 mr-2" /> Excluir
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir produto</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir <strong>{p.name}</strong>? Esta ação não pode ser desfeita. Todos os depoimentos e FAQs vinculados também serão removidos.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteProduct.mutate(p.id)}>
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                          </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function CopyLinkButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/produto/${slug}?ref=direct`;
  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="icon" title="Copiar link de compra direta" onClick={handleCopy}>
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Link2 className="h-4 w-4" />}
    </Button>
  );
}

function AdminShippingSimulator({ form }: { form: ProdForm }) {
  const [cep, setCep] = useState("");
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const formatCep = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 8);
    return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
  };

  const simulate = async () => {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    setLoading(true);
    setResults([]);
    try {
      const { data, error } = await supabase.functions.invoke("calculate-shipping", {
        body: {
          cep_destino: clean,
          produtos: [{
            price: parseFloat(form.price) || 0,
            quantity: qty,
            weight: parseFloat(form.weight) || 0.3,
            height: parseFloat(form.height) || 5,
            width: parseFloat(form.width) || 15,
            length: parseFloat(form.length) || 20,
          }],
        },
      });
      if (!error && data?.options) setResults(data.options);
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <div className="mt-4 rounded-lg border border-dashed border-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Truck className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Simular Frete</span>
      </div>
      <div className="flex items-end gap-2">
        <div className="space-y-1">
          <Label className="text-xs">CEP destino</Label>
          <Input placeholder="00000-000" value={cep} onChange={(e) => setCep(formatCep(e.target.value))} className="w-36" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Qtd</Label>
          <Input type="number" min={1} max={10} value={qty} onChange={(e) => setQty(Number(e.target.value) || 1)} className="w-20" />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={simulate} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Calcular"}
        </Button>
      </div>
      {results.length > 0 && (
        <div className="space-y-1">
          {results.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between rounded border border-border px-3 py-2 text-sm">
              <span>{r.company} — {r.name}</span>
              <span className="font-semibold text-primary">
                {r.price === 0 ? "Grátis" : `R$ ${r.price.toFixed(2).replace(".", ",")}`} · {r.delivery_time}d
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface BlingProduct {
  id: number;
  nome: string;
  codigo: string;
  preco: number;
  unidade: string;
  estoque: number;
  gtin: string;
  ncm: string;
}

function BlingImportDialog({ onImported }: { onImported: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [blingProducts, setBlingProducts] = useState<BlingProduct[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const loadProducts = async () => {
    setLoading(true);
    setBlingProducts([]);
    try {
      const { data, error } = await supabase.functions.invoke("bling-list-products", {
        body: { page: 1, search },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setBlingProducts(data.products || []);
    } catch (err: any) {
      toast({ title: err.message || "Erro ao buscar produtos do Bling", variant: "destructive" });
    }
    setLoading(false);
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === blingProducts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(blingProducts.map(p => p.id)));
    }
  };

  const handleImport = async () => {
    if (selected.size === 0) return;
    setImporting(true);
    let success = 0;
    let fail = 0;
    for (const blingId of selected) {
      const bp = blingProducts.find(p => p.id === blingId);
      if (!bp) continue;
      try {
        const slug = bp.codigo?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "") || bp.nome.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50);
        const { error } = await supabase.from("products").insert({
          name: bp.nome,
          slug: slug + "-" + Date.now().toString(36).slice(-4),
          price: bp.preco || 0,
          original_price: bp.preco || 0,
          stock: bp.estoque || 0,
          sku: bp.codigo || "",
          unit: bp.unidade || "UN",
          ncm: bp.ncm || "",
          gtin: bp.gtin || "",
          active: true,
        });
        if (error) throw error;
        success++;
      } catch {
        fail++;
      }
    }
    setImporting(false);
    toast({ title: `Importação: ${success} ok, ${fail} erros` });
    if (success > 0) onImported();
    setOpen(false);
    setSelected(new Set());
    setBlingProducts([]);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setBlingProducts([]); setSelected(new Set()); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2"><Download className="h-4 w-4" />Importar do Bling</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Importar Produtos do Bling</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="Buscar por nome ou código..." value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadProducts()} />
            <Button onClick={loadProducts} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-2">Buscar</span>
            </Button>
          </div>

          {blingProducts.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={selected.size === blingProducts.length} onCheckedChange={toggleAll} />
                  Selecionar todos ({blingProducts.length})
                </label>
                <span className="text-sm text-muted-foreground">{selected.size} selecionado(s)</span>
              </div>
              <div className="border rounded-lg divide-y max-h-[40vh] overflow-y-auto">
                {blingProducts.map((p) => (
                  <label key={p.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer">
                    <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.nome}</p>
                      <p className="text-xs text-muted-foreground">{p.codigo || "Sem código"} · R$ {Number(p.preco).toFixed(2).replace(".", ",")} · Estoque: {p.estoque}</p>
                    </div>
                  </label>
                ))}
              </div>
              <Button onClick={handleImport} disabled={importing || selected.size === 0} className="w-full">
                {importing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                Importar {selected.size} produto(s)
              </Button>
            </>
          )}

          {!loading && blingProducts.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              Clique em "Buscar" para listar os produtos do Bling
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BlingExportDialog({ products }: { products: any[] }) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === products.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map(p => p.id)));
    }
  };

  const handleExport = async () => {
    if (selected.size === 0) return;
    setExporting(true);
    let success = 0;
    let fail = 0;
    for (const productId of selected) {
      try {
        const { data, error } = await supabase.functions.invoke("bling-export-product", {
          body: { product_id: productId },
        });
        if (error || data?.error) { fail++; } else { success++; }
      } catch { fail++; }
      await new Promise(r => setTimeout(r, 500));
    }
    setExporting(false);
    toast({ title: `Exportação: ${success} ok, ${fail} erros` });
    setOpen(false);
    setSelected(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSelected(new Set()); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2"><ArrowUpRight className="h-4 w-4" />Enviar ao Bling</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Enviar Produtos ao Bling</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={selected.size === products.length && products.length > 0} onCheckedChange={toggleAll} />
              Selecionar todos ({products.length})
            </label>
            <span className="text-sm text-muted-foreground">{selected.size} selecionado(s)</span>
          </div>
          <div className="border rounded-lg divide-y max-h-[50vh] overflow-y-auto">
            {products.map((p) => (
              <label key={p.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer">
                <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.sku || "Sem SKU"} · R$ {Number(p.price).toFixed(2).replace(".", ",")} · Estoque: {p.stock}</p>
                </div>
                <Badge variant={p.active ? "default" : "secondary"} className="text-xs">{p.active ? "Ativo" : "Inativo"}</Badge>
              </label>
            ))}
          </div>
          <Button onClick={handleExport} disabled={exporting || selected.size === 0} className="w-full">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowUpRight className="h-4 w-4 mr-2" />}
            Enviar {selected.size} produto(s) ao Bling
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
