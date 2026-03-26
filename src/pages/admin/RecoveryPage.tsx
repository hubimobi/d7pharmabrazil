import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, RefreshCw, Send, ShoppingCart, Clock, CheckCircle, XCircle, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

interface AbandonedCart {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  items: { name: string; quantity: number; price: number }[];
  cart_total: number;
  status: string;
  ghl_synced: boolean;
  created_at: string;
  recovered_at: string | null;
}

export default function RecoveryPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [syncing, setSyncing] = useState<string | null>(null);

  const { data: carts, isLoading } = useQuery({
    queryKey: ["abandoned-carts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("abandoned_carts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AbandonedCart[];
    },
  });

  const triggerGHL = useMutation({
    mutationFn: async (cart: AbandonedCart) => {
      setSyncing(cart.id);
      const { data, error } = await supabase.functions.invoke("ghl-sync", {
        body: {
          customer_name: cart.customer_name,
          customer_email: cart.customer_email || "",
          customer_phone: cart.customer_phone,
          order_total: cart.cart_total,
          items: cart.items,
          tags: ["carrinho-abandonado", "recuperacao-ativa"],
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await supabase
        .from("abandoned_carts")
        .update({ ghl_synced: true } as any)
        .eq("id", cart.id);

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["abandoned-carts"] });
      toast.success("Workflow de recuperação ativado no GHL!");
      setSyncing(null);
    },
    onError: (err: any) => {
      toast.error(`Erro ao sincronizar com GHL: ${err?.message}`);
      setSyncing(null);
    },
  });

  const markRecovered = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("abandoned_carts")
        .update({ status: "recovered", recovered_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["abandoned-carts"] });
      toast.success("Carrinho marcado como recuperado!");
    },
  });

  const openWhatsApp = (cart: AbandonedCart) => {
    let phone = (cart.customer_phone || "").replace(/\D/g, "");
    if (!phone) return;
    if (!phone.startsWith("55")) {
      phone = "55" + phone;
    }

    const profileName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Equipe";
    const productNames = cart.items.map((i) => i.name).join(", ");
    const firstName = cart.customer_name.split(" ")[0] || "Cliente";

    const message = `Olá ${firstName}! Sou o ${profileName} da D7Pharma Brasil! Vi que você foi até o carrinho de compra do produto "${productNames}"! Ficou alguma dúvida que eu possa te ajudar?`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const calcItemsTotal = (items: { name: string; quantity: number; price: number }[]) => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const fmt = (v: number) => `R$ ${Number(v).toFixed(2).replace(".", ",")}`;

  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive"; icon: any }> = {
    abandoned: { label: "Abandonado", variant: "destructive", icon: XCircle },
    recovered: { label: "Recuperado", variant: "default", icon: CheckCircle },
    pending: { label: "Pendente", variant: "secondary", icon: Clock },
  };

  const abandonedCount = carts?.filter((c) => c.status === "abandoned").length ?? 0;
  const recoveredCount = carts?.filter((c) => c.status === "recovered").length ?? 0;
  const totalLost = carts?.filter((c) => c.status === "abandoned").reduce((s, c) => {
    const itemsTotal = calcItemsTotal(c.items);
    return s + (itemsTotal > 0 ? itemsTotal : c.cart_total);
  }, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Recuperação de Pedidos</h2>
          <p className="text-sm text-muted-foreground">Gerencie carrinhos abandonados e recupere vendas</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <ShoppingCart className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Abandonados</p>
              <p className="text-2xl font-bold">{abandonedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Recuperados</p>
              <p className="text-2xl font-bold">{recoveredCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor Perdido</p>
              <p className="text-2xl font-bold">{fmt(totalLost)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden md:table-cell">Produtos</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead className="hidden sm:table-cell">Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">GHL</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Carregando...</TableCell>
                </TableRow>
              ) : !carts?.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Nenhum carrinho abandonado registrado
                  </TableCell>
                </TableRow>
              ) : (
                carts.map((cart) => {
                  const sc = statusConfig[cart.status] || statusConfig.abandoned;
                  const StatusIcon = sc.icon;
                  const hasPhone = !!(cart.customer_phone || "").replace(/\D/g, "");
                  const itemsTotal = calcItemsTotal(cart.items);
                  const displayTotal = itemsTotal > 0 ? itemsTotal : cart.cart_total;
                  const cartData = cart as any;
                  const shippingCep = cartData.shipping_cep || null;

                  return (
                    <TableRow key={cart.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{cart.customer_name || "—"}</p>
                          {cart.customer_phone && (
                            <p className="text-xs text-muted-foreground">{cart.customer_phone}</p>
                          )}
                          {cart.customer_email && (
                            <p className="text-xs text-muted-foreground">{cart.customer_email}</p>
                          )}
                          {shippingCep && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" /> CEP: {shippingCep}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="max-w-[200px]">
                          {cart.items.map((item, i) => (
                            <p key={i} className="text-xs text-muted-foreground truncate">
                              {item.quantity}x {item.name} — {fmt(item.price * item.quantity)}
                            </p>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{fmt(displayTotal)}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                        {format(new Date(cart.created_at), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={sc.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {sc.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {cart.ghl_synced ? (
                          <Badge variant="secondary" className="text-xs">Enviado</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {cart.status === "abandoned" && !cart.ghl_synced && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-xs"
                              disabled={syncing === cart.id}
                              onClick={() => triggerGHL.mutate(cart)}
                            >
                              <Send className="h-3 w-3" />
                              {syncing === cart.id ? "Enviando..." : "Recuperar GHL"}
                            </Button>
                          )}

                          {hasPhone && cart.status === "abandoned" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-xs text-success hover:text-success"
                              onClick={() => openWhatsApp(cart)}
                            >
                              <MessageCircle className="h-3 w-3" />
                              Falar com Cliente
                            </Button>
                          )}

                          {cart.status === "abandoned" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-xs"
                              onClick={() => markRecovered.mutate(cart.id)}
                            >
                              <RefreshCw className="h-3 w-3" />
                              Recuperado
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
    </div>
  );
}
