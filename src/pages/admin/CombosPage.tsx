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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, Package, Upload, X, Search, Link2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ComboForm {
  name: string;
  slug: string;
  description: string;
  price: string;
  original_price: string;
  badge: string;
  active: boolean;
  featured: boolean;
  seo_title: string;
  seo_description: string;
}

const emptyForm: ComboForm = {
  name: "", slug: "", description: "",
  price: "", original_price: "", badge: "",
  active: true, featured: false,
  seo_title: "", seo_description: "",
};

export default function CombosPage() {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ComboForm>(emptyForm);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: combos, isLoading } = useQuery({
    queryKey: ["admin-combos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_combos" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: products } = useQuery({
    queryKey: ["admin-products-for-combos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, original_price, image_url, active")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (selectedProductIds.length < 2) {
        throw new Error("Selecione pelo menos 2 produtos para o combo.");
      }

      let image_url: string | undefined;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `combos/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("product-images").upload(path, imageFile);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
        image_url = urlData.publicUrl;
      }

      const payload: any = {
        name: form.name,
        slug: form.slug,
        description: form.description,
        price: parseFloat(form.price) || 0,
        original_price: parseFloat(form.original_price) || 0,
        badge: form.badge || null,
        active: form.active,
        featured: form.featured,
        product_ids: selectedProductIds,
        seo_title: form.seo_title || null,
        seo_description: form.seo_description || null,
      };
      if (image_url) payload.image_url = image_url;

      if (editId) {
        const { error } = await supabase.from("product_combos" as any).update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("product_combos" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-combos"] });
      qc.invalidateQueries({ queryKey: ["combos"] });
      setOpen(false);
      resetForm();
      toast({ title: editId ? "Combo atualizado" : "Combo criado" });
    },
    onError: (err: any) => toast({ title: err?.message || "Erro ao salvar", variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("product_combos" as any).update({ active: !active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-combos"] });
      qc.invalidateQueries({ queryKey: ["combos"] });
    },
  });

  const deleteCombo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_combos" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-combos"] });
      qc.invalidateQueries({ queryKey: ["combos"] });
      toast({ title: "Combo excluído" });
    },
    onError: () => toast({ title: "Erro ao excluir", variant: "destructive" }),
  });

  const resetForm = () => {
    setForm(emptyForm);
    setEditId(null);
    setSelectedProductIds([]);
    setImageFile(null);
    setImagePreview(null);
    setSearchTerm("");
  };

  const openEdit = (c: any) => {
    setEditId(c.id);
    setForm({
      name: c.name,
      slug: c.slug,
      description: c.description || "",
      price: String(c.price),
      original_price: String(c.original_price),
      badge: c.badge || "",
      active: c.active,
      featured: c.featured || false,
      seo_title: c.seo_title || "",
      seo_description: c.seo_description || "",
    });
    setSelectedProductIds(Array.isArray(c.product_ids) ? c.product_ids : []);
    setImagePreview(c.image_url || null);
    setOpen(true);
  };

  const toggleProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const fmt = (v: number) => `R$ ${Number(v).toFixed(2).replace(".", ",")}`;

  const sumOriginal = selectedProductIds.reduce((sum, id) => {
    const p = products?.find((pr) => pr.id === id);
    return sum + (p ? Number(p.price) : 0);
  }, 0);

  const comboPrice = parseFloat(form.price) || 0;
  const savings = sumOriginal - comboPrice;
  const savingsPercent = sumOriginal > 0 ? ((savings / sumOriginal) * 100).toFixed(0) : "0";

  const filteredProducts = products?.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getProductName = (id: string) => products?.find((p) => p.id === id)?.name || id;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold">Combos</h2>
          <p className="text-sm text-muted-foreground">Junte vários produtos em uma venda única com preço promocional</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Combo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? "Editar" : "Novo"} Combo</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Slug *</Label>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="combo-exemplo"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Preço do Combo *</Label>
                  <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Preço Original (De)</Label>
                  <Input type="number" step="0.01" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Badge</Label>
                  <Input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder="Ex: SUPER OFERTA" />
                </div>
              </div>

              {/* Price summary */}
              {selectedProductIds.length >= 2 && comboPrice > 0 && (
                <Card className="bg-muted/50">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>Soma dos produtos individuais:</span>
                      <span className="line-through text-muted-foreground">{fmt(sumOriginal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm font-bold">
                      <span>Preço do combo:</span>
                      <span className="text-primary">{fmt(comboPrice)}</span>
                    </div>
                    {savings > 0 && (
                      <div className="flex items-center justify-between text-sm text-green-600 font-semibold">
                        <span>Economia:</span>
                        <span>{fmt(savings)} ({savingsPercent}% OFF)</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Image upload */}
              <div className="space-y-2">
                <Label>Imagem do Combo</Label>
                <div className="flex items-center gap-3">
                  {(imagePreview || imageFile) && (
                    <img
                      src={imageFile ? URL.createObjectURL(imageFile) : imagePreview!}
                      alt="Preview"
                      className="h-16 w-16 rounded object-contain bg-muted p-1"
                    />
                  )}
                  <label className="cursor-pointer flex items-center gap-2 text-sm text-primary hover:underline">
                    <Upload className="h-4 w-4" />
                    {imagePreview || imageFile ? "Trocar imagem" : "Enviar imagem"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) { setImageFile(f); setImagePreview(null); }
                    }} />
                  </label>
                </div>
              </div>

              {/* Product selector */}
              <div className="space-y-2">
                <Label>Produtos do Combo * (mín. 2)</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar produto..."
                    className="pl-9"
                  />
                </div>

                {/* Selected products */}
                {selectedProductIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedProductIds.map((id) => (
                      <Badge key={id} variant="secondary" className="flex items-center gap-1 pr-1">
                        {getProductName(id)}
                        <button type="button" onClick={() => toggleProduct(id)} className="ml-1 hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="border rounded-md max-h-48 overflow-y-auto mt-2">
                  {filteredProducts?.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                    >
                      <Checkbox
                        checked={selectedProductIds.includes(p.id)}
                        onCheckedChange={() => toggleProduct(p.id)}
                      />
                      {p.image_url && (
                        <img src={p.image_url} alt="" className="h-8 w-8 rounded object-contain bg-muted" />
                      )}
                      <span className="text-sm flex-1 truncate">{p.name}</span>
                      <span className="text-xs text-muted-foreground">{fmt(Number(p.price))}</span>
                    </label>
                  ))}
                  {filteredProducts?.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum produto encontrado</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                  <Label>Ativo</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} />
                  <Label>Destaque</Label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>SEO Título</Label>
                  <Input value={form.seo_title} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>SEO Descrição</Label>
                  <Input value={form.seo_description} onChange={(e) => setForm({ ...form, seo_description: e.target.value })} />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Cancelar</Button>
                <Button type="submit" disabled={save.isPending}>
                  {save.isPending ? "Salvando..." : editId ? "Atualizar" : "Criar Combo"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Combo</TableHead>
                <TableHead>Produtos</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : combos?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum combo cadastrado</TableCell></TableRow>
              ) : combos?.map((c: any) => {
                const pIds = Array.isArray(c.product_ids) ? c.product_ids : [];
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {c.image_url ? (
                          <img src={c.image_url} alt="" className="h-10 w-10 rounded object-contain bg-muted p-1" />
                        ) : (
                          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-sm">{c.name}</p>
                          {c.badge && <Badge variant="secondary" className="text-xs mt-0.5">{c.badge}</Badge>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{pIds.length} produto(s)</span>
                    </TableCell>
                    <TableCell>
                      <div>
                        {c.original_price > c.price && (
                          <span className="text-xs text-muted-foreground line-through block">{fmt(c.original_price)}</span>
                        )}
                        <span className="font-semibold text-sm">{fmt(c.price)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={c.active}
                        onCheckedChange={() => toggleActive.mutate({ id: c.id, active: c.active })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" title="Copiar link" onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/combo/${c.slug}`);
                          toast({ title: "Link copiado!" });
                        }}>
                          <Link2 className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir combo?</AlertDialogTitle>
                              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteCombo.mutate(c.id)}>Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
