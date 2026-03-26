import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Stethoscope, ShoppingCart, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function DashboardPage() {
  const { isAdmin } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [reps, docs, orders] = await Promise.all([
        isAdmin ? supabase.from("representatives").select("id", { count: "exact" }) : Promise.resolve({ count: 0 }),
        supabase.from("doctors").select("id", { count: "exact" }),
        supabase.from("orders").select("id, total, created_at"),
      ]);

      const ordersData = orders.data ?? [];
      const totalRevenue = ordersData.reduce((sum, o) => sum + Number(o.total), 0);

      // Monthly data for chart
      const monthly: Record<string, number> = {};
      ordersData.forEach((o) => {
        const month = new Date(o.created_at).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
        monthly[month] = (monthly[month] || 0) + Number(o.total);
      });
      const chartData = Object.entries(monthly).map(([name, total]) => ({ name, total }));

      return {
        representatives: typeof reps === "object" && "count" in reps ? reps.count ?? 0 : 0,
        doctors: docs.count ?? 0,
        orders: ordersData.length,
        revenue: totalRevenue,
        chartData,
      };
    },
  });

  const cards = [
    ...(isAdmin ? [{ title: "Representantes", value: stats?.representatives ?? 0, icon: Users, color: "text-primary" }] : []),
    { title: "Prescritores", value: stats?.doctors ?? 0, icon: Stethoscope, color: "text-secondary" },
    { title: "Pedidos", value: stats?.orders ?? 0, icon: ShoppingCart, color: "text-success" },
    { title: "Faturamento", value: `R$ ${(stats?.revenue ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: DollarSign, color: "text-warning" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      {(stats?.chartData?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vendas por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats?.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
