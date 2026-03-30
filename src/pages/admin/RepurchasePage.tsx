import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  RefreshCw, Target, Mail, MessageCircle, Gift, ShoppingBag,
  Star, Clock, ChevronRight, TrendingUp, Package, AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const STAGES = [
  { key: "compra_feita", label: "Compra Feita", color: "bg-blue-500", icon: ShoppingBag, description: "Cliente pagou e recebeu" },
  { key: "feedback", label: "Feedback", color: "bg-purple-500", icon: Star, description: "Solicitação de feedback enviada" },
  { key: "aviso_30", label: "Aviso 30 Dias", color: "bg-yellow-500", icon: Clock, description: "30 dias antes de acabar" },
  { key: "aviso_15", label: "Aviso 15 Dias", color: "bg-orange-500", icon: AlertTriangle, description: "15 dias — 10% desconto" },
  { key: "aviso_5", label: "Aviso 5 Dias", color: "bg-red-500", icon: Gift, description: "5 dias — 15% + brinde" },
  { key: "recompra_feita", label: "Recompra Feita", color: "bg-green-500", icon: RefreshCw, description: "Cliente recomprou" },
];

const STAGE_COLORS_HEX = ["#3b82f6", "#8b5cf6", "#eab308", "#f97316", "#ef4444", "#22c55e"];

type FunnelEntry = {
  id: string;
  order_id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  product_name: string;
  product_id: string | null;
  stage: string;
  stage_changed_at: string;
  feedback_sent_at: string | null;
  feedback_response: string | null;
  aviso_30_sent_at: string | null;
  aviso_15_sent_at: string | null;
  aviso_5_sent_at: string | null;
  recompra_order_id: string | null;
  coupon_code: string | null;
  discount_percent: number;
  product_duration_days: number;
  delivery_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
};

export default function RepurchasePage() {
  const queryClient = useQueryClient();
  const [productFilter, setProductFilter] = useState("all");
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalValue, setGoalValue] = useState("10");
  const [detailEntry, setDetailEntry] = useState<FunnelEntry | null>(null);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["repurchase-funnel"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repurchase_funnel" as any)
        .select("*")
        .order("stage_changed_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as FunnelEntry[];
    },
  });

  const { data: goal } = useQuery({
    queryKey: ["repurchase-goal", currentMonth, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repurchase_goals" as any)
        .select("*")
        .eq("month", currentMonth)
        .eq("year", currentYear)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products-list-repurchase"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name").eq("active", true);
      return data || [];
    },
  });

  const saveGoalMutation = useMutation({
    mutationFn: async (count: number) => {
      const { error } = await supabase
        .from("repurchase_goals" as any)
        .upsert({ month: currentMonth, year: currentYear, goal_count: count } as any, { onConflict: "month,year" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repurchase-goal"] });
      setGoalDialogOpen(false);
      toast.success("Meta salva!");
    },
  });

  const moveToStageMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { error } = await supabase
        .from("repurchase_funnel" as any)
        .update({ stage, stage_changed_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repurchase-funnel"] });
      toast.success("Estágio atualizado!");
    },
  });

  const filtered = useMemo(() => {
    if (productFilter === "all") return entries;
    return entries.filter((e) => e.product_id === productFilter);
  }, [entries, productFilter]);

  const stageGroups = useMemo(() => {
    const groups: Record<string, FunnelEntry[]> = {};
    STAGES.forEach((s) => (groups[s.key] = []));
    filtered.forEach((e) => {
      if (groups[e.stage]) groups[e.stage].push(e);
    });
    return groups;
  }, [filtered]);

  const recomprasThisMonth = useMemo(() => {
    return entries.filter(
      (e) =>
        e.stage === "recompra_feita" &&
        new Date(e.stage_changed_at).getMonth() + 1 === currentMonth &&
        new Date(e.stage_changed_at).getFullYear() === currentYear
    ).length;
  }, [entries, currentMonth, currentYear]);

  const goalCount = goal?.goal_count || 10;
  const goalPercent = Math.min(100, Math.round((recomprasThisMonth / goalCount) * 100));

  const chartData = STAGES.map((s, i) => ({
    name: s.label,
    count: stageGroups[s.key]?.length || 0,
    color: STAGE_COLORS_HEX[i],
  }));

  const getNextStage = (current: string) => {
    const idx = STAGES.findIndex((s) => s.key === current);
    if (idx >= 0 && idx < STAGES.length - 1) return STAGES[idx + 1].key;
    if (current === "recompra_feita") return "compra_feita";
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <RefreshCw className="h-6 w-6 text-primary" />
            Recompra (+LTV)
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Funil de recompra automatizado — e-mail e WhatsApp prontos para integração
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={productFilter} onValueChange={setProductFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filtrar por produto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Produtos</SelectItem>
              {products.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total no Funil</p>
                <p className="text-2xl font-bold">{filtered.length}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500 opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Recompras no Mês</p>
                <p className="text-2xl font-bold text-green-600">{recomprasThisMonth}</p>
              </div>
              <RefreshCw className="h-8 w-8 text-green-500 opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Meta de Recompra — {format(now, "MMMM yyyy", { locale: ptBR })}</p>
                <p className="text-lg font-bold">{recomprasThisMonth} / {goalCount} <span className="text-sm font-normal text-muted-foreground">({goalPercent}%)</span></p>
              </div>
              <Button size="sm" variant="outline" onClick={() => { setGoalValue(String(goalCount)); setGoalDialogOpen(true); }}>
                <Target className="h-4 w-4 mr-1" /> Definir Meta
              </Button>
            </div>
            <Progress value={goalPercent} className="h-3" />
            {goalPercent >= 100 && (
              <p className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Meta atingida! 🎉
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Distribuição por Estágio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {STAGES.map((stage) => {
          const items = stageGroups[stage.key] || [];
          const Icon = stage.icon;
          return (
            <div key={stage.key} className="flex flex-col">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-t-xl text-white ${stage.color}`}>
                <Icon className="h-4 w-4" />
                <span className="text-sm font-semibold truncate">{stage.label}</span>
                <Badge variant="secondary" className="ml-auto text-xs bg-white/20 text-white hover:bg-white/30">
                  {items.length}
                </Badge>
              </div>
              <div className="bg-muted/30 border border-t-0 rounded-b-xl min-h-[200px] p-2 space-y-2 flex-1">
                {items.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">Nenhum cliente</p>
                )}
                {items.map((entry) => (
                  <Card
                    key={entry.id}
                    className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
                    style={{ borderLeftColor: STAGE_COLORS_HEX[STAGES.findIndex((s) => s.key === stage.key)] }}
                    onClick={() => setDetailEntry(entry)}
                  >
                    <CardContent className="p-3 space-y-1">
                      <p className="text-sm font-medium truncate">{entry.customer_name || "Sem nome"}</p>
                      <p className="text-xs text-muted-foreground truncate">{entry.product_name}</p>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(entry.stage_changed_at), "dd/MM/yy")}
                      </div>
                      <div className="flex gap-1 mt-1">
                        {entry.feedback_sent_at && <Mail className="h-3 w-3 text-purple-400" title="Feedback enviado" />}
                        {entry.aviso_30_sent_at && <MessageCircle className="h-3 w-3 text-yellow-500" title="Aviso 30d" />}
                        {entry.aviso_15_sent_at && <Mail className="h-3 w-3 text-orange-500" title="Aviso 15d" />}
                        {entry.aviso_5_sent_at && <Gift className="h-3 w-3 text-red-500" title="Aviso 5d + brinde" />}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legenda de ações automáticas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" /> Ações Automáticas do Funil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            <div className="flex items-start gap-2 p-3 bg-purple-50 rounded-lg border border-purple-100">
              <Star className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-purple-700">Feedback (5 dias após entrega)</p>
                <p className="text-xs text-purple-600/80">E-mail solicitando avaliação do produto</p>
                <Badge variant="outline" className="text-[10px] mt-1 border-purple-300 text-purple-600">
                  <Mail className="h-3 w-3 mr-1" /> E-mail
                </Badge>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-100">
              <Clock className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-yellow-700">Aviso 30 Dias</p>
                <p className="text-xs text-yellow-600/80">Conteúdo reforçando benefícios + estímulo ao uso</p>
                <div className="flex gap-1 mt-1">
                  <Badge variant="outline" className="text-[10px] border-yellow-300 text-yellow-700">
                    <Mail className="h-3 w-3 mr-1" /> E-mail
                  </Badge>
                  <Badge variant="outline" className="text-[10px] border-green-300 text-green-700">
                    <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg border border-orange-100">
              <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-orange-700">Aviso 15 Dias — 10% OFF</p>
                <p className="text-xs text-orange-600/80">Produto acabando + cupom 10% de desconto</p>
                <div className="flex gap-1 mt-1">
                  <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-700">
                    <Mail className="h-3 w-3 mr-1" /> E-mail
                  </Badge>
                  <Badge variant="outline" className="text-[10px] border-green-300 text-green-700">
                    <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-100">
              <Gift className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-red-700">Aviso 5 Dias — 15% + Brinde</p>
                <p className="text-xs text-red-600/80">Último aviso com desconto especial + brinde</p>
                <div className="flex gap-1 mt-1">
                  <Badge variant="outline" className="text-[10px] border-red-300 text-red-700">
                    <Mail className="h-3 w-3 mr-1" /> E-mail
                  </Badge>
                  <Badge variant="outline" className="text-[10px] border-green-300 text-green-700">
                    <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg border border-green-100">
              <RefreshCw className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-green-700">Recompra Feita</p>
                <p className="text-xs text-green-600/80">Após entrega confirmada, volta para "Compra Feita"</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Goal Dialog */}
      <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Meta de Recompra — {format(now, "MMMM yyyy", { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="text-sm font-medium">Quantidade de recompras esperadas</label>
            <Input
              type="number"
              min={1}
              value={goalValue}
              onChange={(e) => setGoalValue(e.target.value)}
              placeholder="Ex: 20"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGoalDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveGoalMutation.mutate(Number(goalValue) || 10)}>
              Salvar Meta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailEntry} onOpenChange={() => setDetailEntry(null)}>
        <DialogContent className="sm:max-w-lg">
          {detailEntry && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  {detailEntry.customer_name || "Cliente"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Produto</p>
                    <p className="font-medium">{detailEntry.product_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Duração do Produto</p>
                    <p className="font-medium">{detailEntry.product_duration_days} dias</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">E-mail</p>
                    <p className="font-medium">{detailEntry.customer_email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Telefone</p>
                    <p className="font-medium">{detailEntry.customer_phone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Estágio Atual</p>
                    <Badge className={`${STAGES.find((s) => s.key === detailEntry.stage)?.color} text-white`}>
                      {STAGES.find((s) => s.key === detailEntry.stage)?.label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Última Mudança</p>
                    <p className="font-medium">{format(new Date(detailEntry.stage_changed_at), "dd/MM/yyyy HH:mm")}</p>
                  </div>
                </div>

                {/* Timeline */}
                <div className="border-t pt-3">
                  <p className="text-sm font-medium mb-2">Histórico de Comunicações</p>
                  <div className="space-y-2 text-xs">
                    {detailEntry.feedback_sent_at && (
                      <div className="flex items-center gap-2 text-purple-600">
                        <Mail className="h-3 w-3" />
                        Feedback enviado em {format(new Date(detailEntry.feedback_sent_at), "dd/MM/yy HH:mm")}
                      </div>
                    )}
                    {detailEntry.aviso_30_sent_at && (
                      <div className="flex items-center gap-2 text-yellow-600">
                        <MessageCircle className="h-3 w-3" />
                        Aviso 30 dias enviado em {format(new Date(detailEntry.aviso_30_sent_at), "dd/MM/yy HH:mm")}
                      </div>
                    )}
                    {detailEntry.aviso_15_sent_at && (
                      <div className="flex items-center gap-2 text-orange-600">
                        <Mail className="h-3 w-3" />
                        Aviso 15 dias enviado em {format(new Date(detailEntry.aviso_15_sent_at), "dd/MM/yy HH:mm")}
                      </div>
                    )}
                    {detailEntry.aviso_5_sent_at && (
                      <div className="flex items-center gap-2 text-red-600">
                        <Gift className="h-3 w-3" />
                        Aviso 5 dias + brinde enviado em {format(new Date(detailEntry.aviso_5_sent_at), "dd/MM/yy HH:mm")}
                      </div>
                    )}
                    {!detailEntry.feedback_sent_at && !detailEntry.aviso_30_sent_at && (
                      <p className="text-muted-foreground">Nenhuma comunicação enviada ainda</p>
                    )}
                  </div>
                </div>

                {detailEntry.coupon_code && (
                  <div className="border-t pt-3">
                    <p className="text-sm font-medium mb-1">Cupom Gerado</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">{detailEntry.coupon_code}</Badge>
                      <span className="text-xs text-muted-foreground">{detailEntry.discount_percent}% OFF</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="border-t pt-3 flex flex-wrap gap-2">
                  {getNextStage(detailEntry.stage) && (
                    <Button
                      size="sm"
                      onClick={() => {
                        const next = getNextStage(detailEntry.stage);
                        if (next) {
                          moveToStageMutation.mutate({ id: detailEntry.id, stage: next });
                          setDetailEntry(null);
                        }
                      }}
                    >
                      <ChevronRight className="h-4 w-4 mr-1" />
                      Mover para {STAGES.find((s) => s.key === getNextStage(detailEntry.stage))?.label}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" disabled title="Integração pendente">
                    <Mail className="h-4 w-4 mr-1" /> Enviar E-mail
                  </Button>
                  <Button size="sm" variant="outline" disabled title="Integração pendente">
                    <MessageCircle className="h-4 w-4 mr-1" /> Enviar WhatsApp
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
