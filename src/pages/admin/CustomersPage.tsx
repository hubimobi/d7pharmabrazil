import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Users, RefreshCw, Phone, MessageSquare, Send, MoreHorizontal, Eye, Tag, Plus, X, Loader2 } from "lucide-react";
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
  tags: string[];
}

const GHL_FLOWS = [
  { id: "recompra-30", label: "Recompra 30 Dias", tag: "fluxo-recompra-30d" },
  { id: "recompra-60", label: "Recompra 60 Dias", tag: "fluxo-recompra-60d" },
  { id: "upsell", label: "UpSell", tag: "fluxo-upsell" },
];

const PRESET_TAGS = [
  "NOVO", "RECOMPRA", "INDICAÇÃO", "GOOGLE", "META", "TIKTOK", "UPSELL", "RECOMPRA 30D", "RECOMPRA 60D",
];

const TAG_COLORS: Record<string, string> = {
  "NOVO": "bg-green-100 text-green-800 border-green-200",
  "RECOMPRA": "bg-blue-100 text-blue-800 border-blue-200",
  "INDICAÇÃO": "bg-purple-100 text-purple-800 border-purple-200",
  "GOOGLE": "bg-red-100 text-red-800 border-red-200",
  "META": "bg-indigo-100 text-indigo-800 border-indigo-200",
  "TIKTOK": "bg-pink-100 text-pink-800 border-pink-200",
  "UPSELL": "bg-orange-100 text-orange-800 border-orange-200",
  "RECOMPRA 30D": "bg-cyan-100 text-cyan-800 border-cyan-200",
  "RECOMPRA 60D": "bg-teal-100 text-teal-800 border-teal-200",
};

function getTagColor(tag: string) {
  return TAG_COLORS[tag.toUpperCase()] || "bg-muted text-muted-foreground border-border";
}

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<AggregatedCustomer | null>(null);
  const [sendingFlow, setSendingFlow] = useState<string | null>(null);
  const [newTag, setNewTag] = useState("");
  const [addingTag, setAddingTag] = useState(false);
  const [syncingGhl, setSyncingGhl] = useState(false);
  const qc = useQueryClient();

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

  const { data: customerTags } = useQuery({
    queryKey: ["customer-tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_tags" as any)
        .select("*");
      if (error) throw error;
      return (data as unknown as { id: string; customer_email: string; tag: string }[]) || [];
    },
  });

  const customers = useMemo(() => {
    if (!orders) return [];
    const map = new Map<string, AggregatedCustomer>();
    const tagsMap = new Map<string, string[]>();

    // Build tags map
    (customerTags || []).forEach((ct) => {
      const existing = tagsMap.get(ct.customer_email) || [];
      existing.push(ct.tag);
      tagsMap.set(ct.customer_email, existing);
    });

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
          tags: [],
        });
      }
    }

    // Assign tags and auto-tags
    for (const [, customer] of map) {
      const autoTags: string[] = [];

      // Auto: product-based tags
      customer.items_bought.forEach((item) => {
        autoTags.push(item.toUpperCase().slice(0, 20));
      });

      // Auto: NOVO (single purchase)
      if (customer.orders_count === 1) autoTags.push("NOVO");
      // Auto: RECOMPRA (multiple purchases)
      if (customer.orders_count > 1) autoTags.push("RECOMPRA");

      const dbTags = customer.email ? (tagsMap.get(customer.email) || []) : [];
      const all = [...new Set([...dbTags, ...autoTags])];
      customer.tags = all;
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.last_order_date).getTime() - new Date(a.last_order_date).getTime()
    );
  }, [orders, customerTags]);

  const filtered = customers.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(s) ||
      c.email.toLowerCase().includes(s) ||
      c.phone?.includes(s) ||
      c.cpf?.includes(s) ||
      c.tags.some((t) => t.toLowerCase().includes(s))
    );
  });

  const handleAddTag = async (customer: AggregatedCustomer, tag: string) => {
    if (!customer.email) {
      toast.error("Cliente sem email cadastrado");
      return;
    }
    setAddingTag(true);
    try {
      // Save to DB
      const { error } = await supabase
        .from("customer_tags" as any)
        .insert({ customer_email: customer.email, tag: tag.toUpperCase().trim() } as any);
      if (error) {
        if (error.code === "23505") {
          toast.info("Tag já existe para este cliente");
          setAddingTag(false);
          return;
        }
        throw error;
      }

      // Sync to GHL
      try {
        await supabase.functions.invoke("ghl-sync", {
          body: {
            action: "add_tags",
            customer_name: customer.name,
            customer_email: customer.email,
            customer_phone: customer.phone || "",
            tags: [tag.toLowerCase().replace(/\s+/g, "-"), "cliente-loja-online"],
          },
        });
      } catch (e) {
        console.warn("GHL tag sync failed (non-fatal):", e);
      }

      qc.invalidateQueries({ queryKey: ["customer-tags"] });
      toast.success(`Tag "${tag}" adicionada e sincronizada com GHL!`);
      setNewTag("");
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setAddingTag(false);
    }
  };

  const handleRemoveTag = async (customer: AggregatedCustomer, tag: string) => {
    if (!customer.email) return;
    try {
      const { error } = await supabase
        .from("customer_tags" as any)
        .delete()
        .eq("customer_email", customer.email)
        .eq("tag", tag);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["customer-tags"] });
      toast.success(`Tag "${tag}" removida`);
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

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

      // Also save the flow tag to customer_tags
      await supabase
        .from("customer_tags" as any)
        .insert({ customer_email: customer.email, tag: flow.label.toUpperCase() } as any)
        .select();

      qc.invalidateQueries({ queryKey: ["customer-tags"] });
      toast.success(`Cliente enviado para fluxo "${flow.label}"!`);
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setSendingFlow(null);
    }
  };

  const handleSyncAll = async (customer: AggregatedCustomer, service: "ghl" | "asaas" | "bling") => {
    if (!customer.email && !customer.name) {
      toast.error("Cliente sem dados suficientes");
      return;
    }
    setSyncingGhl(true);
    try {
      if (service === "ghl") {
        const tags = customer.tags.map((t) => t.toLowerCase().replace(/\s+/g, "-"));
        const { error } = await supabase.functions.invoke("ghl-sync", {
          body: {
            action: "contact_and_opportunity",
            customer_name: customer.name,
            customer_email: customer.email,
            customer_phone: customer.phone || "",
            tags: [...tags, "cliente-loja-online"],
          },
        });
        if (error) throw error;
        toast.success("Dados sincronizados com GHL!");
      } else if (service === "asaas") {
        toast.info("Sincronização Asaas: os dados do cliente são sincronizados automaticamente ao gerar pagamento.");
      } else if (service === "bling") {
        toast.info("Sincronização Bling: os dados são sincronizados automaticamente ao confirmar pedido.");
      }
    } catch (err: any) {
      toast.error(`Erro ao sincronizar: ${err.message}`);
    } finally {
      setSyncingGhl(false);
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

  // Available tags for adding (preset + product-based not yet assigned)
  const getAvailableTags = (customer: AggregatedCustomer) => {
    const dbTags = (customerTags || [])
      .filter((ct) => ct.customer_email === customer.email)
      .map((ct) => ct.tag);
    return PRESET_TAGS.filter((t) => !dbTags.includes(t));
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
                  <p className="text-xs font-medium tracking-wider text-muted-foreground">{card.title}</p>
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
          placeholder="Buscar por nome, email, telefone, CPF ou tag..."
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
                <TableHead>Tags</TableHead>
                <TableHead>Pedidos</TableHead>
                <TableHead>Total Gasto</TableHead>
                <TableHead className="hidden md:table-cell">Última Compra</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {customer.tags.slice(0, 3).map((tag, i) => (
                          <span
                            key={i}
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getTagColor(tag)}`}
                          >
                            {tag}
                          </span>
                        ))}
                        {customer.tags.length > 3 && (
                          <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            +{customer.tags.length - 3}
                          </span>
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
                        <Button variant="ghost" size="icon" title="Ver detalhes" onClick={() => setSelectedCustomer(customer)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="WhatsApp" onClick={() => openWhatsApp(customer.phone, customer.name)}>
                          <MessageSquare className="h-4 w-4 text-green-600" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" title="Mais ações">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => callPhone(customer.phone)}>
                              <Phone className="h-4 w-4 mr-2" /> Ligar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {GHL_FLOWS.map((flow) => (
                              <DropdownMenuItem
                                key={flow.id}
                                onClick={() => handleSendToFlow(customer, flow)}
                                disabled={sendingFlow === flow.id}
                              >
                                <Send className="h-4 w-4 mr-2" /> {flow.label}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleSyncAll(customer, "ghl")}>
                              <RefreshCw className="h-4 w-4 mr-2" /> Sincronizar GHL
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSyncAll(customer, "asaas")}>
                              <RefreshCw className="h-4 w-4 mr-2" /> Sincronizar Asaas
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSyncAll(customer, "bling")}>
                              <RefreshCw className="h-4 w-4 mr-2" /> Sincronizar Bling
                            </DropdownMenuItem>
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
      <Dialog open={!!selectedCustomer} onOpenChange={() => { setSelectedCustomer(null); setNewTag(""); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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

              {/* Tags Section */}
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Tags</p>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {selectedCustomer.tags.map((tag, i) => {
                    const isDbTag = (customerTags || []).some(
                      (ct) => ct.customer_email === selectedCustomer.email && ct.tag === tag
                    );
                    return (
                      <span
                        key={i}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${getTagColor(tag)}`}
                      >
                        {tag}
                        {isDbTag && (
                          <button
                            onClick={() => handleRemoveTag(selectedCustomer, tag)}
                            className="hover:opacity-70 ml-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </span>
                    );
                  })}
                </div>

                {/* Add tag */}
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Nova tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="h-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newTag.trim()) {
                        handleAddTag(selectedCustomer, newTag.trim());
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    disabled={!newTag.trim() || addingTag}
                    onClick={() => handleAddTag(selectedCustomer, newTag.trim())}
                  >
                    {addingTag ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  </Button>
                </div>

                {/* Preset tags quick-add */}
                <div className="flex flex-wrap gap-1">
                  {getAvailableTags(selectedCustomer).map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleAddTag(selectedCustomer, tag)}
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold opacity-50 hover:opacity-100 transition-opacity cursor-pointer ${getTagColor(tag)}`}
                      disabled={addingTag}
                    >
                      <Plus className="h-2.5 w-2.5 mr-0.5" /> {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Products */}
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
              <div className="border-t pt-4 space-y-3">
                <p className="text-sm font-medium">Enviar para Fluxo</p>
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

                {/* Sync buttons */}
                <p className="text-sm font-medium pt-2">Sincronizar Dados</p>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSyncAll(selectedCustomer, "ghl")}
                    disabled={syncingGhl}
                  >
                    {syncingGhl ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                    GHL
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSyncAll(selectedCustomer, "asaas")}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" /> Asaas
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSyncAll(selectedCustomer, "bling")}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" /> Bling
                  </Button>
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
