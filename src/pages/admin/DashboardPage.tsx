import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Stethoscope, ShoppingCart, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
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
    ...(isAdmin ? [{
      title: "REPRESENTANTES",
      value: stats?.representatives ?? 0,
      icon: Users,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      trend: "+5%",
      trendUp: true,
    }] : []),
    {
      title: "PRESCRITORES",
      value: stats?.doctors ?? 0,
      icon: Stethoscope,
      iconBg: "bg-secondary/10",
      iconColor: "text-secondary",
      trend: "+12%",
      trendUp: true,
    },
    {
      title: "PEDIDOS",
      value: stats?.orders ?? 0,
      icon: ShoppingCart,
      iconBg: "bg-green-500/10",
      iconColor: "text-green-600",
      trend: "+8%",
      trendUp: true,
    },
    {
      title: "FATURAMENTO",
      value: `R$ ${(stats?.revenue ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-600",
      trend: "+15%",
      trendUp: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">Visão geral da sua loja</p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title} className="relative overflow-hidden border border-border/50">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-medium tracking-wider text-muted-foreground">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold text-foreground">{card.value}</p>
                  <Badge
                    variant="outline"
                    className={`text-2xs px-1.5 py-0 font-medium border-0 ${
                      card.trendUp
                        ? "bg-green-500/10 text-green-600"
                        : "bg-red-500/10 text-red-600"
                    }`}
                  >
                    {card.trendUp ? (
                      <TrendingUp className="h-3 w-3 mr-0.5" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-0.5" />
                    )}
                    {card.trend}
                  </Badge>
                </div>
                <div className={`h-12 w-12 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                  <card.icon className={`h-6 w-6 ${card.iconColor}`} />
                </div>
              </div>
              {/* Large background icon */}
              <card.icon className={`absolute -bottom-3 -right-3 h-24 w-24 ${card.iconColor} opacity-[0.04]`} />
            </CardContent>
          </Card>
        ))}
      </div>

      {(stats?.chartData?.length ?? 0) > 0 && (
        <Card className="border border-border/50">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Vendas por Mês</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats?.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
