import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Users, Stethoscope, ShoppingCart, DollarSign, TrendingUp, TrendingDown,
  BarChart3, PieChart as PieIcon, Globe, Zap, MousePointerClick, Eye,
  Target, Activity, MapPin, Megaphone, Wallet, ArrowUpRight, ArrowDownRight,
  CalendarDays, Trophy, Percent,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";

const PIE_COLORS = [
  "hsl(var(--primary))", "hsl(var(--secondary))", "#f97316", "#22c55e",
  "#eab308", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6",
];

const fmt = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
};

function KpiCard({ title, value, icon: Icon, iconBg, iconColor, trend, trendUp, placeholder }: any) {
  return (
    <Card className="relative overflow-hidden border border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium tracking-wider text-muted-foreground">{title}</p>
            <p className="text-xl font-bold text-foreground">{value}</p>
            {trend && (
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 font-medium border-0 ${
                  placeholder ? "bg-muted text-muted-foreground" : trendUp ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                }`}
              >
                {!placeholder && (trendUp ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />)}
                {trend}
              </Badge>
            )}
          </div>
          <div className={`h-10 w-10 rounded-xl ${iconBg} flex items-center justify-center`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
        <Icon className={`absolute -bottom-3 -right-3 h-20 w-20 ${iconColor} opacity-[0.04]`} />
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { isAdmin } = useAuth();
  const [salesGoal, setSalesGoal] = useState(() => {
    const saved = localStorage.getItem("dashboard_sales_goal");
    return saved ? Number(saved) : 50000;
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const [reps, docs, ordersRes, commissionsRes] = await Promise.all([
        isAdmin ? supabase.from("representatives").select("id", { count: "exact" }) : Promise.resolve({ count: 0 }),
        supabase.from("doctors").select("id", { count: "exact" }),
        supabase.from("orders").select("id, total, created_at, items, status, doctor_id, shipping_address"),
        supabase.from("commissions").select("id, commission_value, status, representative_id, doctor_id, created_at, order_total"),
      ]);

      const ordersData = ordersRes.data ?? [];
      const commissionsData = commissionsRes.data ?? [];
      const paidOrders = ordersData.filter((o) => o.status === "paid" || o.status === "confirmed");
      const totalRevenue = paidOrders.reduce((s, o) => s + Number(o.total), 0);
      const avgTicket = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

      // Current month filter
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthOrders = paidOrders.filter((o) => new Date(o.created_at) >= currentMonthStart);
      const currentMonthRevenue = currentMonthOrders.reduce((s, o) => s + Number(o.total), 0);

      // Monthly chart
      const monthly: Record<string, number> = {};
      paidOrders.forEach((o) => {
        const m = new Date(o.created_at).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
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
        .sort((a, b) => b.total - a.total).slice(0, 10);

      // By region
      const byState: Record<string, number> = {};
      paidOrders.forEach((o) => {
        const addr = o.shipping_address as any;
        const state = addr?.state || addr?.uf || "N/A";
        byState[state] = (byState[state] || 0) + Number(o.total);
      });
      const regionData = Object.entries(byState).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 15);

      // Top doctors & by rep
      let docData: { name: string; total: number; orders: number }[] = [];
      let repData: { name: string; total: number; orders: number; doctors: number }[] = [];

      if (isAdmin) {
        const doctorIds = [...new Set(paidOrders.map((o) => o.doctor_id).filter(Boolean))];
        if (doctorIds.length > 0) {
          const { data: doctorsRaw } = await supabase
            .from("doctors")
            .select("id, name, representative_id, representatives(name)")
            .in("id", doctorIds as string[]);
          const doctorsMap = new Map((doctorsRaw ?? []).map((d) => [d.id, d]));

          const byDoc: Record<string, { name: string; total: number; orders: number }> = {};
          const byRep: Record<string, { name: string; total: number; orders: number; docIds: Set<string> }> = {};

          paidOrders.forEach((o) => {
            if (!o.doctor_id) return;
            const doc = doctorsMap.get(o.doctor_id);
            if (!doc) return;
            const dName = doc.name || "Sem nome";
            if (!byDoc[doc.id]) byDoc[doc.id] = { name: dName, total: 0, orders: 0 };
            byDoc[doc.id].total += Number(o.total);
            byDoc[doc.id].orders += 1;

            const rep = doc.representatives as any;
            const rName = rep?.name || "Sem representante";
            const rId = doc.representative_id;
            if (!byRep[rId]) byRep[rId] = { name: rName, total: 0, orders: 0, docIds: new Set() };
            byRep[rId].total += Number(o.total);
            byRep[rId].orders += 1;
            byRep[rId].docIds.add(doc.id);
          });

          docData = Object.values(byDoc).sort((a, b) => b.total - a.total).slice(0, 10);
          repData = Object.values(byRep).map(({ docIds, ...r }) => ({ ...r, doctors: docIds.size })).sort((a, b) => b.total - a.total).slice(0, 10);
        }
      }

      // Commissions summary
      const totalCommissions = commissionsData.reduce((s, c) => s + Number(c.commission_value), 0);
      const pendingCommissions = commissionsData.filter((c) => c.status === "pending").reduce((s, c) => s + Number(c.commission_value), 0);
      const paidCommissions = commissionsData.filter((c) => c.status === "paid" || c.status === "awaiting").reduce((s, c) => s + Number(c.commission_value), 0);

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
        currentMonthRevenue,
        currentMonthOrders: currentMonthOrders.length,
        totalCommissions,
        pendingCommissions,
        paidCommissions,
        allOrders: ordersData.length,
        pendingOrders: ordersData.filter((o) => o.status === "pending").length,
      };
    },
  });

  const adsMetrics = [
    { label: "Investido", value: "—" },
    { label: "CPL", value: "—" },
    { label: "CPA", value: "—" },
    { label: "ROAS", value: "—" },
    { label: "CTR", value: "—" },
    { label: "Impressões", value: "—" },
    { label: "Cliques", value: "—" },
  ];

  const goalPercent = salesGoal > 0 ? Math.min(((stats?.currentMonthRevenue ?? 0) / salesGoal) * 100, 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">Visão geral completa da sua loja</p>
      </div>

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="prescritores">Prescritores</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
        </TabsList>

        {/* ════════ ABA GERAL ════════ */}
        <TabsContent value="geral" className="space-y-6 mt-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <KpiCard title="PEDIDOS PAGOS" value={stats?.orders ?? 0} icon={ShoppingCart} iconBg="bg-green-500/10" iconColor="text-green-600" trend="+8%" trendUp />
            <KpiCard title="FATURAMENTO" value={fmt(stats?.revenue ?? 0)} icon={DollarSign} iconBg="bg-amber-500/10" iconColor="text-amber-600" trend="+15%" trendUp />
            <KpiCard title="TICKET MÉDIO" value={fmt(stats?.avgTicket ?? 0)} icon={Target} iconBg="bg-purple-500/10" iconColor="text-purple-600" trend="+3%" trendUp />
            <KpiCard title="TOTAL PEDIDOS" value={stats?.allOrders ?? 0} icon={BarChart3} iconBg="bg-primary/10" iconColor="text-primary" />
            <KpiCard title="PENDENTES" value={stats?.pendingOrders ?? 0} icon={Activity} iconBg="bg-orange-500/10" iconColor="text-orange-600" />
          </div>

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
                      <Tooltip formatter={(v: number) => fmt(v)} contentStyle={tooltipStyle} />
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
                      <Tooltip formatter={(v: number) => fmt(v)} contentStyle={tooltipStyle} />
                      <Bar dataKey="total" fill="hsl(var(--secondary))" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

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
                    <Tooltip formatter={(v: number) => fmt(v)} contentStyle={tooltipStyle} />
                    <Bar dataKey="total" fill="#22c55e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ════════ ABA PRESCRITORES ════════ */}
        <TabsContent value="prescritores" className="space-y-6 mt-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {isAdmin && (
              <KpiCard title="REPRESENTANTES" value={stats?.representatives ?? 0} icon={Users} iconBg="bg-primary/10" iconColor="text-primary" trend="+5%" trendUp />
            )}
            <KpiCard title="PRESCRITORES" value={stats?.doctors ?? 0} icon={Stethoscope} iconBg="bg-secondary/10" iconColor="text-secondary" trend="+12%" trendUp />
            <KpiCard title="VENDAS VIA PRESCRITOR" value={stats?.docData?.reduce((s, d) => s + d.orders, 0) ?? 0} icon={ShoppingCart} iconBg="bg-green-500/10" iconColor="text-green-600" />
            <KpiCard title="FATURAMENTO PRESCRITOR" value={fmt(stats?.docData?.reduce((s, d) => s + d.total, 0) ?? 0)} icon={DollarSign} iconBg="bg-amber-500/10" iconColor="text-amber-600" />
          </div>

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
                        <Pie data={stats?.repData} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                          label={({ name, percent }) => `${name.length > 12 ? name.slice(0, 10) + "…" : name} ${(percent * 100).toFixed(0)}%`}
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

              {(stats?.repData?.length ?? 0) > 0 && (
                <Card className="border border-border/50">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Users className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-semibold text-foreground">Ranking Representantes</h3>
                    </div>
                    <div className="overflow-auto max-h-[280px]">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left">
                            <th className="pb-2 text-xs font-medium text-muted-foreground">#</th>
                            <th className="pb-2 text-xs font-medium text-muted-foreground">Representante</th>
                            <th className="pb-2 text-xs font-medium text-muted-foreground text-center">Prescritores</th>
                            <th className="pb-2 text-xs font-medium text-muted-foreground text-center">Pedidos</th>
                            <th className="pb-2 text-xs font-medium text-muted-foreground text-right">Vendas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats?.repData?.map((r, i) => (
                            <tr key={i} className="border-b border-border/50">
                              <td className="py-2 text-xs text-muted-foreground">{i + 1}</td>
                              <td className="py-2 text-xs font-medium text-foreground">{r.name}</td>
                              <td className="py-2 text-xs text-center text-foreground">{r.doctors}</td>
                              <td className="py-2 text-xs text-center text-foreground">{r.orders}</td>
                              <td className="py-2 text-xs text-right text-foreground">{fmt(r.total)}</td>
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

          {(stats?.docData?.length ?? 0) > 0 && (
            <Card className="border border-border/50">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-semibold text-foreground">Top 10 Prescritores</h3>
                </div>
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="pb-2 text-xs font-medium text-muted-foreground">#</th>
                        <th className="pb-2 text-xs font-medium text-muted-foreground">Prescritor</th>
                        <th className="pb-2 text-xs font-medium text-muted-foreground text-center">Pedidos</th>
                        <th className="pb-2 text-xs font-medium text-muted-foreground text-right">Vendas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats?.docData?.map((d, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-2 text-xs text-muted-foreground">{i + 1}</td>
                          <td className="py-2 text-xs font-medium text-foreground">{d.name}</td>
                          <td className="py-2 text-xs text-center text-foreground">{d.orders}</td>
                          <td className="py-2 text-xs text-right text-foreground">{fmt(d.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ════════ ABA MARKETING ════════ */}
        <TabsContent value="marketing" className="space-y-6 mt-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <KpiCard title="ONLINE AGORA" value="—" icon={Activity} iconBg="bg-cyan-500/10" iconColor="text-cyan-600" trend="Analytics" placeholder />
            <KpiCard title="SESSÕES ORGÂNICAS" value="—" icon={Globe} iconBg="bg-green-500/10" iconColor="text-green-600" trend="Analytics" placeholder />
            <KpiCard title="TAXA DE CONVERSÃO" value="—" icon={Percent} iconBg="bg-purple-500/10" iconColor="text-purple-600" trend="Analytics" placeholder />
          </div>

          {isAdmin && (
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
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
                    <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-0">Conectar API</Badge>
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
                    <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-0">Conectar API</Badge>
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

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
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
                <Globe className="h-8 w-8 text-green-600 mb-2" />
                <p className="text-xs font-medium text-muted-foreground">BOUNCE RATE</p>
                <p className="text-2xl font-bold text-foreground mt-1">—</p>
                <p className="text-[10px] text-muted-foreground mt-1">Requer Google Analytics</p>
              </CardContent>
            </Card>
            <Card className="border border-border/50">
              <CardContent className="p-5 flex flex-col items-center justify-center text-center min-h-[120px]">
                <Zap className="h-8 w-8 text-amber-500 mb-2" />
                <p className="text-xs font-medium text-muted-foreground">DURAÇÃO MÉDIA</p>
                <p className="text-2xl font-bold text-foreground mt-1">—</p>
                <p className="text-[10px] text-muted-foreground mt-1">Requer Google Analytics</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ════════ ABA FINANCEIRO ════════ */}
        <TabsContent value="financeiro" className="space-y-6 mt-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard title="FATURAMENTO TOTAL" value={fmt(stats?.revenue ?? 0)} icon={DollarSign} iconBg="bg-green-500/10" iconColor="text-green-600" />
            <KpiCard title="FATURAMENTO DO MÊS" value={fmt(stats?.currentMonthRevenue ?? 0)} icon={CalendarDays} iconBg="bg-primary/10" iconColor="text-primary" />
            <KpiCard title="COMISSÕES PENDENTES" value={fmt(stats?.pendingCommissions ?? 0)} icon={ArrowUpRight} iconBg="bg-orange-500/10" iconColor="text-orange-600" />
            <KpiCard title="COMISSÕES PAGAS" value={fmt(stats?.paidCommissions ?? 0)} icon={ArrowDownRight} iconBg="bg-emerald-500/10" iconColor="text-emerald-600" />
          </div>

          {/* Meta de Vendas do Mês */}
          <Card className="border border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Meta de Vendas do Mês</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Meta:</Label>
                  <Input
                    type="number"
                    className="w-32 h-8 text-xs"
                    value={salesGoal}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setSalesGoal(v);
                      localStorage.setItem("dashboard_sales_goal", String(v));
                    }}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-bold text-foreground">{goalPercent.toFixed(1)}%</span>
                </div>
                <div className="w-full h-4 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${goalPercent}%`,
                      background: goalPercent >= 100
                        ? "hsl(var(--primary))"
                        : goalPercent >= 70
                        ? "#22c55e"
                        : goalPercent >= 40
                        ? "#eab308"
                        : "#ef4444",
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Atual: {fmt(stats?.currentMonthRevenue ?? 0)}</span>
                  <span>Meta: {fmt(salesGoal)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Pedidos no mês: {stats?.currentMonthOrders ?? 0}</span>
                  <span>Falta: {fmt(Math.max(0, salesGoal - (stats?.currentMonthRevenue ?? 0)))}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Entradas e Saídas */}
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <Card className="border border-border/50">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <ArrowUpRight className="h-4 w-4 text-green-600" />
                  <h3 className="text-sm font-semibold text-foreground">Entradas (Vendas)</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/5">
                    <span className="text-sm text-foreground">Vendas Pagas</span>
                    <span className="text-sm font-bold text-green-600">{fmt(stats?.revenue ?? 0)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm text-foreground">Ticket Médio</span>
                    <span className="text-sm font-bold text-foreground">{fmt(stats?.avgTicket ?? 0)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm text-foreground">Pedidos Pagos</span>
                    <span className="text-sm font-bold text-foreground">{stats?.orders ?? 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/50">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <ArrowDownRight className="h-4 w-4 text-red-600" />
                  <h3 className="text-sm font-semibold text-foreground">Saídas (Comissões)</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/5">
                    <span className="text-sm text-foreground">Total Comissões</span>
                    <span className="text-sm font-bold text-red-600">{fmt(stats?.totalCommissions ?? 0)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-orange-500/5">
                    <span className="text-sm text-foreground">Comissões Pendentes</span>
                    <span className="text-sm font-bold text-orange-600">{fmt(stats?.pendingCommissions ?? 0)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/5">
                    <span className="text-sm text-foreground">Comissões Pagas</span>
                    <span className="text-sm font-bold text-green-600">{fmt(stats?.paidCommissions ?? 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de vendas mensal no financeiro */}
          {(stats?.chartData?.length ?? 0) > 0 && (
            <Card className="border border-border/50">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Wallet className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Evolução Mensal de Faturamento</h3>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={stats?.chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip formatter={(v: number) => fmt(v)} contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
