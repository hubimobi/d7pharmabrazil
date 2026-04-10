import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { CheckCircle, Package, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { trackPurchase } from "@/lib/tracking";

interface OrderData {
  id: string;
  customer_name: string;
  customer_email: string | null;
  items: any[];
  total: number;
  status: string;
  shipping_address: any;
  created_at: string;
}

export default function OrderConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    const fetchOrder = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-order", {
          body: { order_id: orderId, customer_email: localStorage.getItem("checkout_email") || undefined },
        });
        if (error) throw error;
        if (data?.order) {
          setOrder(data.order as any);
          const o = data.order as any;
          trackPurchase({
            id: o.id,
            total: Number(o.total),
            items: (o.items as any[]).map((item: any) => ({
              id: item.product_id || item.name,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
            })),
          });
        }
      } catch {
        console.error("Failed to fetch order");
      }
      setLoading(false);
    };
    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container max-w-2xl py-16 text-center">
          <p className="text-muted-foreground">Carregando...</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container max-w-2xl py-12 space-y-8">
        {/* Success Header */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold">Venda Confirmada!</h1>
          <p className="text-lg text-muted-foreground">
            Seu pedido está sendo preparado para envio 🚀
          </p>
          {order && (
            <p className="text-sm text-muted-foreground">
              Pedido: <span className="font-mono font-bold">{order.id.slice(0, 8).toUpperCase()}</span>
            </p>
          )}
        </div>

        {order && (
          <>
            {/* Order Items */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 text-foreground">
                  <Package className="h-5 w-5" />
                  <h2 className="font-semibold text-lg">Itens do Pedido</h2>
                </div>
                <div className="divide-y divide-border">
                  {(order.items as any[]).map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between py-3">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">Qtd: {item.quantity}</p>
                      </div>
                      <p className="font-semibold">
                        R$ {(item.price * item.quantity).toFixed(2).replace(".", ",")}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between border-t border-border pt-3">
                  <span className="font-bold text-lg">Total</span>
                  <span className="font-bold text-lg text-primary">
                    R$ {Number(order.total).toFixed(2).replace(".", ",")}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Address */}
            {order.shipping_address && Object.keys(order.shipping_address).length > 0 && (
              <Card>
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center gap-2 text-foreground">
                    <MapPin className="h-5 w-5" />
                    <h2 className="font-semibold text-lg">Endereço de Entrega</h2>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>{order.shipping_address.street}, {order.shipping_address.number}</p>
                    {order.shipping_address.complement && <p>{order.shipping_address.complement}</p>}
                    <p>{order.shipping_address.neighborhood}</p>
                    <p>{order.shipping_address.city} - {order.shipping_address.state}</p>
                    <p>CEP: {order.shipping_address.cep}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Status Timeline */}
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold text-lg mb-4">Status do Pedido</h2>
                <OrderTimeline status={order.status} />
              </CardContent>
            </Card>
          </>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/acompanhar-pedido">
            <Button variant="outline" className="w-full sm:w-auto gap-2">
              <Package className="h-4 w-4" />
              Acompanhar Pedido
            </Button>
          </Link>
          <Link to="/produtos">
            <Button className="w-full sm:w-auto gap-2">
              Continuar Comprando
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}

const statusSteps = [
  { key: "pending", label: "Pendente" },
  { key: "paid", label: "Pago" },
  { key: "preparing", label: "Preparando" },
  { key: "shipped", label: "Enviado" },
  { key: "delivered", label: "Entregue" },
];

function OrderTimeline({ status }: { status: string }) {
  const currentIdx = statusSteps.findIndex((s) => s.key === status);
  const activeIdx = currentIdx === -1 ? 0 : currentIdx;

  return (
    <div className="flex items-center justify-between">
      {statusSteps.map((step, idx) => (
        <div key={step.key} className="flex flex-col items-center flex-1">
          <div
            className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
              idx <= activeIdx
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {idx <= activeIdx ? "✓" : idx + 1}
          </div>
          <span className={`text-xs mt-1 text-center ${idx <= activeIdx ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
            {step.label}
          </span>
          {idx < statusSteps.length - 1 && (
            <div className="hidden" />
          )}
        </div>
      ))}
    </div>
  );
}
