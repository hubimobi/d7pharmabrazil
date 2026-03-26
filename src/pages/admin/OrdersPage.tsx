import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RefreshCw, Eye, Package, Search, DollarSign, Truck, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "outline" },
  paid: { label: "Pago", variant: "default" },
  shipped: { label: "Enviado", variant: "secondary" },
  delivered: { label: "Finalizado", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [trackingCode, setTrackingCode] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ["admin-orders", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const filteredOrders = (orders || []).filter((o) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      o.customer_name?.toLowerCase().includes(s) ||
      o.customer_email?.toLowerCase().includes(s) ||
      o.id.toLowerCase().includes(s) ||
      o.asaas_payment_id?.toLowerCase().includes(s)
    );
  });

  const handleSyncBling = async (orderId: string, force = false) => {
    try {
      const { data, error } = await supabase.functions.invoke("bling-sync-order", {
        body: { order_id: orderId, force },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.already_exists) {
        toast.info(`Pedido já existe no Bling (ID: ${data.bling_id}).`);
      } else {
      toast.success("Pedido sincronizado com Bling!");
      }
      refetch();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  const handleSyncAll = async () => {
    if (!orders || orders.length === 0) return;
    const syncableOrders = orders.filter((o) => ["paid", "shipped", "delivered"].includes(o.status));
    if (syncableOrders.length === 0) {
      toast.info("Nenhum pedido com status válido para sincronizar.");
      return;
    }
    setSyncingAll(true);
    let success = 0;
    let fail = 0;
    for (const order of syncableOrders) {
      try {
        const { data, error } = await supabase.functions.invoke("bling-sync-order", {
          body: { order_id: order.id },
        });
        if (error || data?.error) { fail++; } else { success++; }
      } catch { fail++; }
    }
    setSyncingAll(false);
    toast.success(`Sincronização concluída: ${success} ok, ${fail} erros de ${syncableOrders.length} pedidos.`);
    refetch();
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const updateData: any = { status: newStatus };
      if (trackingCode && newStatus === "shipped") {
        updateData.tracking_code = trackingCode;
      }
      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId);
      if (error) throw error;
      toast.success("Status atualizado!");
      refetch();
      setSelectedOrder(null);
      setTrackingCode("");
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const stats = {
    total: orders?.length || 0,
    paid: orders?.filter((o) => o.status === "paid").length || 0,
    shipped: orders?.filter((o) => o.status === "shipped").length || 0,
    delivered: orders?.filter((o) => o.status === "delivered").length || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Vendas</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSyncAll} disabled={syncingAll}>
            {syncingAll ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            {syncingAll ? "Sincronizando..." : "Sincronizar Tudo (Bling)"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Total Pedidos</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">Pagos</p>
              <p className="text-2xl font-bold">{stats.paid}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Truck className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-muted-foreground">Enviados</p>
              <p className="text-2xl font-bold">{stats.shipped}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Package className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="text-sm text-muted-foreground">Finalizados</p>
              <p className="text-2xl font-bold">{stats.delivered}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="paid">Pago</SelectItem>
            <SelectItem value="shipped">Enviado</SelectItem>
            <SelectItem value="delivered">Finalizado</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fatura Asaas</TableHead>
                <TableHead>Pedido Bling</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Cupom</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Nenhum pedido encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => {
                  const st = statusMap[order.status] || { label: order.status, variant: "outline" as const };
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">
                        #{order.id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{order.customer_name}</p>
                          <p className="text-xs text-muted-foreground">{order.customer_email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {order.asaas_payment_id || "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {(order as any).bling_order_id || "—"}
                      </TableCell>
                      <TableCell className="font-semibold">
                        R$ {Number(order.total).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {order.coupon_code ? (
                          <Badge variant="secondary" className="text-xs">{order.coupon_code}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(order.created_at), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Ver detalhes"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Sync Bling"
                            onClick={() => handleSyncBling(order.id)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Pedido #{selectedOrder?.id?.slice(0, 8)}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Cliente</p>
                  <p className="font-medium">{selectedOrder.customer_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedOrder.customer_email || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Telefone</p>
                  <p className="font-medium">{selectedOrder.customer_phone || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">CPF</p>
                  <p className="font-medium">{selectedOrder.customer_cpf || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-bold text-lg">R$ {Number(selectedOrder.total).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Asaas ID</p>
                  <p className="font-mono text-xs">{selectedOrder.asaas_payment_id || "—"}</p>
                </div>
                {selectedOrder.tracking_code && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Rastreio</p>
                    <p className="font-mono">{selectedOrder.tracking_code}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Itens</p>
                <div className="space-y-1">
                  {(selectedOrder.items as any[])?.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm bg-muted/50 rounded px-2 py-1">
                      <span>{item.quantity}x {item.name}</span>
                      <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Update */}
              <div className="border-t pt-4 space-y-3">
                <Label>Atualizar Status</Label>
                {selectedOrder.status === "paid" && (
                  <div className="space-y-2">
                    <Input
                      placeholder="Código de rastreio (opcional)"
                      value={trackingCode}
                      onChange={(e) => setTrackingCode(e.target.value)}
                    />
                    <Button
                      className="w-full"
                      onClick={() => handleUpdateStatus(selectedOrder.id, "shipped")}
                      disabled={updatingStatus}
                    >
                      <Truck className="h-4 w-4 mr-2" /> Marcar como Enviado
                    </Button>
                  </div>
                )}
                {selectedOrder.status === "shipped" && (
                  <Button
                    className="w-full"
                    onClick={() => handleUpdateStatus(selectedOrder.id, "delivered")}
                    disabled={updatingStatus}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" /> Marcar como Finalizado
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
