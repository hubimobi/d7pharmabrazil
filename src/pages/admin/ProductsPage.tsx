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
import { Plus, Pencil, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProdForm {
  name: string; slug: string; short_description: string; description: string;
  price: string; original_price: string; badge: string; stock: string;
  benefits: string;
}

const emptyForm: ProdForm = {
  name: "", slug: "", short_description: "", description: "",
  price: "", original_price: "", badge: "", stock: "",
  benefits: "",
};

export default function ProductsPage() {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ProdForm>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
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

      const benefits = form.benefits.split("\n").filter(Boolean);
      const payload: any = {
        name: form.name, slug: form.slug,
        short_description: form.short_description, description: form.description,
        price: parseFloat(form.price), original_price: parseFloat(form.original_price),
        badge: form.badge || null, stock: parseInt(form.stock) || 0, benefits,
      };
      if (image_url) payload.image_url = image_url;

      if (editId) {
        const { error } = await supabase.from("products").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      setOpen(false); setForm(emptyForm); setEditId(null); setImageFile(null);
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

  const openEdit = (p: NonNullable<typeof products>[number]) => {
    setEditId(p.id);
    const benefits = Array.isArray(p.benefits) ? (p.benefits as string[]).join("\n") : "";
    setForm({
      name: p.name, slug: p.slug, short_description: p.short_description,
      description: p.description, price: String(p.price), original_price: String(p.original_price),
      badge: p.badge ?? "", stock: String(p.stock), benefits,
    });
    setOpen(true);
  };

  const fmt = (v: number) => `R$ ${Number(v).toFixed(2).replace(".", ",")}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Produtos</h2>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditId(null); setForm(emptyForm); setImageFile(null); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Produto</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? "Editar" : "Novo"} Produto</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Slug *</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required /></div>
              </div>
              <div className="space-y-2"><Label>Descrição Curta</Label><Input value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} /></div>
              <div className="space-y-2"><Label>Descrição Completa</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Preço *</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Preço Original</Label><Input type="number" step="0.01" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Badge</Label><Input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder="ex: Mais Vendido" /></div>
                <div className="space-y-2"><Label>Estoque</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Benefícios (um por linha)</Label><Textarea value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} rows={4} /></div>
              <div className="space-y-2">
                <Label>Imagem</Label>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => document.getElementById("prod-img")?.click()}>
                    <Upload className="h-4 w-4" /> Selecionar
                  </Button>
                  <span className="text-sm text-muted-foreground">{imageFile?.name || "Nenhum arquivo"}</span>
                </div>
                <input id="prod-img" type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
              </div>
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
                <TableHead>Preço</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : !products?.length ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum produto</TableCell></TableRow>
              ) : (
                products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
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
