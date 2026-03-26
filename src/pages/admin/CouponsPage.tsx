import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Tag, Truck, Percent, DollarSign, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface CouponForm {
  code: string;
  description: string;
  discount_type: string;
  discount_value: string;
  free_shipping: boolean;
  min_order_value: string;
  product_id: string;
  max_uses: string;
  active: boolean;
  starts_at: string;
  expires_at: string;
}

const emptyForm: CouponForm = {
  code: "", description: "", discount_type: "percent", discount_value: "",
  free_shipping: false, min_order_value: "", product_id: "", max_uses: "",
  active: true, starts_at: "", expires_at: "",
};

export default function CouponsPage() {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CouponForm>(emptyForm);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: coupons, isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*, products(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Count completed orders per coupon code
  const { data: couponOrderCounts } = useQuery({
    queryKey: ["coupon-order-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("coupon_code, status")
        .not("coupon_code", "is", null);
      if (error) throw error;
      const counts: Record<string, { total: number; paid: number }> = {};
      (data || []).forEach((o: any) => {
        const code = o.coupon_code;
        if (!counts[code]) counts[code] = { total: 0, paid: 0 };
        counts[code].total++;
        if (o.status === "paid" || o.status === "confirmed" || o.status === "preparing" || o.status === "shipped" || o.status === "delivered") {
          counts[code].paid++;
        }
      });
      return counts;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products-for-coupon"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, name").eq("active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        code: form.code.toUpperCase().trim(),
        description: form.description,
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value) || 0,
        free_shipping: form.free_shipping,
        min_order_value: form.min_order_value ? parseFloat(form.min_order_value) : null,
        product_id: form.product_id || null,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        active: form.active,
        starts_at: form.starts_at || null,
        expires_at: form.expires_at || null,
      };

      if (editId) {
        const { error } = await supabase.from("coupons").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("coupons").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
      setOpen(false);
      resetForm();
      toast({ title: editId ? "Cupom atualizado" : "Cupom criado" });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao salvar", description: err?.message, variant: "destructive" });
    },
  });

  const deleteCoupon = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast({ title: "Cupom excluído" });
    },
  });

  const resetForm = () => { setForm(emptyForm); setEditId(null); };

  const openEdit = (c: any) => {
    setEditId(c.id);
    setForm({
      code: c.code,
      description: c.description || "",
      discount_type: c.discount_type,
      discount_value: String(c.discount_value),
      free_shipping: c.free_shipping,
      min_order_value: c.min_order_value ? String(c.min_order_value) : "",
      product_id: c.product_id || "",
      max_uses: c.max_uses ? String(c.max_uses) : "",
      active: c.active,
      starts_at: c.starts_at ? c.starts_at.slice(0, 16) : "",
      expires_at: c.expires_at ? c.expires_at.slice(0, 16) : "",
    });
    setOpen(true);
  };

  const fmt = (v: number) => `R$ ${Number(v).toFixed(2).replace(".", ",")}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Cupons de Desconto</h2>
          <p className="text-sm text-muted-foreground">Gerencie cupons de desconto da loja</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Cupom</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? "Editar" : "Novo"} Cupom</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Código *</Label>
                  <Input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="ex: D7PHARMA10"
                    required
                    maxLength={30}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="flex items-center gap-2 pt-2">
                    <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                    <span className="text-sm">{form.active ? "Ativo" : "Inativo"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="ex: Desconto de 10% para primeira compra"
                  maxLength={200}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Desconto</Label>
                  <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percentual (%)</SelectItem>
                      <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor do Desconto</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {form.discount_type === "percent" ? "%" : "R$"}
                    </span>
                    <Input
                      className="pl-10"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.discount_value}
                      onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                <Switch checked={form.free_shipping} onCheckedChange={(v) => setForm({ ...form, free_shipping: v })} />
                <div>
                  <p className="text-sm font-medium">Frete Grátis</p>
                  <p className="text-xs text-muted-foreground">Cupom também concede frete grátis</p>
                </div>
                <Truck className="ml-auto h-5 w-5 text-muted-foreground" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor Mínimo de Compra</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                    <Input
                      className="pl-10"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.min_order_value}
                      onChange={(e) => setForm({ ...form, min_order_value: e.target.value })}
                      placeholder="Sem mínimo"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Limite de Usos</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.max_uses}
                    onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                    placeholder="Ilimitado"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Vincular a Produto (opcional)</Label>
                <Select value={form.product_id} onValueChange={(v) => setForm({ ...form, product_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Todos os produtos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Todos os produtos</SelectItem>
                    {products?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Válido a partir de</Label>
                  <Input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expira em</Label>
                  <Input
                    type="datetime-local"
                    value={form.expires_at}
                    onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={save.isPending}>
                {save.isPending ? "Salvando..." : "Salvar Cupom"}
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
                <TableHead>Código</TableHead>
                <TableHead>Desconto</TableHead>
                <TableHead>Regras</TableHead>
                <TableHead>Usos</TableHead>
                <TableHead>Compras Finalizadas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : !coupons?.length ? (
                <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Nenhum cupom cadastrado</TableCell></TableRow>
              ) : (
                coupons.map((c: any) => {
                  const isExpired = c.expires_at && new Date(c.expires_at) < new Date();
                  const isExhausted = c.max_uses && c.used_count >= c.max_uses;

                  return (
                    <TableRow key={c.id} className={!c.active || isExpired || isExhausted ? "opacity-60" : ""}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-primary" />
                          <span className="font-mono font-bold text-sm">{c.code}</span>
                        </div>
                        {c.description && <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {c.discount_value > 0 && (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              {c.discount_type === "percent" ? <Percent className="h-3 w-3" /> : <DollarSign className="h-3 w-3" />}
                              {c.discount_type === "percent" ? `${c.discount_value}%` : fmt(c.discount_value)}
                            </Badge>
                          )}
                          {c.free_shipping && (
                            <Badge variant="secondary" className="gap-1 text-xs bg-success/10 text-success">
                              <Truck className="h-3 w-3" /> Frete Grátis
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          {c.min_order_value && <p>Mínimo: {fmt(c.min_order_value)}</p>}
                          {c.products?.name && <p>Produto: {c.products.name}</p>}
                          {c.expires_at && <p>Expira: {format(new Date(c.expires_at), "dd/MM/yyyy")}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.used_count}{c.max_uses ? `/${c.max_uses}` : ""}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <ShoppingCart className="h-3.5 w-3.5 text-green-600" />
                          <span className="text-sm font-semibold text-green-700">
                            {couponOrderCounts?.[c.code]?.paid ?? 0}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            / {couponOrderCounts?.[c.code]?.total ?? 0} pedidos
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isExpired ? (
                          <Badge variant="secondary">Expirado</Badge>
                        ) : isExhausted ? (
                          <Badge variant="secondary">Esgotado</Badge>
                        ) : c.active ? (
                          <Badge variant="default">Ativo</Badge>
                        ) : (
                          <Badge variant="secondary">Inativo</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteCoupon.mutate(c.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
