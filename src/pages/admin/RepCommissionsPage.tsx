import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, DollarSign, TrendingUp, CreditCard, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Gerada", variant: "outline" },
  awaiting: { label: "Aguardando", variant: "secondary" },
  paid: { label: "Paga", variant: "default" },
};

export default function RepCommissionsPage() {
  const { repId } = useParams<{ repId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [monthFilter, setMonthFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [payDialog, setPayDialog] = useState(false);

  const { data: rep } = useQuery({
    queryKey: ["representative", repId],
    queryFn: async () => {
      const { data, error } = await supabase.from("representatives").select("*").eq("id", repId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!repId,
  });

  const { data: commissions, isLoading } = useQuery({
    queryKey: ["rep-commissions", repId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commissions")
        .select("*, doctors(name), orders(customer_name, created_at, items)")
        .eq("representative_id", repId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!repId,
  });

  const months = useMemo(() => Array.from(new Set(
    commissions?.map((c) => {
      const d = new Date(c.created_at);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }) ?? []
  )).sort().reverse(), [commissions]);

  const doctors = useMemo(() => {
    const map = new Map<string, string>();
    commissions?.forEach((c: any) => {
      if (c.doctor_id && c.doctors?.name) map.set(c.doctor_id, c.doctors.name);
    });
    return Array.from(map.entries());
  }, [commissions]);

  const filtered = useMemo(() => commissions?.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (doctorFilter !== "all" && c.doctor_id !== doctorFilter) return false;
    if (monthFilter !== "all") {
      const d = new Date(c.created_at);
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (m !== monthFilter) return false;
    }
    return true;
  }), [commissions, statusFilter, doctorFilter, monthFilter]);

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const currentMonthPending = useMemo(() =>
    commissions?.filter((c) => {
      const d = new Date(c.created_at);
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return m === currentMonthKey && c.status === "pending";
    }) ?? [], [commissions, currentMonthKey]);

  const totalFiltered = filtered?.reduce((s, c) => s + Number(c.commission_value), 0) ?? 0;
  const pendingFiltered = filtered?.filter((c) => c.status === "pending").reduce((s, c) => s + Number(c.commission_value), 0) ?? 0;
  const currentMonthTotal = currentMonthPending.reduce((s, c) => s + Number(c.commission_value), 0);

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;
  const formatMonth = (m: string) => {
    const [y, mo] = m.split("-");
    return new Date(Number(y), Number(mo) - 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  };

  const payMutation = useMutation({
    mutationFn: async () => {
      if (!rep || currentMonthPending.length === 0) throw new Error("Nenhuma comissão pendente");

      const totalToPay = currentMonthPending.reduce((s, c) => s + Number(c.commission_value), 0);

      const { data, error } = await supabase.functions.invoke("pay-commissions", {
        body: {
          representative_id: repId,
          representative_name: rep.name,
          representative_pix: rep.pix ?? "",
          commission_ids: currentMonthPending.map((c) => c.id),
          total: totalToPay,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["rep-commissions", repId] });
      setPayDialog(false);
      toast.success(`Ordem de pagamento criada no Asaas! ID: ${data?.payment_id ?? ""}`);
    },
    onError: (err: any) => toast.error(err?.message ?? "Erro ao criar pagamento"),
  });

  // Extract product names from order items
  const getProducts = (items: any) => {
    if (!items || !Array.isArray(items)) return "—";
    return items.map((i: any) => i.name || i.product_name || "").filter(Boolean).join(", ") || "—";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/representantes")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold truncate">Comissões — {rep?.name ?? "..."}</h2>
          <p className="text-sm text-muted-foreground">PIX: {rep?.pix || "Não cadastrado"}</p>
        </div>
        <Button onClick={() => setPayDialog(true)} disabled={currentMonthPending.length === 0}>
          <CreditCard className="h-4 w-4 mr-2" />Pagar Comissões do Mês
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Mês" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os meses</SelectItem>
            {months.map((m) => <SelectItem key={m} value={m}>{formatMonth(m)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Gerada</SelectItem>
            <SelectItem value="awaiting">Aguardando</SelectItem>
            <SelectItem value="paid">Paga</SelectItem>
          </SelectContent>
        </Select>
        <Select value={doctorFilter} onValueChange={setDoctorFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Prescritor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {doctors.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        {[
          { title: "TOTAL FILTRADO", value: fmt(totalFiltered), icon: DollarSign, bg: "bg-primary/10", color: "text-primary" },
          { title: "PENDENTES", value: fmt(pendingFiltered), icon: TrendingUp, bg: "bg-amber-500/10", color: "text-amber-600" },
          { title: "COMISSÃO DO MÊS", value: fmt(currentMonthTotal), icon: CheckCircle, bg: "bg-emerald-500/10", color: "text-emerald-600" },
        ].map((c) => (
          <Card key={c.title} className="border border-border/50">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-medium tracking-wider text-muted-foreground">{c.title}</p>
                  <p className="text-2xl font-bold">{c.value}</p>
                </div>
                <div className={`h-12 w-12 rounded-xl ${c.bg} flex items-center justify-center`}>
                  <c.icon className={`h-6 w-6 ${c.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Prescritor</TableHead>
                <TableHead className="hidden sm:table-cell">Produtos</TableHead>
                <TableHead className="hidden sm:table-cell">Valor Produtos</TableHead>
                <TableHead className="hidden md:table-cell">Taxa</TableHead>
                <TableHead>Cashback</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : !filtered?.length ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma comissão encontrada</TableCell></TableRow>
              ) : (
                filtered.map((c: any) => {
                  const st = STATUS_MAP[c.status] ?? STATUS_MAP.pending;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm">{c.orders?.customer_name ?? "—"}</TableCell>
                      <TableCell>{c.doctors?.name ?? "—"}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs max-w-[200px] truncate">{getProducts(c.orders?.items)}</TableCell>
                      <TableCell className="hidden sm:table-cell">{fmt(Number(c.order_total))}</TableCell>
                      <TableCell className="hidden md:table-cell">{c.commission_rate}%</TableCell>
                      <TableCell className="font-semibold">{fmt(Number(c.commission_value))}</TableCell>
                      <TableCell><Badge variant={st.variant as any}>{st.label}</Badge></TableCell>
                      <TableCell className="hidden md:table-cell text-xs">{new Date(c.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={payDialog} onOpenChange={setPayDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Pagar Comissões do Mês — {rep?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Serão pagas <strong>{currentMonthPending.length}</strong> comissões pendentes do mês vigente, totalizando:
            </p>
            <p className="text-3xl font-bold text-primary">{fmt(currentMonthTotal)}</p>
            <div className="rounded-lg border p-3 space-y-1">
              <p className="text-xs text-muted-foreground">PIX do Representante:</p>
              <p className="text-sm font-medium">{rep?.pix || "Não cadastrado — cadastre antes de pagar"}</p>
            </div>
            <div className="max-h-48 overflow-y-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Pedido</TableHead>
                    <TableHead className="text-xs">Cashback</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentMonthPending.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs py-1">{c.orders?.customer_name ?? c.order_id?.slice(0, 8)}</TableCell>
                      <TableCell className="text-xs py-1 font-semibold">{fmt(Number(c.commission_value))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog(false)}>Cancelar</Button>
            <Button onClick={() => payMutation.mutate()} disabled={payMutation.isPending || !rep?.pix}>
              {payMutation.isPending ? "Enviando..." : "Confirmar Pagamento via Asaas"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
