import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RefreshCw, Eye, Package, Search, DollarSign, Truck, CheckCircle, UserPlus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "outline" },
  paid: { label: "Pago", variant: "default" },
  shipped: { label: "Enviado", variant: "secondary" },
  delivered: { label: "Finalizado", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
  refunded: { label: "Devolvido", variant: "destructive" },
};

const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [trackingCode, setTrackingCode] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [linkDoctorDialog, setLinkDoctorDialog] = useState<any>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [refundDialog, setRefundDialog] = useState<any>(null);

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

  const { data: doctors } = useQuery({
    queryKey: ["doctors-list-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("doctors").select("id, name, crm, representative_id").eq("active", true).order("name");
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

  // Totals
  const totalAll = useMemo(() => (orders || []).reduce((s, o) => s + Number(o.total), 0), [orders]);
  const totalPaid = useMemo(() => (orders || []).filter(o => o.status === "paid" || o.status === "shipped" || o.status === "delivered").reduce((s, o) => s + Number(o.total), 0), [orders]);

  const handleSyncBling = async (orderId: string, force = false) => {
    const order = orders?.find(o => o.id === orderId);
    if (order && !force && (order.status === "pending" || order.status === "cancelled")) {
      const confirmed = window.confirm(
        `Este pedido está com status "${order.status === "pending" ? "Pendente" : "Cancelado"}". Deseja forçar a sincronização com o Bling mesmo assim?`
      );
      if (!confirmed) return;
      return handleSyncBling(orderId, true);
    }
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
    for (let i = 0; i < syncableOrders.length; i++) {
      const order = syncableOrders[i];
      try {
        const { data, error } = await supabase.functions.invoke("bling-sync-order", {
          body: { order_id: order.id },
        });
        if (error || data?.error) { fail++; } else { success++; }
      } catch { fail++; }
      if (i < syncableOrders.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
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

  const handleLinkDoctor = async () => {
    if (!linkDoctorDialog || !selectedDoctorId) return;
    try {
      const { error } = await supabase
        .from("orders")
        .update({ doctor_id: selectedDoctorId })
        .eq("id", linkDoctorDialog.id);
      if (error) throw error;
      toast.success("Prescritor vinculado ao pedido!");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      setLinkDoctorDialog(null);
      setSelectedDoctorId("");
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  const handleRefund = async () => {
    if (!refundDialog) return;
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "refunded" })
        .eq("id", refundDialog.id);
      if (error) throw error;
      toast.success("Pedido marcado como devolvido!");
      refetch();
      setRefundDialog(null);
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
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
        <div>
          <h2 className="text-2xl font-bold">Vendas</h2>
          <p className="text-sm text-muted-foreground mt-1">Gerencie e acompanhe todos os pedidos da loja</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleSyncAll} disabled={syncingAll}>
            {syncingAll ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            <span className="hidden sm:inline">{syncingAll ? "Sincronizando..." : "Sincronizar Tudo (Bling)"}</span>
            <span className="sm:hidden">{syncingAll ? "Sync..." : "Sync Bling"}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { title: "TOTAL PEDIDOS", value: stats.total, sub: fmt(totalAll), icon: DollarSign, iconBg: "bg-primary/10", iconColor: "text-primary" },
          { title: "PAGOS", value: stats.paid, sub: fmt(totalPaid), icon: CheckCircle, iconBg: "bg-green-500/10", iconColor: "text-green-600" },
          { title: "ENVIADOS", value: stats.shipped, icon: Truck, iconBg: "bg-blue-500/10", iconColor: "text-blue-600" },
          { title: "FINALIZADOS", value: stats.delivered, icon: Package, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-600" },
        ].map((card) => (
          <Card key={card.title} className="relative overflow-hidden border border-border/50">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium tracking-wider text-muted-foreground">{card.title}</p>
                  <p className="text-2xl font-bold text-foreground">{card.value}</p>
                  {"sub" in card && card.sub && (
                    <p className="text-sm font-semibold text-muted-foreground">{card.sub}</p>
                  )}
                </div>
                <div className={`h-12 w-12 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                  <card.icon className={`h-6 w-6 ${card.iconColor}`} />
                </div>
              </div>
              <card.icon className={`absolute -bottom-3 -right-3 h-24 w-24 ${card.iconColor} opacity-[0.04]`} />
            </CardContent>
          </Card>
        ))}
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
            <SelectItem value="refunded">Devolvido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden md:table-cell">Fatura Asaas</TableHead>
                <TableHead className="hidden md:table-cell">Pedido Bling</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="hidden lg:table-cell">Cupom</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Data</TableHead>
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
                      <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">
                        {order.asaas_payment_id || "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">
                        {(order as any).bling_order_id || "—"}
                      </TableCell>
                      <TableCell className="font-semibold">
                        R$ {Number(order.total).toFixed(2)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {order.coupon_code ? (
                          <Badge variant="secondary" className="text-xs">{order.coupon_code}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
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
                          {!order.doctor_id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Vincular Prescritor"
                              onClick={() => { setLinkDoctorDialog(order); setSelectedDoctorId(""); }}
                            >
                              <UserPlus className="h-4 w-4 text-blue-600" />
                            </Button>
                          )}
                          {order.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Marcar como Pago"
                              onClick={async () => {
                                if (!window.confirm("Marcar este pedido como pago manualmente?")) return;
                                try {
                                  const { error } = await supabase
                                    .from("orders")
                                    .update({ status: "paid" })
                                    .eq("id", order.id);
                                  if (error) throw error;
                                  toast.success("Pedido marcado como pago!");
                                  refetch();
                                  handleSyncBling(order.id, true);
                                } catch (err: any) {
                                  toast.error(`Erro: ${err.message}`);
                                }
                              }}
                            >
                              <DollarSign className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
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
                <div>
                  <p className="text-muted-foreground">Cupom</p>
                  <p className="font-medium">{selectedOrder.coupon_code || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Prescritor</p>
                  <p className="font-medium">
                    {selectedOrder.doctor_id
                      ? doctors?.find(d => d.id === selectedOrder.doctor_id)?.name || selectedOrder.doctor_id.slice(0, 8)
                      : "—"}
                  </p>
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

              {/* Actions */}
              <div className="border-t pt-4 space-y-3">
                {/* Link to prescriber */}
                {!selectedOrder.doctor_id && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => { setLinkDoctorDialog(selectedOrder); setSelectedDoctorId(""); setSelectedOrder(null); }}
                  >
                    <UserPlus className="h-4 w-4 mr-2" /> Vincular Prescritor
                  </Button>
                )}

                {/* Status Update */}
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

                {/* Refund button */}
                {["paid", "shipped", "delivered"].includes(selectedOrder.status) && (
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => { setRefundDialog(selectedOrder); setSelectedOrder(null); }}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" /> Devolução
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Link Doctor Dialog */}
      <Dialog open={!!linkDoctorDialog} onOpenChange={() => setLinkDoctorDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular Prescritor ao Pedido</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Pedido <strong>#{linkDoctorDialog?.id?.slice(0, 8)}</strong> — {linkDoctorDialog?.customer_name}
          </p>
          <div className="space-y-2">
            <Label>Prescritor</Label>
            <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
              <SelectTrigger><SelectValue placeholder="Selecione um prescritor..." /></SelectTrigger>
              <SelectContent>
                {doctors?.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} {d.crm ? `(${d.crm})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDoctorDialog(null)}>Cancelar</Button>
            <Button onClick={handleLinkDoctor} disabled={!selectedDoctorId}>Vincular</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={!!refundDialog} onOpenChange={() => setRefundDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Devolução</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Deseja marcar o pedido <strong>#{refundDialog?.id?.slice(0, 8)}</strong> de <strong>{refundDialog?.customer_name}</strong> ({fmt(Number(refundDialog?.total || 0))}) como devolvido?
          </p>
          <p className="text-xs text-destructive">Esta ação alterará o status do pedido para "Devolvido".</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDialog(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRefund}>Confirmar Devolução</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
