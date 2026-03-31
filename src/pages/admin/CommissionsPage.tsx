import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { DollarSign, TrendingUp, CreditCard } from "lucide-react";
import { toast } from "sonner";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-amber-100 text-amber-800 border-amber-200" },
  awaiting: { label: "Aguardando", className: "bg-blue-100 text-blue-800 border-blue-200" },
  paid: { label: "Paga", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
};

const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

function formatMonth(m: string) {
  const [y, mo] = m.split("-");
  const date = new Date(Number(y), Number(mo) - 1);
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function getLastMonth() {
  const now = new Date();
  const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${lm.getFullYear()}-${String(lm.getMonth() + 1).padStart(2, "0")}`;
}

export default function CommissionsPage() {
  const { isAdmin, isFinanceiro } = useAuth();
  const queryClient = useQueryClient();
  const [monthFilter, setMonthFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [prescriberFilter, setPrescriberFilter] = useState("all");
  const [tab, setTab] = useState("representative");
  const [payDialog, setPayDialog] = useState(false);
  const [selectedPayments, setSelectedPayments] = useState<Record<string, boolean>>({});

  const { data: commissions, isLoading } = useQuery({
    queryKey: ["commissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commissions")
        .select("*, representatives(name, pix), doctors(name, pix), orders(customer_name, created_at, doctor_id, status)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: noPrescOrders } = useQuery({
    queryKey: ["orders-no-prescriber"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, customer_name, total, created_at, status")
        .is("doctor_id", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const months = useMemo(() =>
    Array.from(new Set(
      commissions?.map((c) => {
        const d = new Date(c.created_at);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      }) ?? []
    )).sort().reverse(),
  [commissions]);

  const filtered = useMemo(() =>
    commissions?.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (monthFilter !== "all") {
        const d = new Date(c.created_at);
        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (m !== monthFilter) return false;
      }
      return true;
    }) ?? [],
  [commissions, statusFilter, monthFilter]);

  const totalCashback = filtered.reduce((s, c) => s + Number(c.commission_value), 0);
  const pendingCashback = filtered.filter((c) => c.status === "pending").reduce((s, c) => s + Number(c.commission_value), 0);

  // Group by representative or prescriber for payment view
  const lastMonth = getLastMonth();
  const payableCommissions = useMemo(() =>
    (commissions ?? []).filter((c) => {
      if (c.status !== "pending") return false;
      const orderStatus = (c as any).orders?.status;
      if (orderStatus !== "paid" && orderStatus !== "confirmed") return false;
      const d = new Date(c.created_at);
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return m === lastMonth;
    }),
  [commissions, lastMonth]);

  const groupedByRep = useMemo(() => {
    const map: Record<string, { name: string; pix: string; total: number; ids: string[] }> = {};
    payableCommissions.forEach((c) => {
      const key = c.representative_id;
      if (!map[key]) {
        map[key] = { name: (c as any).representatives?.name ?? "—", pix: (c as any).representatives?.pix ?? "", total: 0, ids: [] };
      }
      map[key].total += Number(c.commission_value);
      map[key].ids.push(c.id);
    });
    return map;
  }, [payableCommissions]);

  const groupedByDoc = useMemo(() => {
    const map: Record<string, { name: string; pix: string; total: number; ids: string[] }> = {};
    payableCommissions.filter(c => c.doctor_id).forEach((c) => {
      const key = c.doctor_id!;
      if (!map[key]) {
        map[key] = { name: (c as any).doctors?.name ?? "—", pix: (c as any).doctors?.pix ?? "", total: 0, ids: [] };
      }
      map[key].total += Number(c.commission_value);
      map[key].ids.push(c.id);
    });
    return map;
  }, [payableCommissions]);

  const paymentGroups = tab === "representative" ? groupedByRep : groupedByDoc;

  const payMutation = useMutation({
    mutationFn: async ({ id, name, pix, ids, total, type }: { id: string; name: string; pix: string; ids: string[]; total: number; type: string }) => {
      const { data, error } = await supabase.functions.invoke("pay-commissions", {
        body: { representative_id: id, representative_name: name, representative_pix: pix, commission_ids: ids, total, type },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      toast.success("Pagamento enviado com sucesso!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handlePaySelected = async () => {
    const selected = Object.entries(selectedPayments).filter(([, v]) => v);
    for (const [id] of selected) {
      const g = paymentGroups[id];
      if (!g) continue;
      await payMutation.mutateAsync({
        id, name: g.name, pix: g.pix, ids: g.ids, total: g.total,
        type: tab === "representative" ? "representative" : "prescriber",
      });
    }
    setPayDialog(false);
    setSelectedPayments({});
  };

  const openPayDialog = () => {
    const init: Record<string, boolean> = {};
    Object.keys(paymentGroups).forEach((k) => { init[k] = true; });
    setSelectedPayments(init);
    setPayDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Cashback</h2>
          <p className="text-sm text-muted-foreground mt-1">Acompanhe comissões e cashback</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {isFinanceiro && (
            <Button onClick={openPayDialog} disabled={Object.keys(paymentGroups).length === 0}>
              <CreditCard className="mr-2 h-4 w-4" />
              Gerar Pagamentos ({formatMonth(lastMonth)})
            </Button>
          )}
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-36 sm:w-44"><SelectValue placeholder="Mês" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os meses</SelectItem>
              {months.map((m) => (
                <SelectItem key={m} value={m}>{formatMonth(m)}</SelectItem>
              ))}
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
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        {[
          { title: "TOTAL CASHBACK", value: fmt(totalCashback), icon: DollarSign, iconBg: "bg-primary/10", iconColor: "text-primary" },
          { title: "PENDENTES", value: fmt(pendingCashback), icon: TrendingUp, iconBg: "bg-amber-500/10", iconColor: "text-amber-600" },
        ].map((card) => (
          <Card key={card.title} className="relative overflow-hidden border border-border/50">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-medium tracking-wider text-muted-foreground">{card.title}</p>
                  <p className="text-2xl font-bold text-foreground">{card.value}</p>
                </div>
                <div className={`h-12 w-12 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                  <card.icon className={`h-6 w-6 ${card.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="representative">Por Representante</TabsTrigger>
          <TabsTrigger value="prescriber">Por Prescritor</TabsTrigger>
        </TabsList>

        <TabsContent value="representative" className="mt-4">
          <CommissionsTable commissions={filtered} isAdmin={isAdmin} type="representative" />
        </TabsContent>

        <TabsContent value="prescriber" className="mt-4">
          <CommissionsTable commissions={filtered} isAdmin={isAdmin} type="prescriber" />
        </TabsContent>
      </Tabs>

      {/* Vendas sem Prescritor */}
      {noPrescOrders && noPrescOrders.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Vendas sem Prescritor Identificado</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="hidden sm:table-cell">Data</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {noPrescOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>{o.customer_name}</TableCell>
                    <TableCell>{fmt(Number(o.total))}</TableCell>
                    <TableCell className="hidden sm:table-cell">{new Date(o.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell><Badge variant="outline">{o.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Payment Dialog */}
      <Dialog open={payDialog} onOpenChange={setPayDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gerar Pagamentos — {formatMonth(lastMonth)}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Apenas comissões do mês anterior com pedidos efetivamente pagos. Selecione os pagamentos a enviar via Asaas.
          </p>
          {Object.keys(paymentGroups).length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Nenhuma comissão pendente para o mês anterior.</p>
          ) : (
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>PIX</TableHead>
                    <TableHead>Comissões</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(paymentGroups).map(([id, g]) => (
                    <TableRow key={id}>
                      <TableCell>
                        <Checkbox
                          checked={!!selectedPayments[id]}
                          onCheckedChange={(v) => setSelectedPayments((p) => ({ ...p, [id]: !!v }))}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{g.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[120px]">{g.pix || "Sem PIX"}</TableCell>
                      <TableCell>{g.ids.length}</TableCell>
                      <TableCell className="font-semibold">{fmt(g.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog(false)}>Cancelar</Button>
            <Button
              onClick={handlePaySelected}
              disabled={payMutation.isPending || !Object.values(selectedPayments).some(Boolean)}
            >
              {payMutation.isPending ? "Enviando..." : "Confirmar Pagamentos"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CommissionsTable({ commissions, isAdmin, type }: { commissions: any[]; isAdmin: boolean; type: string }) {
  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              {isAdmin && <TableHead className="hidden md:table-cell">Representante</TableHead>}
              <TableHead>Prescritor</TableHead>
              <TableHead className="hidden sm:table-cell">Valor Produtos</TableHead>
              <TableHead className="hidden md:table-cell">Taxa</TableHead>
              <TableHead>Cashback</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!commissions.length ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum cashback encontrado</TableCell></TableRow>
            ) : (
              commissions.map((c) => {
                const st = STATUS_MAP[c.status] ?? STATUS_MAP.pending;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm">{(c as any).orders?.customer_name ?? "—"}</TableCell>
                    {isAdmin && <TableCell className="hidden md:table-cell">{(c as any).representatives?.name ?? "—"}</TableCell>}
                    <TableCell>{(c as any).doctors?.name ?? "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell">{fmt(Number(c.order_total))}</TableCell>
                    <TableCell className="hidden md:table-cell">{c.commission_rate}%</TableCell>
                    <TableCell className="font-semibold">{fmt(Number(c.commission_value))}</TableCell>
                    <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
