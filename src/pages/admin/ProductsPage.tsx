import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Upload, Trash2, Star, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import RichTextEditor from "@/components/admin/RichTextEditor";
import CreatableSelect from "@/components/admin/CreatableSelect";

interface ProdForm {
  name: string; slug: string; short_description: string; description: string;
  price: string; original_price: string; badge: string; stock: string;
  benefits: string;
  weight: string; height: string; width: string; length: string;
  group_name: string; manufacturer: string;
  sku: string; ncm: string; gtin: string; unit: string;
  show_countdown: boolean;
}

const emptyForm: ProdForm = {
  name: "", slug: "", short_description: "", description: "",
  price: "", original_price: "", badge: "", stock: "",
  benefits: "",
  weight: "0.3", height: "5", width: "15", length: "20",
  group_name: "", manufacturer: "",
  sku: "", ncm: "", gtin: "", unit: "UN",
  show_countdown: true,
};

interface Testimonial {
  id?: string;
  author_name: string;
  content: string;
  rating: number;
}

export default function ProductsPage() {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ProdForm>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [extraFiles, setExtraFiles] = useState<File[]>([]);
  const [existingExtras, setExistingExtras] = useState<string[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [newTestimonial, setNewTestimonial] = useState<Testimonial>({ author_name: "", content: "", rating: 5 });
  const { toast } = useToast();
  const qc = useQueryClient();

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
        badge: form.badge || null, stock: parseInt(form.stock) || 0, benefits,
        show_countdown: form.show_countdown,
        weight: parseFloat(form.weight) || 0.3,
        height: parseFloat(form.height) || 5,
        width: parseFloat(form.width) || 15,
        length: parseFloat(form.length) || 20,
        group_name: form.group_name, manufacturer: form.manufacturer,
        sku: form.sku, ncm: form.ncm, gtin: form.gtin, unit: form.unit,
        extra_images: uploadedExtras,
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
          }));
          const { error } = await supabase.from("product_testimonials").insert(rows);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      setOpen(false); resetForm();
      toast({ title: editId ? "Produto atualizado" : "Produto cadastrado" });
    },
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
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

  const resetForm = () => {
    setForm(emptyForm); setEditId(null); setImageFile(null);
    setExtraFiles([]); setExistingExtras([]); setTestimonials([]);
    setNewTestimonial({ author_name: "", content: "", rating: 5 });
  };

  const openEdit = async (p: NonNullable<typeof products>[number]) => {
    setEditId(p.id);
    const benefits = Array.isArray(p.benefits) ? (p.benefits as string[]).join("\n") : "";
    const extras = Array.isArray((p as any).extra_images) ? (p as any).extra_images as string[] : [];
    setExistingExtras(extras);
    setForm({
      name: p.name, slug: p.slug, short_description: p.short_description,
      description: p.description, price: String(p.price), original_price: String(p.original_price),
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
    });

    // Load testimonials
    const { data } = await supabase.from("product_testimonials")
      .select("*").eq("product_id", p.id).order("created_at");
    setTestimonials((data ?? []).map((t: any) => ({
      id: t.id, author_name: t.author_name, content: t.content, rating: t.rating,
    })));

    setOpen(true);
  };

  const addTestimonial = () => {
    if (!newTestimonial.author_name || !newTestimonial.content) return;
    setTestimonials([...testimonials, { ...newTestimonial }]);
    setNewTestimonial({ author_name: "", content: "", rating: 5 });
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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Produtos</h2>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Produto</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? "Editar" : "Novo"} Produto</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
              <Tabs defaultValue="basic">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="basic">Dados</TabsTrigger>
                  <TabsTrigger value="dimensions">Frete</TabsTrigger>
                  <TabsTrigger value="bling">Fiscal/Bling</TabsTrigger>
                  <TabsTrigger value="images">Imagens</TabsTrigger>
                  <TabsTrigger value="testimonials">Depoimentos</TabsTrigger>
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
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Preço (R$) *</Label>
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
                  <div className="space-y-2"><Label>Badge</Label><Input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder="ex: Mais Vendido" /></div>
                  <div className="flex items-center gap-2 mt-2">
                    <input type="checkbox" id="show_countdown" checked={form.show_countdown} onChange={(e) => setForm({ ...form, show_countdown: e.target.checked })} className="h-4 w-4 rounded border-border" />
                    <Label htmlFor="show_countdown">Exibir contador de promoção</Label>
                  </div>
                  <div className="space-y-2"><Label>Benefícios (um por linha)</Label><Textarea value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} rows={4} /></div>
                </TabsContent>

                <TabsContent value="dimensions" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">Dados usados para cálculo automático de frete via Melhor Envio.</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Peso (kg) *</Label><Input type="number" step="0.01" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Altura (cm) *</Label><Input type="number" step="0.1" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Largura (cm) *</Label><Input type="number" step="0.1" value={form.width} onChange={(e) => setForm({ ...form, width: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Comprimento (cm) *</Label><Input type="number" step="0.1" value={form.length} onChange={(e) => setForm({ ...form, length: e.target.value })} /></div>
                  </div>
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
                  <div className="space-y-2">
                    <Label>Imagem Destaque</Label>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => document.getElementById("prod-img")?.click()}>
                        <Upload className="h-4 w-4" /> Selecionar
                      </Button>
                      <span className="text-sm text-muted-foreground">{imageFile?.name || "Nenhum arquivo"}</span>
                    </div>
                    <input id="prod-img" type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                  </div>

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
                  {testimonials.map((t, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{t.author_name}</span>
                          <span className="flex text-amber-500">
                            {Array.from({ length: t.rating }).map((_, j) => <Star key={j} className="h-3 w-3 fill-current" />)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{t.content}</p>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeTestimonial(i)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}

                  <div className="space-y-3 rounded-lg border border-dashed p-4">
                    <p className="text-sm font-medium">Adicionar Depoimento</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Input placeholder="Nome do autor" value={newTestimonial.author_name}
                        onChange={(e) => setNewTestimonial({ ...newTestimonial, author_name: e.target.value })} />
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Nota:</Label>
                        <Input type="number" min={1} max={5} className="w-16" value={newTestimonial.rating}
                          onChange={(e) => setNewTestimonial({ ...newTestimonial, rating: parseInt(e.target.value) || 5 })} />
                      </div>
                    </div>
                    <Textarea placeholder="Texto do depoimento..." value={newTestimonial.content}
                      onChange={(e) => setNewTestimonial({ ...newTestimonial, content: e.target.value })} rows={2} />
                    <Button type="button" variant="outline" size="sm" onClick={addTestimonial}>
                      <Plus className="h-4 w-4 mr-1" /> Adicionar
                    </Button>
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

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Grupo</TableHead>
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
                    <TableCell className="text-muted-foreground text-xs">{(p as any).sku || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{(p as any).group_name || "—"}</TableCell>
                    <TableCell>{fmt(p.price)}</TableCell>
                    <TableCell>{p.stock}</TableCell>
                    <TableCell>
                      <Badge variant={p.active ? "default" : "secondary"} className="cursor-pointer" onClick={() => toggleActive.mutate({ id: p.id, active: p.active })}>
                        {p.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
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
