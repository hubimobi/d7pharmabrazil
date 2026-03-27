import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, Stethoscope, ShoppingCart, DollarSign, TrendingUp, TrendingDown,
  BarChart3, PieChart as PieIcon, Globe, Zap, MousePointerClick, Eye,
  Target, Activity, MapPin, Megaphone,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const PIE_COLORS = [
  "hsl(var(--primary))", "hsl(var(--secondary))", "#f97316", "#22c55e",
  "#eab308", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6",
];

const fmt = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

export default function DashboardPage() {
  const { isAdmin } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const [reps, docs, ordersRes] = await Promise.all([
        isAdmin
          ? supabase.from("representatives").select("id", { count: "exact" })
          : Promise.resolve({ count: 0 }),
        supabase.from("doctors").select("id", { count: "exact" }),
        supabase.from("orders").select("id, total, created_at, items, status, doctor_id, shipping_address"),
      ]);

      const ordersData = ordersRes.data ?? [];
      const paidOrders = ordersData.filter(
        (o) => o.status === "paid" || o.status === "confirmed"
      );
      const totalRevenue = paidOrders.reduce((s, o) => s + Number(o.total), 0);
      const avgTicket = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

      // Monthly
      const monthly: Record<string, number> = {};
      paidOrders.forEach((o) => {
        const m = new Date(o.created_at).toLocaleDateString("pt-BR", {
          month: "short",
          year: "2-digit",
        });
        monthly[m] = (monthly[m] || 0) + Number(o.total);
      });
      const chartData = Object.entries(monthly).map(([name, total]) => ({ name, total }));

      // By product
      const byProduct: Record<string, number> = {};
      paidOrders.forEach((o) => {
        const items = Array.isArray(o.items) ? o.items : [];
        items.forEach((item: any) => {
          const name = item?.name || item?.product_name || "Produto";
          byProduct[name] = (byProduct[name] || 0) + Number(item?.price || 0) * Number(item?.quantity || 1);
        });
      });
      const productData = Object.entries(byProduct)
        .map(([name, total]) => ({ name: name.length > 25 ? name.slice(0, 22) + "…" : name, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      // By region (state from shipping_address)
      const byState: Record<string, number> = {};
      paidOrders.forEach((o) => {
        const addr = o.shipping_address as any;
        const state = addr?.state || addr?.uf || "N/A";
        byState[state] = (byState[state] || 0) + Number(o.total);
      });
      const regionData = Object.entries(byState)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 15);

      // Top doctors & by rep — need doctor data
      let docData: { name: string; total: number }[] = [];
      let repData: { name: string; total: number }[] = [];

      if (isAdmin) {
        const doctorIds = [...new Set(paidOrders.map((o) => o.doctor_id).filter(Boolean))];
        if (doctorIds.length > 0) {
          const { data: doctorsRaw } = await supabase
            .from("doctors")
            .select("id, name, representative_id, representatives(name)")
            .in("id", doctorIds as string[]);
          const doctorsMap = new Map((doctorsRaw ?? []).map((d) => [d.id, d]));

          const byDoc: Record<string, { name: string; total: number }> = {};
          const byRep: Record<string, { name: string; total: number }> = {};

          paidOrders.forEach((o) => {
            if (!o.doctor_id) return;
            const doc = doctorsMap.get(o.doctor_id);
            if (!doc) return;
            const dName = doc.name || "Sem nome";
            if (!byDoc[doc.id]) byDoc[doc.id] = { name: dName, total: 0 };
            byDoc[doc.id].total += Number(o.total);

            const rep = doc.representatives as any;
            const rName = rep?.name || "Sem representante";
            const rId = doc.representative_id;
            if (!byRep[rId]) byRep[rId] = { name: rName, total: 0 };
            byRep[rId].total += Number(o.total);
          });

          docData = Object.values(byDoc).sort((a, b) => b.total - a.total).slice(0, 10);
          repData = Object.values(byRep).sort((a, b) => b.total - a.total).slice(0, 10);
        }
      }

      return {
        representatives: typeof reps === "object" && "count" in reps ? reps.count ?? 0 : 0,
        doctors: docs.count ?? 0,
        orders: paidOrders.length,
        revenue: totalRevenue,
        avgTicket,
        chartData,
        productData,
        regionData,
        docData,
        repData,
      };
    },
  });

  const kpiCards = [
    ...(isAdmin
      ? [
          {
            title: "REPRESENTANTES",
            value: stats?.representatives ?? 0,
            icon: Users,
            iconBg: "bg-primary/10",
            iconColor: "text-primary",
            trend: "+5%",
            trendUp: true,
          },
        ]
      : []),
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
      value: fmt(stats?.revenue ?? 0),
      icon: DollarSign,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-600",
      trend: "+15%",
      trendUp: true,
    },
    {
      title: "TICKET MÉDIO",
      value: fmt(stats?.avgTicket ?? 0),
      icon: Target,
      iconBg: "bg-purple-500/10",
      iconColor: "text-purple-600",
      trend: "+3%",
      trendUp: true,
    },
    {
      title: "ONLINE AGORA",
      value: "—",
      icon: Activity,
      iconBg: "bg-cyan-500/10",
      iconColor: "text-cyan-600",
      trend: "Analytics",
      trendUp: true,
      placeholder: true,
    },
  ];

  const adsMetrics = [
    { label: "Investido", value: "—" },
    { label: "CPL", value: "—" },
    { label: "CPA", value: "—" },
    { label: "ROAS", value: "—" },
    { label: "CTR", value: "—" },
    { label: "Impressões", value: "—" },
    { label: "Cliques", value: "—" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">Visão geral completa da sua loja</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpiCards.map((card) => (
          <Card key={card.title} className="relative overflow-hidden border border-border/50">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-medium tracking-wider text-muted-foreground">{card.title}</p>
                  <p className="text-xl font-bold text-foreground">{card.value}</p>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 font-medium border-0 ${
                      card.placeholder
                        ? "bg-muted text-muted-foreground"
                        : card.trendUp
                        ? "bg-green-500/10 text-green-600"
                        : "bg-red-500/10 text-red-600"
                    }`}
                  >
                    {!card.placeholder &&
                      (card.trendUp ? (
                        <TrendingUp className="h-3 w-3 mr-0.5" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-0.5" />
                      ))}
                    {card.trend}
                  </Badge>
                </div>
                <div className={`h-10 w-10 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                  <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
              </div>
              <card.icon className={`absolute -bottom-3 -right-3 h-20 w-20 ${card.iconColor} opacity-[0.04]`} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1: Monthly + By Product */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {(stats?.chartData?.length ?? 0) > 0 && (
          <Card className="border border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Vendas por Mês</h3>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats?.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    formatter={(v: number) => fmt(v)}
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

        {(stats?.productData?.length ?? 0) > 0 && (
          <Card className="border border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingCart className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Vendas por Produto</h3>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats?.productData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    formatter={(v: number) => fmt(v)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="total" fill="hsl(var(--secondary))" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Charts Row 2: By Rep (Pie) + Top Prescribers */}
      {isAdmin && (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {(stats?.repData?.length ?? 0) > 0 && (
            <Card className="border border-border/50">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <PieIcon className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Vendas por Representante</h3>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={stats?.repData}
                      dataKey="total"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }) =>
                        `${name.length > 12 ? name.slice(0, 10) + "…" : name} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {stats?.repData?.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {(stats?.docData?.length ?? 0) > 0 && (
            <Card className="border border-border/50">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Stethoscope className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Top 10 Prescritores</h3>
                </div>
                <div className="overflow-auto max-h-[280px]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="pb-2 text-xs font-medium text-muted-foreground">#</th>
                        <th className="pb-2 text-xs font-medium text-muted-foreground">Prescritor</th>
                        <th className="pb-2 text-xs font-medium text-muted-foreground text-right">Vendas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats?.docData?.map((d, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-2 text-xs text-muted-foreground">{i + 1}</td>
                          <td className="py-2 text-xs font-medium text-foreground">{d.name}</td>
                          <td className="py-2 text-xs text-right text-foreground">{fmt(d.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Region Map */}
      {(stats?.regionData?.length ?? 0) > 0 && (
        <Card className="border border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Vendas por Região (UF)</h3>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats?.regionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  formatter={(v: number) => fmt(v)}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="total" fill="#22c55e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Paid Traffic Placeholders */}
      {isAdmin && (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {/* Meta Ads */}
          <Card className="border border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Megaphone className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Meta Ads</h3>
                    <p className="text-[10px] text-muted-foreground">Facebook & Instagram</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-0">
                  Conectar API
                </Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {adsMetrics.slice(0, 4).map((m) => (
                  <div key={m.label} className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-[10px] text-muted-foreground">{m.label}</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">{m.value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3">
                {adsMetrics.slice(4).map((m) => (
                  <div key={m.label} className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-[10px] text-muted-foreground">{m.label}</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">{m.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Google Ads */}
          <Card className="border border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <MousePointerClick className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Google Ads</h3>
                    <p className="text-[10px] text-muted-foreground">Search & Display</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-0">
                  Conectar API
                </Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {adsMetrics.slice(0, 4).map((m) => (
                  <div key={m.label} className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-[10px] text-muted-foreground">{m.label}</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">{m.value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3">
                {adsMetrics.slice(4).map((m) => (
                  <div key={m.label} className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-[10px] text-muted-foreground">{m.label}</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">{m.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Organic / Analytics Placeholders */}
      {isAdmin && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <Card className="border border-border/50">
            <CardContent className="p-5 flex flex-col items-center justify-center text-center min-h-[120px]">
              <Globe className="h-8 w-8 text-green-600 mb-2" />
              <p className="text-xs font-medium text-muted-foreground">SESSÕES ORGÂNICAS</p>
              <p className="text-2xl font-bold text-foreground mt-1">—</p>
              <p className="text-[10px] text-muted-foreground mt-1">Requer Google Analytics</p>
            </CardContent>
          </Card>
          <Card className="border border-border/50">
            <CardContent className="p-5 flex flex-col items-center justify-center text-center min-h-[120px]">
              <Eye className="h-8 w-8 text-cyan-600 mb-2" />
              <p className="text-xs font-medium text-muted-foreground">PAGEVIEWS</p>
              <p className="text-2xl font-bold text-foreground mt-1">—</p>
              <p className="text-[10px] text-muted-foreground mt-1">Requer Google Analytics</p>
            </CardContent>
          </Card>
          <Card className="border border-border/50">
            <CardContent className="p-5 flex flex-col items-center justify-center text-center min-h-[120px]">
              <Zap className="h-8 w-8 text-amber-500 mb-2" />
              <p className="text-xs font-medium text-muted-foreground">TAXA DE CONVERSÃO</p>
              <p className="text-2xl font-bold text-foreground mt-1">—</p>
              <p className="text-[10px] text-muted-foreground mt-1">Requer Google Analytics</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
