import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProducts } from "@/hooks/useProducts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Link2, Copy, Trash2, MousePointerClick, ShoppingCart, TrendingUp, Smartphone, Monitor, ExternalLink, Stethoscope } from "lucide-react";
import { toast } from "sonner";

function generateCode(length = 6): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

export default function LinksPage() {
  const { canDelete } = useAuth();
  const qc = useQueryClient();
  const { data: products } = useProducts();
  const [open, setOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [utmSource, setUtmSource] = useState("");
  const [utmMedium, setUtmMedium] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");

  const { data: doctors } = useQuery({
    queryKey: ["doctors-for-links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctors")
        .select("id, name, specialty, representative_id, representatives(name)")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: links, isLoading } = useQuery({
    queryKey: ["short-links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("short_links")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: clickStats } = useQuery({
    queryKey: ["link-click-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("link_clicks")
        .select("short_link_id, device_type");
      if (error) throw error;
      const stats: Record<string, { total: number; mobile: number; desktop: number }> = {};
      (data || []).forEach((c: any) => {
        if (!stats[c.short_link_id]) stats[c.short_link_id] = { total: 0, mobile: 0, desktop: 0 };
        stats[c.short_link_id].total++;
        if (c.device_type === "mobile") stats[c.short_link_id].mobile++;
        else stats[c.short_link_id].desktop++;
      });
      return stats;
    },
  });

  const createLink = useMutation({
    mutationFn: async () => {
      if (!selectedProduct) throw new Error("Selecione um produto");
      const product = products?.find((p) => p.id === selectedProduct);
      if (!product) throw new Error("Produto não encontrado");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const code = generateCode();
      const insertData: any = {
        code,
        product_id: product.id,
        user_id: user.id,
        target_url: `/produto/${product.slug}`,
        utm_source: utmSource || "share",
        utm_medium: utmMedium || "link",
        utm_campaign: utmCampaign || "",
      };

      if (selectedDoctor && selectedDoctor !== "none") {
        insertData.doctor_id = selectedDoctor;
      }

      const { error } = await supabase.from("short_links").insert(insertData);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["short-links"] });
      toast.success("Link criado com sucesso!");
      setOpen(false);
      setSelectedProduct("");
      setSelectedDoctor("");
      setUtmSource("");
      setUtmMedium("");
      setUtmCampaign("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteLink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("short_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["short-links"] });
      toast.success("Link removido");
    },
  });

  const copyLink = (code: string) => {
    const url = `${window.location.origin}/l/${code}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const copyWithMessage = (code: string, productName: string) => {
    const url = `${window.location.origin}/l/${code}`;
    const msg = `Confira esse produto incrível: ${productName}\n${url}`;
    navigator.clipboard.writeText(msg);
    toast.success("Mensagem copiada!");
  };

  const totalClicks = links?.reduce((s, l: any) => s + (l.clicks_count || 0), 0) || 0;
  const totalConversions = links?.reduce((s, l: any) => s + (l.conversions_count || 0), 0) || 0;
  const conversionRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : "0";

  const getProductName = (productId: string | null) => {
    if (!productId) return "—";
    return products?.find((p) => p.id === productId)?.name || "Produto removido";
  };

  const getDoctorName = (doctorId: string | null) => {
    if (!doctorId) return null;
    return doctors?.find((d) => d.id === doctorId)?.name || null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Links Inteligentes</h1>
          <p className="text-sm text-muted-foreground">Crie links curtos com rastreamento de cliques e conversões</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Link2 className="h-4 w-4" /> Gerar Link</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gerar Link de Compartilhamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Produto / Combo *</Label>
                <ProductComboSelect
                  value={selectedProduct}
                  onValueChange={setSelectedProduct}
                  placeholder="Selecione um produto ou combo"
                />
              </div>
              <div>
                <Label className="flex items-center gap-1.5">
                  <Stethoscope className="h-3.5 w-3.5" /> Prescritor (opcional)
                </Label>
                <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                  <SelectTrigger><SelectValue placeholder="Sem prescritor vinculado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem prescritor vinculado</SelectItem>
                    {(doctors || []).map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}{d.specialty ? ` — ${d.specialty}` : ""}{(d.representatives as any)?.name ? ` (${(d.representatives as any).name})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Ao vincular um prescritor, ele será preenchido automaticamente no checkout do cliente.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Origem</Label>
                  <Input placeholder="ex: whatsapp" value={utmSource} onChange={(e) => setUtmSource(e.target.value)} />
                </div>
                <div>
                  <Label>Mídia</Label>
                  <Input placeholder="ex: social" value={utmMedium} onChange={(e) => setUtmMedium(e.target.value)} />
                </div>
                <div>
                  <Label>Campanha</Label>
                  <Input placeholder="ex: promo-jan" value={utmCampaign} onChange={(e) => setUtmCampaign(e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">UTMs internas — não ficam visíveis na URL para o cliente.</p>
              <Button className="w-full" onClick={() => createLink.mutate()} disabled={createLink.isPending}>
                {createLink.isPending ? "Criando..." : "Criar Link"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Links Criados</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{links?.length || 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><MousePointerClick className="h-4 w-4" /> Cliques</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{totalClicks}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><ShoppingCart className="h-4 w-4" /> Conversões</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{totalConversions}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><TrendingUp className="h-4 w-4" /> Taxa de Conversão</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{conversionRate}%</p></CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Link</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Prescritor</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead className="text-center">Cliques</TableHead>
                <TableHead className="text-center">
                  <span className="flex items-center justify-center gap-1"><Smartphone className="h-3 w-3" />/<Monitor className="h-3 w-3" /></span>
                </TableHead>
                <TableHead className="text-center">Conversões</TableHead>
                <TableHead className="text-center">Taxa</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : !links?.length ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum link criado</TableCell></TableRow>
              ) : (
                links.map((l: any) => {
                  const stats = clickStats?.[l.id];
                  const rate = l.clicks_count > 0 ? ((l.conversions_count / l.clicks_count) * 100).toFixed(1) : "0";
                  const docName = getDoctorName(l.doctor_id);
                  return (
                    <TableRow key={l.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded font-mono">/l/{l.code}</code>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{getProductName(l.product_id)}</TableCell>
                      <TableCell>
                        {docName ? (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Stethoscope className="h-3 w-3" /> {docName}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {l.utm_source && <Badge variant="outline" className="text-2xs">{l.utm_source}</Badge>}
                      </TableCell>
                      <TableCell className="text-center font-medium">{l.clicks_count}</TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {stats ? `${stats.mobile}/${stats.desktop}` : "0/0"}
                      </TableCell>
                      <TableCell className="text-center font-medium">{l.conversions_count}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={Number(rate) > 0 ? "default" : "secondary"} className="text-2xs">{rate}%</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyLink(l.code)} title="Copiar link">
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyWithMessage(l.code, getProductName(l.product_id))} title="Copiar com mensagem">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                          {canDelete && (
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteLink.mutate(l.id)} title="Excluir">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
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
