import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Download } from "lucide-react";

const COLORS = ["hsl(203, 78%, 20%)", "hsl(203, 66%, 55%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)"];

export default function ReportsPage() {
  const { isAdmin } = useAuth();
  const [period, setPeriod] = useState("all");

  const { data } = useQuery({
    queryKey: ["reports", period],
    queryFn: async () => {
      let q = supabase.from("orders").select("*, doctors(name, representative_id, representatives(name))");

      if (period !== "all") {
        const now = new Date();
        const start = new Date();
        if (period === "30d") start.setDate(now.getDate() - 30);
        if (period === "90d") start.setDate(now.getDate() - 90);
        if (period === "12m") start.setMonth(now.getMonth() - 12);
        q = q.gte("created_at", start.toISOString());
      }

      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // By representative
  const byRep: Record<string, { name: string; total: number; count: number }> = {};
  const byDoctor: Record<string, { name: string; total: number; count: number }> = {};
  const byMonth: Record<string, number> = {};

  data?.forEach((order) => {
    const doc = order.doctors as any;
    const repName = doc?.representatives?.name ?? "Sem representante";
    const docName = doc?.name ?? "Sem prescritor";
    const month = new Date(order.created_at).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });

    if (!byRep[repName]) byRep[repName] = { name: repName, total: 0, count: 0 };
    byRep[repName].total += Number(order.total);
    byRep[repName].count += 1;

    if (!byDoctor[docName]) byDoctor[docName] = { name: docName, total: 0, count: 0 };
    byDoctor[docName].total += Number(order.total);
    byDoctor[docName].count += 1;

    byMonth[month] = (byMonth[month] || 0) + Number(order.total);
  });

  const repData = Object.values(byRep).sort((a, b) => b.total - a.total);
  const docData = Object.values(byDoctor).sort((a, b) => b.total - a.total).slice(0, 10);
  const monthData = Object.entries(byMonth).map(([name, total]) => ({ name, total }));

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const exportCSV = () => {
    if (!data?.length) return;
    const rows = [["Pedido", "Cliente", "Prescritor", "Representante", "Total", "Data"].join(",")];
    data.forEach((o) => {
      const doc = o.doctors as any;
      rows.push([o.id, o.customer_name, doc?.name ?? "", doc?.representatives?.name ?? "", o.total, new Date(o.created_at).toLocaleDateString("pt-BR")].join(","));
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-vendas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold">Relatórios</h2>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo período</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="12m">Últimos 12 meses</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-2" />Exportar CSV</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Vendas por Mês</CardTitle></CardHeader>
          <CardContent>
            {monthData.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-muted-foreground text-center py-12">Sem dados</p>}
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader><CardTitle>Vendas por Representante</CardTitle></CardHeader>
            <CardContent>
              {repData.length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={repData} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(e) => e.name}>
                      {repData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-muted-foreground text-center py-12">Sem dados</p>}
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle>Top Prescritores</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Prescritor</TableHead>
                <TableHead>Pedidos</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docData.length ? docData.map((d, i) => (
                <TableRow key={d.name}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell>{d.count}</TableCell>
                  <TableCell>{fmt(d.total)}</TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Sem dados</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
