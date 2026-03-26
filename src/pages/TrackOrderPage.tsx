import { useState } from "react";
import { Search, Package, MapPin, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const statusSteps = [
  { key: "pending", label: "Pendente", icon: Package },
  { key: "paid", label: "Pago", icon: Package },
  { key: "preparing", label: "Preparando", icon: Package },
  { key: "shipped", label: "Enviado", icon: Truck },
  { key: "delivered", label: "Entregue", icon: MapPin },
];

interface OrderResult {
  id: string;
  customer_name: string;
  items: any[];
  total: number;
  status: string;
  shipping_address: any;
  tracking_code: string | null;
  created_at: string;
}

export default function TrackOrderPage() {
  const [email, setEmail] = useState("");
  const [orderCode, setOrderCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<OrderResult | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !orderCode.trim()) {
      toast.error("Preencha o email e o código do pedido.");
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const { data, error } = await supabase.functions.invoke("track-order", {
        body: { email: email.trim().toLowerCase(), order_code: orderCode.trim() },
      });

      if (error) throw error;
      const result = data?.order || null;
      setOrder(result as any);
      if (!result) toast.error("Pedido não encontrado. Verifique os dados.");
    } catch {
      toast.error("Erro ao buscar pedido.");
    } finally {
      setLoading(false);
    }
  };

  const currentIdx = order ? statusSteps.findIndex((s) => s.key === order.status) : -1;
  const activeIdx = currentIdx === -1 ? 0 : currentIdx;

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container max-w-2xl py-12 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Acompanhar Pedido</h1>
          <p className="text-muted-foreground">
            Digite seu email e o código do pedido para verificar o status
          </p>
        </div>

        {/* Search Form */}
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email usado na compra</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orderCode">Código do Pedido (primeiros 8 caracteres)</Label>
                <Input
                  id="orderCode"
                  placeholder="Ex: a1b2c3d4"
                  value={orderCode}
                  onChange={(e) => setOrderCode(e.target.value)}
                  maxLength={8}
                />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={loading}>
                <Search className="h-4 w-4" />
                {loading ? "Buscando..." : "Buscar Pedido"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Order Result */}
        {searched && order && (
          <div className="space-y-6">
            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status do Pedido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  {statusSteps.map((step, idx) => {
                    const Icon = step.icon;
                    return (
                      <div key={step.key} className="flex flex-col items-center flex-1">
                        <div
                          className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            idx <= activeIdx
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <span
                          className={`text-xs mt-2 text-center ${
                            idx <= activeIdx ? "font-semibold text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {order.tracking_code && (
                  <div className="rounded-md bg-muted p-3 text-sm">
                    <span className="font-medium">Código de Rastreio:</span>{" "}
                    <span className="font-mono">{order.tracking_code}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Detalhes do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Pedido: <span className="font-mono font-bold">{order.id.slice(0, 8).toUpperCase()}</span>
                  {" · "}
                  {new Date(order.created_at).toLocaleDateString("pt-BR")}
                </p>
                <div className="divide-y divide-border">
                  {(order.items as any[]).map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between py-2">
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p>
                      </div>
                      <p className="font-semibold text-sm">
                        R$ {(item.price * item.quantity).toFixed(2).replace(".", ",")}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between border-t border-border pt-3">
                  <span className="font-bold">Total</span>
                  <span className="font-bold text-primary">
                    R$ {Number(order.total).toFixed(2).replace(".", ",")}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Address */}
            {order.shipping_address && Object.keys(order.shipping_address).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Endereço de Entrega
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-1">
                  <p>{order.shipping_address.street}, {order.shipping_address.number}</p>
                  {order.shipping_address.complement && <p>{order.shipping_address.complement}</p>}
                  <p>{order.shipping_address.neighborhood}</p>
                  <p>{order.shipping_address.city} - {order.shipping_address.state}</p>
                  <p>CEP: {order.shipping_address.cep}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {searched && !order && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum pedido encontrado com esses dados.</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
