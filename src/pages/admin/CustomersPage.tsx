import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Users, RefreshCw, Phone, MessageSquare, Send, MoreHorizontal, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface AggregatedCustomer {
  email: string;
  name: string;
  phone: string | null;
  cpf: string | null;
  orders_count: number;
  total_spent: number;
  last_order_date: string;
  first_order_date: string;
  items_bought: string[];
}

const GHL_FLOWS = [
  { id: "recompra-30", label: "Recompra 30 Dias", tag: "fluxo-recompra-30d" },
  { id: "recompra-60", label: "Recompra 60 Dias", tag: "fluxo-recompra-60d" },
  { id: "upsell", label: "UpSell", tag: "fluxo-upsell" },
];

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<AggregatedCustomer | null>(null);
  const [sendingFlow, setSendingFlow] = useState<string | null>(null);

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ["admin-all-orders-customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const customers = useMemo(() => {
    if (!orders) return [];
    const map = new Map<string, AggregatedCustomer>();

    for (const order of orders) {
      const key = order.customer_email || order.customer_cpf || order.customer_phone || order.id;
      const existing = map.get(key);
      const items = (order.items as any[]) || [];
      const itemNames = items.map((i: any) => i.name).filter(Boolean);

      if (existing) {
        existing.orders_count += 1;
        existing.total_spent += Number(order.total);
        if (order.created_at > existing.last_order_date) {
          existing.last_order_date = order.created_at;
          existing.name = order.customer_name || existing.name;
          existing.phone = order.customer_phone || existing.phone;
        }
        if (order.created_at < existing.first_order_date) {
          existing.first_order_date = order.created_at;
        }
        itemNames.forEach((n: string) => {
          if (!existing.items_bought.includes(n)) existing.items_bought.push(n);
        });
      } else {
        map.set(key, {
          email: order.customer_email || "",
          name: order.customer_name || "Sem nome",
          phone: order.customer_phone,
          cpf: order.customer_cpf,
          orders_count: 1,
          total_spent: Number(order.total),
          last_order_date: order.created_at,
          first_order_date: order.created_at,
          items_bought: itemNames,
        });
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.last_order_date).getTime() - new Date(a.last_order_date).getTime()
    );
  }, [orders]);

  const filtered = customers.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(s) ||
      c.email.toLowerCase().includes(s) ||
      c.phone?.includes(s) ||
      c.cpf?.includes(s)
    );
  });

  const handleSendToFlow = async (customer: AggregatedCustomer, flow: typeof GHL_FLOWS[0]) => {
    if (!customer.email) {
      toast.error("Cliente sem email cadastrado");
      return;
    }
    setSendingFlow(flow.id);
    try {
      const { data, error } = await supabase.functions.invoke("ghl-sync", {
        body: {
          action: "add_tags",
          customer_name: customer.name,
          customer_email: customer.email,
          customer_phone: customer.phone || "",
          tags: [flow.tag, "cliente-loja-online"],
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Cliente enviado para fluxo "${flow.label}"!`);
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setSendingFlow(null);
    }
  };

  const openWhatsApp = (phone: string | null, name: string) => {
    if (!phone) {
      toast.error("Cliente sem telefone cadastrado");
      return;
    }
    const clean = phone.replace(/\D/g, "");
    const num = clean.startsWith("55") ? clean : `55${clean}`;
    window.open(
      `https://wa.me/${num}?text=${encodeURIComponent(`Olá ${name}! Tudo bem?`)}`,
      "_blank"
    );
  };

  const callPhone = (phone: string | null) => {
    if (!phone) {
      toast.error("Cliente sem telefone cadastrado");
      return;
    }
    window.open(`tel:${phone}`, "_self");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold">Clientes</h2>
          <p className="text-sm text-muted-foreground mt-1">Base de clientes e ações de relacionamento</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        {[
          { title: "TOTAL CLIENTES", value: customers.length, icon: Users, iconBg: "bg-primary/10", iconColor: "text-primary" },
          { title: "RECORRENTES", value: customers.filter((c) => c.orders_count > 1).length, icon: Users, iconBg: "bg-green-500/10", iconColor: "text-green-600" },
          { title: "COM EMAIL", value: customers.filter((c) => c.email).length, icon: Users, iconBg: "bg-blue-500/10", iconColor: "text-blue-600" },
        ].map((card) => (
          <Card key={card.title} className="relative overflow-hidden border border-border/50">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-[11px] font-medium tracking-wider text-muted-foreground">{card.title}</p>
                  <p className="text-2xl font-bold text-foreground">{card.value}</p>
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, email, telefone ou CPF..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Customers Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Pedidos</TableHead>
                <TableHead>Total Gasto</TableHead>
                <TableHead className="hidden md:table-cell">Última Compra</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum cliente encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((customer, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">{customer.email || "Sem email"}</p>
                        {customer.phone && (
                          <p className="text-xs text-muted-foreground">{customer.phone}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={customer.orders_count > 1 ? "default" : "secondary"}>
                        {customer.orders_count}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">
                      R$ {customer.total_spent.toFixed(2)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {format(new Date(customer.last_order_date), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Ver detalhes"
                          onClick={() => setSelectedCustomer(customer)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="WhatsApp"
                          onClick={() => openWhatsApp(customer.phone, customer.name)}
                        >
                          <MessageSquare className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Ligar"
                          onClick={() => callPhone(customer.phone)}
                        >
                          <Phone className="h-4 w-4 text-blue-600" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" title="Enviar para fluxo">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {GHL_FLOWS.map((flow) => (
                              <DropdownMenuItem
                                key={flow.id}
                                onClick={() => handleSendToFlow(customer, flow)}
                                disabled={sendingFlow === flow.id}
                              >
                                <Send className="h-4 w-4 mr-2" />
                                {flow.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Customer Detail Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedCustomer?.name}</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedCustomer.email || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Telefone</p>
                  <p className="font-medium">{selectedCustomer.phone || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">CPF</p>
                  <p className="font-medium">{selectedCustomer.cpf || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Pedidos</p>
                  <p className="font-bold">{selectedCustomer.orders_count}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Gasto</p>
                  <p className="font-bold text-lg">R$ {selectedCustomer.total_spent.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Primeira Compra</p>
                  <p>{format(new Date(selectedCustomer.first_order_date), "dd/MM/yyyy")}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Produtos Comprados</p>
                <div className="flex flex-wrap gap-1">
                  {selectedCustomer.items_bought.map((item, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="border-t pt-4 space-y-2">
                <p className="text-sm font-medium mb-2">Enviar para Fluxo</p>
                <div className="grid grid-cols-1 gap-2">
                  {GHL_FLOWS.map((flow) => (
                    <Button
                      key={flow.id}
                      variant="outline"
                      className="justify-start"
                      onClick={() => handleSendToFlow(selectedCustomer, flow)}
                      disabled={sendingFlow === flow.id}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {sendingFlow === flow.id ? "Enviando..." : flow.label}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="default"
                    className="flex-1"
                    onClick={() => openWhatsApp(selectedCustomer.phone, selectedCustomer.name)}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" /> WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => callPhone(selectedCustomer.phone)}
                  >
                    <Phone className="h-4 w-4 mr-2" /> Ligar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
