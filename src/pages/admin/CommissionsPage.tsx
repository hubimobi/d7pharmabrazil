import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, TrendingUp } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  pending: { label: "Gerada", variant: "outline" },
  awaiting: { label: "Aguardando", variant: "secondary" },
  paid: { label: "Paga", variant: "default" },
};

export default function CommissionsPage() {
  const { isAdmin } = useAuth();
  const [monthFilter, setMonthFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [prescriberFilter, setPrescriberFilter] = useState("all");

  const { data: commissions, isLoading } = useQuery({
    queryKey: ["commissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commissions")
        .select("*, representatives(name), doctors(name), orders(customer_name, created_at, doctor_id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Also fetch orders without doctor for "Sem Prescritor" section
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

  // Build month options from data
  const months = Array.from(new Set(
    commissions?.map((c) => {
      const d = new Date(c.created_at);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }) ?? []
  )).sort().reverse();

  const filtered = commissions?.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (monthFilter !== "all") {
      const d = new Date(c.created_at);
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (m !== monthFilter) return false;
    }
    return true;
  });

  const totalCashback = filtered?.reduce((s, c) => s + Number(c.commission_value), 0) ?? 0;
  const pendingCashback = filtered?.filter((c) => c.status === "pending").reduce((s, c) => s + Number(c.commission_value), 0) ?? 0;
  const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  const formatMonth = (m: string) => {
    const [y, mo] = m.split("-");
    const date = new Date(Number(y), Number(mo) - 1);
    return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold">Cashback</h2>
        <div className="flex gap-2">
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Mês" /></SelectTrigger>
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
          <Select value={prescriberFilter} onValueChange={setPrescriberFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Prescritor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="no-prescriber">Sem Prescritor</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Cashback</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{fmt(totalCashback)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-warning">{fmt(pendingCashback)}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                {isAdmin && <TableHead>Representante</TableHead>}
                <TableHead>Prescritor</TableHead>
                <TableHead>Valor Produtos</TableHead>
                <TableHead>Taxa</TableHead>
                <TableHead>Cashback</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : !filtered?.length ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum cashback encontrado</TableCell></TableRow>
              ) : (
                filtered.map((c) => {
                  const st = STATUS_MAP[c.status] ?? STATUS_MAP.pending;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm">{(c as any).orders?.customer_name ?? "—"}</TableCell>
                      {isAdmin && <TableCell>{(c as any).representatives?.name ?? "—"}</TableCell>}
                      <TableCell>{(c as any).doctors?.name ?? "—"}</TableCell>
                      <TableCell>{fmt(Number(c.order_total))}</TableCell>
                      <TableCell>{c.commission_rate}%</TableCell>
                      <TableCell className="font-semibold">{fmt(Number(c.commission_value))}</TableCell>
                      <TableCell>
                        <Badge variant={st.variant}>{st.label}</Badge>
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
