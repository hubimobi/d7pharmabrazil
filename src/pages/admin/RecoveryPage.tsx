import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MessageCircle, RefreshCw, Send, ShoppingCart, Clock, CheckCircle, XCircle,
  MapPin, Bot, ChevronRight, Eye, ArrowRight, Grip, Phone, Mail, LayoutGrid, List
} from "lucide-react";
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
  shipping_cep?: string | null;
  recovery_stage: string;
  ai_agent_active: boolean;
  ai_contact_count: number;
  last_contact_at: string | null;
  recovery_notes: string | null;
  assigned_agent_id: string | null;
}

const PIPELINE_STAGES = [
  { id: "novo", label: "Novo", color: "bg-blue-500", icon: ShoppingCart, description: "Carrinho abandonado recém-criado" },
  { id: "contato_1", label: "1º Contato", color: "bg-yellow-500", icon: Phone, description: "Primeira tentativa de contato" },
  { id: "em_negociacao", label: "Em Negociação", color: "bg-orange-500", icon: MessageCircle, description: "Cliente respondeu, em negociação" },
  { id: "proposta", label: "Proposta Enviada", color: "bg-purple-500", icon: Send, description: "Proposta ou cupom enviado" },
  { id: "convertido", label: "Convertido", color: "bg-green-500", icon: CheckCircle, description: "Venda realizada" },
  { id: "perdido", label: "Perdido", color: "bg-red-500", icon: XCircle, description: "Cliente desistiu" },
];

export default function RecoveryPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [syncing, setSyncing] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"pipeline" | "table">("pipeline");
  const [selectedCart, setSelectedCart] = useState<AbandonedCart | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [noteText, setNoteText] = useState("");

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

  const { data: agents } = useQuery({
    queryKey: ["ai-agents-recovery"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_agents")
        .select("id, name, icon, color, slug")
        .eq("active", true);
      if (error) throw error;
      return data ?? [];
    },
  });

  const recoveryAgent = agents?.find(a => a.slug === "recuperacao-venda") || agents?.[0];

  const updateStage = useMutation({
    mutationFn: async ({ id, stage, notes }: { id: string; stage: string; notes?: string }) => {
      const update: any = { recovery_stage: stage };
      if (stage === "convertido") {
        update.status = "recovered";
        update.recovered_at = new Date().toISOString();
        update.ai_agent_active = false;
      } else if (stage === "perdido") {
        update.ai_agent_active = false;
      }
      if (notes) update.recovery_notes = notes;
      
      const { error } = await supabase.from("abandoned_carts").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["abandoned-carts"] });
      toast.success("Pipeline atualizado!");
    },
  });

  const toggleAIAgent = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const update: any = { 
        ai_agent_active: active,
        assigned_agent_id: active && recoveryAgent ? recoveryAgent.id : null,
      };
      if (active) update.last_contact_at = new Date().toISOString();
      
      const { error } = await supabase.from("abandoned_carts").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["abandoned-carts"] });
      toast.success(vars.active ? "Agente de IA ativado para recuperação!" : "Agente de IA desativado.");
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
      await supabase.from("abandoned_carts").update({ ghl_synced: true } as any).eq("id", cart.id);
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

  const saveNotes = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase.from("abandoned_carts").update({ recovery_notes: notes } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["abandoned-carts"] });
      toast.success("Notas salvas!");
    },
  });

  const openWhatsApp = (cart: AbandonedCart) => {
    let phone = (cart.customer_phone || "").replace(/\D/g, "");
    if (!phone) return;
    if (!phone.startsWith("55")) phone = "55" + phone;
    const profileName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Equipe";
    const productNames = cart.items.map((i) => i.name).join(", ");
    const firstName = cart.customer_name.split(" ")[0] || "Cliente";
    const message = `Olá ${firstName}! Sou o ${profileName} da D7Pharma Brasil! Vi que você foi até o carrinho de compra do produto "${productNames}"! Ficou alguma dúvida que eu possa te ajudar?`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const fmt = (v: number) => `R$ ${Number(v).toFixed(2).replace(".", ",")}`;

  const calcItemsTotal = (items: { name: string; quantity: number; price: number }[]) =>
    items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const cartsByStage = useMemo(() => {
    const map: Record<string, AbandonedCart[]> = {};
    PIPELINE_STAGES.forEach(s => { map[s.id] = []; });
    carts?.forEach(c => {
      const stage = c.recovery_stage || "novo";
      if (map[stage]) map[stage].push(c);
      else map["novo"].push(c);
    });
    return map;
  }, [carts]);

  const abandonedCount = carts?.filter(c => !["convertido", "perdido"].includes(c.recovery_stage || "")).length ?? 0;
  const recoveredCount = carts?.filter(c => c.recovery_stage === "convertido").length ?? 0;
  const aiActiveCount = carts?.filter(c => c.ai_agent_active).length ?? 0;
  const totalLost = carts?.filter(c => c.status === "abandoned").reduce((s, c) => {
    const t = calcItemsTotal(c.items);
    return s + (t > 0 ? t : c.cart_total);
  }, 0) ?? 0;

  const openDetail = (cart: AbandonedCart) => {
    setSelectedCart(cart);
    setNoteText(cart.recovery_notes || "");
    setDetailOpen(true);
  };

  const getNextStage = (current: string) => {
    const idx = PIPELINE_STAGES.findIndex(s => s.id === current);
    if (idx < 0 || idx >= PIPELINE_STAGES.length - 2) return null; // Don't auto-advance past proposta
    return PIPELINE_STAGES[idx + 1].id;
  };

  const PipelineCard = ({ cart }: { cart: AbandonedCart }) => {
    const hasPhone = !!(cart.customer_phone || "").replace(/\D/g, "");
    const displayTotal = calcItemsTotal(cart.items) || cart.cart_total;
    const nextStage = getNextStage(cart.recovery_stage || "novo");

    return (
      <Card className="cursor-pointer hover:shadow-md transition-shadow border-l-4" 
        style={{ borderLeftColor: PIPELINE_STAGES.find(s => s.id === cart.recovery_stage)?.color.replace("bg-", "") || "#3b82f6" }}
        onClick={() => openDetail(cart)}
      >
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{cart.customer_name || "—"}</p>
              <p className="text-xs text-muted-foreground">{fmt(displayTotal)}</p>
            </div>
            {cart.ai_agent_active && (
              <Badge variant="secondary" className="gap-1 text-xs shrink-0 ml-1">
                <Bot className="h-3 w-3" /> IA
              </Badge>
            )}
          </div>

          <div className="text-xs text-muted-foreground space-y-0.5">
            {cart.items.slice(0, 2).map((item, i) => (
              <p key={i} className="truncate">{item.quantity}x {item.name}</p>
            ))}
            {cart.items.length > 2 && <p>+{cart.items.length - 2} itens</p>}
          </div>

          <div className="flex items-center gap-1 pt-1">
            <p className="text-xs text-muted-foreground flex-1">
              {format(new Date(cart.created_at), "dd/MM HH:mm")}
            </p>
            <div className="flex gap-1">
              {hasPhone && cart.recovery_stage !== "convertido" && cart.recovery_stage !== "perdido" && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); openWhatsApp(cart); }}>
                  <MessageCircle className="h-3 w-3 text-green-600" />
                </Button>
              )}
              {nextStage && (
                <Button variant="ghost" size="icon" className="h-6 w-6" 
                  onClick={e => { e.stopPropagation(); updateStage.mutate({ id: cart.id, stage: nextStage }); }}>
                  <ArrowRight className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold">Recuperação de Pedidos</h2>
          <p className="text-sm text-muted-foreground">Pipeline de recuperação com agentes de IA</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={viewMode === "pipeline" ? "default" : "outline"} size="sm" onClick={() => setViewMode("pipeline")}>
            <LayoutGrid className="h-4 w-4 mr-1" /> Pipeline
          </Button>
          <Button variant={viewMode === "table" ? "default" : "outline"} size="sm" onClick={() => setViewMode("table")}>
            <List className="h-4 w-4 mr-1" /> Tabela
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <ShoppingCart className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Em Aberto</p>
              <p className="text-2xl font-bold">{abandonedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Recuperados</p>
              <p className="text-2xl font-bold">{recoveredCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Bot className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">IA Ativa</p>
              <p className="text-2xl font-bold">{aiActiveCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor Perdido</p>
              <p className="text-2xl font-bold">{fmt(totalLost)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline View */}
      {viewMode === "pipeline" && (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map(stage => {
            const StageIcon = stage.icon;
            const stageCarts = cartsByStage[stage.id] || [];
            return (
              <div key={stage.id} className="min-w-[260px] max-w-[300px] flex-1">
                <div className={`rounded-t-lg px-3 py-2 flex items-center justify-between ${stage.color} text-white`}>
                  <div className="flex items-center gap-2">
                    <StageIcon className="h-4 w-4" />
                    <span className="font-medium text-sm">{stage.label}</span>
                  </div>
                  <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                    {stageCarts.length}
                  </Badge>
                </div>
                <div className="bg-muted/30 rounded-b-lg p-2 space-y-2 min-h-[200px] border border-t-0">
                  {stageCarts.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">Nenhum item</p>
                  ) : (
                    stageCarts.map(cart => <PipelineCard key={cart.id} cart={cart} />)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">Produtos</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead className="hidden sm:table-cell">IA</TableHead>
                  <TableHead className="hidden sm:table-cell">Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : !carts?.length ? (
                  <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Nenhum carrinho abandonado</TableCell></TableRow>
                ) : (
                  carts.map(cart => {
                    const displayTotal = calcItemsTotal(cart.items) || cart.cart_total;
                    const hasPhone = !!(cart.customer_phone || "").replace(/\D/g, "");
                    const stageInfo = PIPELINE_STAGES.find(s => s.id === cart.recovery_stage) || PIPELINE_STAGES[0];
                    const StIcon = stageInfo.icon;

                    return (
                      <TableRow key={cart.id} className="cursor-pointer" onClick={() => openDetail(cart)}>
                        <TableCell>
                          <p className="font-medium text-sm">{cart.customer_name || "—"}</p>
                          {cart.customer_phone && <p className="text-xs text-muted-foreground">{cart.customer_phone}</p>}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="max-w-[180px]">
                            {cart.items.slice(0, 2).map((item, i) => (
                              <p key={i} className="text-xs text-muted-foreground truncate">{item.quantity}x {item.name}</p>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{fmt(displayTotal)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1 text-xs">
                            <StIcon className="h-3 w-3" /> {stageInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {cart.ai_agent_active ? (
                            <Badge className="bg-blue-500 text-xs gap-1"><Bot className="h-3 w-3" /> Ativa</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                          {format(new Date(cart.created_at), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                            {hasPhone && cart.recovery_stage !== "convertido" && (
                              <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => openWhatsApp(cart)}>
                                <MessageCircle className="h-3 w-3" /> WhatsApp
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => openDetail(cart)}>
                              <Eye className="h-3 w-3" />
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
      )}

      {/* Detail / Move Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Recuperação</DialogTitle>
          </DialogHeader>
          {selectedCart && (
            <div className="space-y-4">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="font-medium text-sm">{selectedCart.customer_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor</p>
                  <p className="font-medium text-sm">{fmt(calcItemsTotal(selectedCart.items) || selectedCart.cart_total)}</p>
                </div>
                {selectedCart.customer_phone && (
                  <div>
                    <p className="text-xs text-muted-foreground">Telefone</p>
                    <p className="text-sm">{selectedCart.customer_phone}</p>
                  </div>
                )}
                {selectedCart.customer_email && (
                  <div>
                    <p className="text-xs text-muted-foreground">E-mail</p>
                    <p className="text-sm">{selectedCart.customer_email}</p>
                  </div>
                )}
              </div>

              {/* Products */}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Produtos</p>
                <div className="bg-muted/30 rounded p-2 space-y-1">
                  {selectedCart.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.name}</span>
                      <span className="text-muted-foreground">{fmt(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stage selector */}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Mover para Etapa</p>
                <Select
                  value={selectedCart.recovery_stage || "novo"}
                  onValueChange={v => {
                    updateStage.mutate({ id: selectedCart.id, stage: v });
                    setSelectedCart({ ...selectedCart, recovery_stage: v });
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PIPELINE_STAGES.map(s => {
                      const SI = s.icon;
                      return (
                        <SelectItem key={s.id} value={s.id}>
                          <div className="flex items-center gap-2">
                            <SI className="h-3 w-3" /> {s.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* AI Agent Toggle */}
              {selectedCart.recovery_stage !== "convertido" && selectedCart.recovery_stage !== "perdido" && (
                <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">Agente de IA de Recuperação</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedCart.ai_agent_active ? "Ativo — acompanhando automaticamente" : "Desativado"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={selectedCart.ai_agent_active ? "destructive" : "default"}
                    size="sm"
                    onClick={() => {
                      const newState = !selectedCart.ai_agent_active;
                      toggleAIAgent.mutate({ id: selectedCart.id, active: newState });
                      setSelectedCart({ ...selectedCart, ai_agent_active: newState });
                    }}
                  >
                    {selectedCart.ai_agent_active ? "Desativar" : "Ativar IA"}
                  </Button>
                </div>
              )}

              {/* Notes */}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Notas de Recuperação</p>
                <Textarea
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Adicione observações sobre este lead..."
                  rows={3}
                />
              </div>

              {/* Contact info */}
              {selectedCart.ai_contact_count > 0 && (
                <p className="text-xs text-muted-foreground">
                  Contatos da IA: {selectedCart.ai_contact_count} • 
                  Último: {selectedCart.last_contact_at ? format(new Date(selectedCart.last_contact_at), "dd/MM HH:mm") : "—"}
                </p>
              )}

              <DialogFooter className="gap-2">
                {(selectedCart.customer_phone || "").replace(/\D/g, "") && (
                  <Button variant="outline" className="gap-1" onClick={() => openWhatsApp(selectedCart)}>
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </Button>
                )}
                {!selectedCart.ghl_synced && (
                  <Button variant="outline" className="gap-1" disabled={syncing === selectedCart.id}
                    onClick={() => triggerGHL.mutate(selectedCart)}>
                    <Send className="h-4 w-4" /> {syncing === selectedCart.id ? "Enviando..." : "Enviar GHL"}
                  </Button>
                )}
                <Button onClick={() => {
                  saveNotes.mutate({ id: selectedCart.id, notes: noteText });
                  setDetailOpen(false);
                }}>
                  Salvar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
