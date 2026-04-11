import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, ShoppingCart, TrendingUp, Clock } from "lucide-react";

interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  created_at: string;
}

export default function SuperbossDashboard() {
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);

  useEffect(() => {
    // All tenants — no tenant_id filter for superboss
    supabase
      .from("tenants")
      .select("id, name, slug, plan, status, created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setTenants(data);
      });

    // Today's orders across ALL tenants
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString())
      .then(({ count }) => {
        setTotalOrders(count ?? 0);
      });

    // Month revenue across ALL tenants
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    supabase
      .from("orders")
      .select("total")
      .gte("created_at", monthStart.toISOString())
      .then(({ data }) => {
        const sum = (data ?? []).reduce((acc, o) => acc + (o.total || 0), 0);
        setMonthRevenue(sum);
      });
  }, []);

  const activeCount = tenants.filter((t) => t.status === "active").length;
  const trialCount = tenants.filter((t) => t.plan === "trial").length;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard SUPERBOSS</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lojas Ativas</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-3xl font-bold">{activeCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em Trial</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-3xl font-bold">{trialCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pedidos Hoje</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-3xl font-bold">{totalOrders}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receita do Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(monthRevenue)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Lojas</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2">Nome</th>
                  <th className="pb-2">Slug</th>
                  <th className="pb-2">Plano</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Criado em</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{t.name}</td>
                    <td className="py-2">{t.slug}</td>
                    <td className="py-2 capitalize">{t.plan}</td>
                    <td className="py-2">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${t.status === "active" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-2">{new Date(t.created_at).toLocaleDateString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
