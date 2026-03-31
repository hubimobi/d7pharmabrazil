import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Star, CheckCircle, XCircle, Trash2, ExternalLink, Eye, Clock, Award } from "lucide-react";
import { toast } from "sonner";
import { useStoreSettings } from "@/hooks/useStoreSettings";

interface Testimonial {
  id: string;
  product_id: string;
  author_name: string;
  content: string;
  rating: number;
  author_image_url: string | null;
  product_image_url: string | null;
  product_image_urls: string[] | null;
  source: string;
  approved: boolean;
  order_id: string | null;
  created_at: string;
  product_name?: string;
}

export default function FeedbackApprovalPage() {
  const qc = useQueryClient();
  const { data: settings } = useStoreSettings();
  const [tab, setTab] = useState("pending");
  const [viewItem, setViewItem] = useState<Testimonial | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const googleReviewUrl = (settings as any)?.google_business_review_url || "";

  const { data: testimonials = [], isLoading } = useQuery({
    queryKey: ["admin-feedbacks", tab],
    queryFn: async () => {
      let query = supabase.from("product_testimonials").select("*").order("created_at", { ascending: false });
      if (tab === "pending") query = query.eq("approved", false);
      else if (tab === "approved") query = query.eq("approved", true);
      const { data, error } = await query;
      if (error) throw error;

      // Enrich with product names
      const productIds = [...new Set((data || []).map((t: any) => t.product_id))];
      const { data: products } = await supabase.from("products").select("id, name").in("id", productIds);
      const productMap = new Map((products || []).map((p: any) => [p.id, p.name]));

      return (data || []).map((t: any) => ({
        ...t,
        product_image_urls: t.product_image_urls || [],
        product_name: productMap.get(t.product_id) || "Produto removido",
      })) as Testimonial[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_testimonials").update({ approved: true } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Feedback aprovado!");
      qc.invalidateQueries({ queryKey: ["admin-feedbacks"] });
      setViewItem(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_testimonials").update({ approved: false } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Feedback reprovado.");
      qc.invalidateQueries({ queryKey: ["admin-feedbacks"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_testimonials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Feedback excluído.");
      qc.invalidateQueries({ queryKey: ["admin-feedbacks"] });
      setDeleteTarget(null);
      setViewItem(null);
    },
  });

  const pendingCount = testimonials.filter((t) => !t.approved).length;

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`h-4 w-4 ${s <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );

  const sourceLabel = (src: string) => {
    if (src === "customer") return <Badge variant="default" className="text-xs">Cliente</Badge>;
    if (src === "ai") return <Badge variant="secondary" className="text-xs">IA</Badge>;
    return <Badge variant="outline" className="text-xs">Manual</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Aprovação de Feedbacks</h1>
          <p className="text-muted-foreground text-sm">Gerencie os depoimentos recebidos dos clientes</p>
        </div>
        {tab === "pending" && pendingCount > 0 && (
          <Badge variant="destructive" className="text-sm px-3 py-1">{pendingCount} pendente{pendingCount > 1 ? "s" : ""}</Badge>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-1"><Clock className="h-4 w-4" /> Pendentes</TabsTrigger>
          <TabsTrigger value="approved" className="gap-1"><CheckCircle className="h-4 w-4" /> Aprovados</TabsTrigger>
          <TabsTrigger value="all" className="gap-1"><Eye className="h-4 w-4" /> Todos</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Carregando...</p>
          ) : testimonials.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum feedback encontrado.</p>
          ) : (
            <div className="grid gap-4">
              {testimonials.map((t) => (
                <Card key={t.id} className={!t.approved ? "border-amber-300/50" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={t.author_image_url || undefined} />
                        <AvatarFallback>{t.author_name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{t.author_name}</span>
                          {renderStars(t.rating)}
                          {sourceLabel(t.source)}
                          {!t.approved && <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Pendente</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{t.product_name}</p>
                        <p className="text-sm line-clamp-2">{t.content}</p>
                        {t.product_image_urls && t.product_image_urls.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {(t.product_image_urls as string[]).map((url, i) => (
                              <img key={i} src={url} alt="" className="h-12 w-12 rounded object-cover" />
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">{new Date(t.created_at).toLocaleDateString("pt-BR")}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {!t.approved && (
                          <Button size="sm" variant="default" onClick={() => approveMutation.mutate(t.id)} disabled={approveMutation.isPending}>
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {t.approved && (
                          <Button size="sm" variant="outline" onClick={() => rejectMutation.mutate(t.id)} disabled={rejectMutation.isPending}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {googleReviewUrl && t.approved && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={googleReviewUrl} target="_blank" rel="noopener noreferrer" title="Enviar para Google">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget(t.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Excluir feedback?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
