import { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle, XCircle, ExternalLink, RefreshCw, Unplug, Power, PowerOff, AlertTriangle, MessageSquare, Phone, ShoppingBag, Copy, Check, Upload, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useStoreSettings } from "@/hooks/useStoreSettings";

interface IntegrationState {
  asaas: boolean;
  melhor_envio: boolean;
  ghl: boolean;
}

export default function IntegrationsPage() {
  const [blingInviteUrl, setBlingInviteUrl] = useState("");
  const [showReconnect, setShowReconnect] = useState(false);
  const [disconnectTarget, setDisconnectTarget] = useState<string | null>(null);
  const qc = useQueryClient();

  // Integration enabled states (persisted in localStorage for simplicity)
  const [integrations, setIntegrations] = useState<IntegrationState>(() => {
    try {
      const saved = localStorage.getItem("d7-integrations");
      return saved ? JSON.parse(saved) : { asaas: true, melhor_envio: true, ghl: true };
    } catch {
      return { asaas: true, melhor_envio: true, ghl: true };
    }
  });

  const toggleIntegration = (key: keyof IntegrationState) => {
    const newState = { ...integrations, [key]: !integrations[key] };
    setIntegrations(newState);
    localStorage.setItem("d7-integrations", JSON.stringify(newState));
    toast.success(newState[key] ? "Integração ativada!" : "Integração desativada.");
    setDisconnectTarget(null);
  };

  const { data: blingStatus, refetch, isLoading } = useQuery({
    queryKey: ["bling-status"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bling_tokens")
        .select("id, expires_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error("Erro ao buscar status do Bling:", error);
        return { connected: false };
      }
      if (!data || data.length === 0) return { connected: false };

      const token = data[0];
      const expired = new Date(token.expires_at) < new Date();
      return {
        connected: true,
        expired,
        expiresAt: token.expires_at,
        updatedAt: token.updated_at,
        tokenId: token.id,
      };
    },
  });

  const handleRefresh = async () => {
    await refetch();
    toast.success("Status atualizado!");
  };

  const handleDisconnectBling = async () => {
    if (!blingStatus?.connected) return;
    const { error } = await supabase.from("bling_tokens").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      toast.error("Erro ao desconectar Bling.");
    } else {
      toast.success("Bling desconectado.");
      refetch();
    }
    setDisconnectTarget(null);
  };

  const needsConnect = !blingStatus?.connected || blingStatus?.expired || showReconnect;

  const integrationLabels: Record<string, string> = {
    bling: "Bling ERP",
    asaas: "Asaas Pagamentos",
    melhor_envio: "Melhor Envio",
    ghl: "GoHighLevel (GHL)",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Integrações</h1>

      {/* Disconnect confirmation dialog */}
      <Dialog open={!!disconnectTarget} onOpenChange={() => setDisconnectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Desconectar {integrationLabels[disconnectTarget || ""] || disconnectTarget}?
            </DialogTitle>
            <DialogDescription>
              {disconnectTarget === "bling"
                ? "Os tokens de acesso serão removidos. Você precisará autorizar novamente para reconectar."
                : "A integração será desativada e os dados não serão mais sincronizados automaticamente. Você pode reconectar a qualquer momento."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisconnectTarget(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (disconnectTarget === "bling") handleDisconnectBling();
                else if (disconnectTarget) toggleIntegration(disconnectTarget as keyof IntegrationState);
              }}
            >
              <PowerOff className="h-4 w-4 mr-2" />
              Desconectar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Bling */}
        <Card className={!blingStatus?.connected ? "opacity-75" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Bling ERP
              {isLoading ? (
                <Badge variant="outline">Verificando...</Badge>
              ) : blingStatus?.connected ? (
                <Badge variant={blingStatus.expired ? "destructive" : "default"}>
                  {blingStatus.expired ? "Token expirado" : "Conectado"}
                </Badge>
              ) : (
                <Badge variant="outline">Desconectado</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Sincronização automática de pedidos com o ERP Bling V3 (SKU, NCM, GTIN, Unidade).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {blingStatus?.connected && !blingStatus.expired && !showReconnect && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-primary">
                  <CheckCircle className="h-4 w-4" />
                  Conectado — token válido até{" "}
                  {new Date(blingStatus.expiresAt!).toLocaleString("pt-BR")}
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  Última atualização: {new Date(blingStatus.updatedAt!).toLocaleString("pt-BR")}
                  {" • "}Renovação automática a cada 12h
                </p>
              </div>
            )}
            {blingStatus?.connected && blingStatus.expired && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <XCircle className="h-4 w-4" />
                Token expirado. Reconecte abaixo.
              </div>
            )}

            {needsConnect && (
              <div className="space-y-2">
                <Label htmlFor="bling-url">Link de convite do Bling (cole da tela do app)</Label>
                <Input
                  id="bling-url"
                  placeholder="https://www.bling.com.br/Api/v3/oauth/authorize?..."
                  value={blingInviteUrl}
                  onChange={(e) => setBlingInviteUrl(e.target.value)}
                />
                <Button
                  disabled={!blingInviteUrl}
                  onClick={() => window.open(blingInviteUrl, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Autorizar no Bling
                </Button>
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Verificar status
              </Button>
              {blingStatus?.connected && !blingStatus.expired && !showReconnect && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setShowReconnect(true)}>
                    <Unplug className="h-4 w-4 mr-2" />
                    Reconectar
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDisconnectTarget("bling")}>
                    <PowerOff className="h-4 w-4 mr-2" />
                    Desconectar
                  </Button>
                </>
              )}
              {!blingStatus?.connected && (
                <Button variant="default" size="sm" onClick={() => setShowReconnect(true)}>
                  <Power className="h-4 w-4 mr-2" />
                  Conectar
                </Button>
              )}
              {showReconnect && (
                <Button variant="ghost" size="sm" onClick={() => setShowReconnect(false)}>
                  Cancelar
                </Button>
              )}
            </div>

            <div className="rounded-md bg-muted p-3 space-y-1">
              <p className="text-xs font-medium">Escopos necessários no app Bling:</p>
              <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                <li><strong>Pedidos de Venda</strong> — Leitura e Escrita</li>
                <li><strong>Contatos</strong> — Leitura e Escrita</li>
                <li><strong>Produtos</strong> — Leitura (opcional, para sync futuro)</li>
                <li><strong>Notas Fiscais</strong> — Leitura e Escrita (opcional)</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2">
                URL de callback:{" "}
                <code className="bg-background px-1 rounded text-xs break-all">
                  {`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/bling-callback`}
                </code>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Asaas */}
        <Card className={!integrations.asaas ? "opacity-60" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Asaas Pagamentos
              <Badge variant={integrations.asaas ? "default" : "outline"}>
                {integrations.asaas ? "Conectado" : "Desconectado"}
              </Badge>
            </CardTitle>
            <CardDescription>
              Pagamentos via Pix e Cartão de Crédito integrados ao checkout.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {integrations.asaas ? (
              <div className="flex items-center gap-2 text-sm text-primary">
                <CheckCircle className="h-4 w-4" />
                API configurada (Produção)
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <XCircle className="h-4 w-4" />
                Integração desativada
              </div>
            )}
            <div className="flex gap-2">
              {integrations.asaas ? (
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDisconnectTarget("asaas")}>
                  <PowerOff className="h-4 w-4 mr-2" />
                  Desconectar
                </Button>
              ) : (
                <Button variant="default" size="sm" onClick={() => toggleIntegration("asaas")}>
                  <Power className="h-4 w-4 mr-2" />
                  Conectar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Melhor Envio */}
        <Card className={!integrations.melhor_envio ? "opacity-60" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Melhor Envio
              <Badge variant={integrations.melhor_envio ? "default" : "outline"}>
                {integrations.melhor_envio ? "Conectado" : "Desconectado"}
              </Badge>
            </CardTitle>
            <CardDescription>
              Cálculo de frete automático por CEP com peso e dimensões dos produtos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {integrations.melhor_envio ? (
              <div className="flex items-center gap-2 text-sm text-primary">
                <CheckCircle className="h-4 w-4" />
                API configurada
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <XCircle className="h-4 w-4" />
                Integração desativada
              </div>
            )}
            <div className="flex gap-2">
              {integrations.melhor_envio ? (
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDisconnectTarget("melhor_envio")}>
                  <PowerOff className="h-4 w-4 mr-2" />
                  Desconectar
                </Button>
              ) : (
                <Button variant="default" size="sm" onClick={() => toggleIntegration("melhor_envio")}>
                  <Power className="h-4 w-4 mr-2" />
                  Conectar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* GoHighLevel */}
        <Card className={!integrations.ghl ? "opacity-60" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              GoHighLevel (GHL)
              <Badge variant={integrations.ghl ? "default" : "outline"}>
                {integrations.ghl ? "Conectado" : "Desconectado"}
              </Badge>
            </CardTitle>
            <CardDescription>
              Sincronização automática de contatos, oportunidades e tags após cada compra.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {integrations.ghl ? (
              <>
                <div className="flex items-center gap-2 text-sm text-primary">
                  <CheckCircle className="h-4 w-4" />
                  API configurada
                </div>
                <div className="rounded-md bg-muted p-3">
                  <p className="text-xs font-medium mb-1">O que é sincronizado automaticamente:</p>
                  <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                    <li>Contato criado/atualizado com nome, email e telefone</li>
                    <li>Tags automáticas: <code className="bg-background px-1 rounded">cliente-loja-online</code>, <code className="bg-background px-1 rounded">pagou-pix</code>, <code className="bg-background px-1 rounded">comprou-[produto]</code></li>
                    <li>Oportunidade criada no primeiro pipeline com valor do pedido</li>
                  </ul>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <XCircle className="h-4 w-4" />
                Integração desativada
              </div>
            )}
            <div className="flex gap-2">
              {integrations.ghl ? (
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDisconnectTarget("ghl")}>
                  <PowerOff className="h-4 w-4 mr-2" />
                  Desconectar
                </Button>
              ) : (
                <Button variant="default" size="sm" onClick={() => toggleIntegration("ghl")}>
                  <Power className="h-4 w-4 mr-2" />
                  Conectar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Meta / Instagram Shopping */}
        <MetaFeedCard />

        {/* TikTok Shop */}
        <TikTokShopCard />

        {/* Google Meu Negócio */}
        <GoogleBusinessCard />

        {/* Cloudflare Cache */}
        <CloudflareCacheCard />
      </div>

      {/* Manual Bling Sync */}
      <ManualBlingSync />

      {/* Webchat & WhatsApp Section */}
      <WebchatWhatsAppSettings />

      {/* Integration Logs */}
      <IntegrationLogs />
    </div>
  );
}

function ManualBlingSync() {
  const [orderId, setOrderId] = useState("");
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    if (!orderId.trim()) {
      toast.error("Informe o ID do pedido");
      return;
    }
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("bling-sync-order", {
        body: { order_id: orderId.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Pedido sincronizado com o Bling!");
      setOrderId("");
    } catch (err: any) {
      toast.error(`Erro: ${err.message || "Falha ao sincronizar"}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Sincronização Manual - Bling</CardTitle>
        <CardDescription>Reenvie um pedido para o Bling informando o ID do pedido</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <Label htmlFor="sync-order-id">ID do Pedido</Label>
            <Input
              id="sync-order-id"
              placeholder="Cole o ID do pedido aqui..."
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
            />
          </div>
          <Button onClick={handleSync} disabled={syncing}>
            {syncing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Sincronizar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function IntegrationLogs() {
  const [filter, setFilter] = useState("all");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["integration-logs", filter],
    queryFn: async () => {
      let query = supabase
        .from("integration_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (filter !== "all") {
        query = query.eq("integration", filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Array<{
        id: string;
        integration: string;
        action: string;
        status: string;
        details: string | null;
        created_at: string;
      }>;
    },
  });

  const statusColor = (status: string) => {
    if (status === "success") return "default";
    if (status === "error") return "destructive";
    return "outline";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle>Log de Atividades</CardTitle>
            <CardDescription>Histórico de renovações de token e sincronizações</CardDescription>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="bling">Bling</SelectItem>
              <SelectItem value="asaas">Asaas</SelectItem>
              <SelectItem value="ghl">GHL</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground text-center py-4">Carregando...</div>
        ) : !logs || logs.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">Nenhum registro encontrado</div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-auto">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 p-3 rounded-md border text-sm">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">{log.integration.toUpperCase()}</Badge>
                    <span className="font-medium">{log.action.replace(/_/g, " ")}</span>
                    <Badge variant={statusColor(log.status)} className="text-xs">{log.status}</Badge>
                  </div>
                  {log.details && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">{log.details}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WebchatWhatsAppSettings() {
  const { data: settings, isLoading } = useStoreSettings();
  const qc = useQueryClient();

  const [webchatEnabled, setWebchatEnabled] = useState(false);
  const [webchatScript, setWebchatScript] = useState("");
  const [webchatPosition, setWebchatPosition] = useState("right");
  const [webchatDelay, setWebchatDelay] = useState(0);
  const [webchatShowOnScroll, setWebchatShowOnScroll] = useState(false);
  const [hideChatOnCheckout, setHideChatOnCheckout] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [whatsappName, setWhatsappName] = useState("Fale com um Especialista");
  const [whatsappMessage, setWhatsappMessage] = useState("Olá! Gostaria de falar com um especialista.");
  const [whatsappPosition, setWhatsappPosition] = useState("right");
  const [whatsappDelay, setWhatsappDelay] = useState(0);
  const [whatsappShowOnScroll, setWhatsappShowOnScroll] = useState(false);

  useEffect(() => {
    if (settings) {
      setWebchatEnabled(settings.webchat_enabled ?? false);
      setWebchatScript(settings.webchat_script ?? "");
      setWebchatPosition(settings.webchat_position || "right");
      setWebchatDelay(settings.webchat_delay_seconds || 0);
      setWebchatShowOnScroll(settings.webchat_show_on_scroll ?? false);
      setHideChatOnCheckout((settings as any).hide_chat_on_checkout ?? false);
      setWhatsappEnabled(settings.whatsapp_button_enabled ?? true);
      setWhatsappName(settings.whatsapp_button_name || "Fale com um Especialista");
      setWhatsappMessage(settings.whatsapp_button_message || "Olá! Gostaria de falar com um especialista.");
      setWhatsappPosition(settings.whatsapp_position || "right");
      setWhatsappDelay(settings.whatsapp_delay_seconds || 0);
      setWhatsappShowOnScroll(settings.whatsapp_show_on_scroll ?? false);
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: async (values: Record<string, any>) => {
      if (!settings?.id) throw new Error("Settings not found");
      const { error } = await (supabase.from("store_settings" as any) as any)
        .update(values)
        .eq("id", settings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-settings"] });
      qc.invalidateQueries({ queryKey: ["store-settings-admin"] });
      toast.success("Configuração salva!");
    },
    onError: () => toast.error("Erro ao salvar."),
  });

  const saveWebchat = () => {
    mutation.mutate({
      webchat_enabled: webchatEnabled,
      webchat_script: webchatScript,
      webchat_position: webchatPosition,
      webchat_delay_seconds: webchatDelay,
      webchat_show_on_scroll: webchatShowOnScroll,
      hide_chat_on_checkout: hideChatOnCheckout,
    });
  };

  const saveWhatsapp = () => {
    mutation.mutate({
      whatsapp_button_enabled: whatsappEnabled,
      whatsapp_button_name: whatsappName,
      whatsapp_button_message: whatsappMessage,
      whatsapp_position: whatsappPosition,
      whatsapp_delay_seconds: whatsappDelay,
      whatsapp_show_on_scroll: whatsappShowOnScroll,
    });
  };

  if (isLoading) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Widgets do Site</h2>
      <div className="grid gap-6 md:grid-cols-2">
        {/* Webchat */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Webchat
              <Badge variant={webchatEnabled ? "default" : "outline"}>
                {webchatEnabled ? "Ativo" : "Inativo"}
              </Badge>
            </CardTitle>
            <CardDescription>
              Instale o webchat do GoHighLevel ou qualquer outro widget de chat colando o código embed abaixo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch checked={webchatEnabled} onCheckedChange={setWebchatEnabled} id="webchat-toggle" />
              <Label htmlFor="webchat-toggle">{webchatEnabled ? "Webchat ativado" : "Webchat desativado"}</Label>
            </div>
            <div>
              <Label>Código Embed (HTML/Script)</Label>
              <Textarea
                rows={6}
                placeholder={'<script src="https://widgets.leadconnectorhq.com/loader.js" ...></script>'}
                value={webchatScript}
                onChange={(e) => setWebchatScript(e.target.value)}
                className="font-mono text-xs"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Cole aqui o código completo do widget (ex: GoHighLevel, Tidio, Crisp, etc.)
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Posição</Label>
                <Select value={webchatPosition} onValueChange={setWebchatPosition}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="right">Direita</SelectItem>
                    <SelectItem value="left">Esquerda</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Delay (segundos)</Label>
                <Input type="number" min={0} value={webchatDelay} onChange={(e) => setWebchatDelay(Number(e.target.value))} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Após rolagem</Label>
                <Switch checked={webchatShowOnScroll} onCheckedChange={setWebchatShowOnScroll} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Se delay=0 e rolagem desativada, aparece imediatamente. Se ambos ativos, aparece quando qualquer condição for atendida primeiro.</p>
            <div className="flex items-center gap-3">
              <Switch checked={hideChatOnCheckout} onCheckedChange={setHideChatOnCheckout} id="hide-chat-checkout" />
              <Label htmlFor="hide-chat-checkout">Ocultar chat/WhatsApp no Checkout</Label>
            </div>
            <Button onClick={saveWebchat} disabled={mutation.isPending} size="sm">
              {mutation.isPending ? "Salvando..." : "Salvar Webchat"}
            </Button>
          </CardContent>
        </Card>

        {/* WhatsApp Button */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Botão Fale com o Especialista
              <Badge variant={whatsappEnabled ? "default" : "outline"}>
                {whatsappEnabled ? "Ativo" : "Inativo"}
              </Badge>
            </CardTitle>
            <CardDescription>
              Botão flutuante no site que direciona para o WhatsApp cadastrado nas configurações da loja.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch checked={whatsappEnabled} onCheckedChange={setWhatsappEnabled} id="whatsapp-toggle" />
              <Label htmlFor="whatsapp-toggle">{whatsappEnabled ? "Botão ativado" : "Botão desativado"}</Label>
            </div>
            <div>
              <Label>Nome do Botão</Label>
              <Input
                value={whatsappName}
                onChange={(e) => setWhatsappName(e.target.value)}
                placeholder="Fale com um Especialista"
                maxLength={50}
              />
            </div>
            <div>
              <Label>Mensagem Padrão</Label>
              <Textarea
                rows={3}
                value={whatsappMessage}
                onChange={(e) => setWhatsappMessage(e.target.value)}
                placeholder="Olá! Gostaria de falar com um especialista."
                maxLength={500}
              />
              <p className="mt-1 text-xs text-muted-foreground">Mensagem pré-preenchida ao abrir o WhatsApp.</p>
            </div>
            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
              <p>O número de WhatsApp é configurado em <strong>Configurações da Loja → WhatsApp</strong>.</p>
              {settings?.whatsapp && (
                <p className="mt-1">Número atual: <code className="bg-background px-1 rounded">{settings.whatsapp}</code></p>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Posição</Label>
                <Select value={whatsappPosition} onValueChange={setWhatsappPosition}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="right">Direita</SelectItem>
                    <SelectItem value="left">Esquerda</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Delay (segundos)</Label>
                <Input type="number" min={0} value={whatsappDelay} onChange={(e) => setWhatsappDelay(Number(e.target.value))} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Após rolagem</Label>
                <Switch checked={whatsappShowOnScroll} onCheckedChange={setWhatsappShowOnScroll} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Se delay=0 e rolagem desativada, aparece imediatamente. Se ambos ativos, aparece quando qualquer condição for atendida primeiro.</p>
            <Button onClick={saveWhatsapp} disabled={mutation.isPending} size="sm">
              {mutation.isPending ? "Salvando..." : "Salvar WhatsApp"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetaFeedCard() {
  const [copied, setCopied] = useState<string | null>(null);
  const feedBaseUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/meta-product-feed`;
  const xmlUrl = feedBaseUrl;
  const csvUrl = `${feedBaseUrl}?format=csv`;

  const handleCopy = (url: string, type: string) => {
    navigator.clipboard.writeText(url);
    setCopied(type);
    toast.success("URL copiada!");
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5" />
          Meta / Instagram Shopping
          <Badge variant="default">Ativo</Badge>
        </CardTitle>
        <CardDescription>
          Feed automático de produtos para Facebook Shop e Instagram Shopping via Meta Commerce Manager.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-primary">
          <CheckCircle className="h-4 w-4" />
          Feed gerado automaticamente com todos os produtos ativos
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs font-medium">Feed XML (recomendado)</Label>
            <div className="flex gap-2 mt-1">
              <Input value={xmlUrl} readOnly className="text-xs font-mono" />
              <Button variant="outline" size="sm" onClick={() => handleCopy(xmlUrl, "xml")}>
                {copied === "xml" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium">Feed CSV (alternativo)</Label>
            <div className="flex gap-2 mt-1">
              <Input value={csvUrl} readOnly className="text-xs font-mono" />
              <Button variant="outline" size="sm" onClick={() => handleCopy(csvUrl, "csv")}>
                {copied === "csv" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-md bg-muted p-3 space-y-2">
          <p className="text-xs font-medium">Como configurar no Meta Commerce Manager:</p>
          <ol className="text-xs text-muted-foreground list-decimal pl-4 space-y-1">
            <li>Acesse o <a href="https://business.facebook.com/commerce" target="_blank" rel="noopener noreferrer" className="text-primary underline">Meta Commerce Manager</a></li>
            <li>Crie ou selecione um <strong>Catálogo</strong></li>
            <li>Vá em <strong>Fontes de Dados → Data Feed</strong></li>
            <li>Cole a <strong>URL do Feed XML</strong> acima</li>
            <li>Configure a atualização automática (recomendado: <strong>diária</strong>)</li>
            <li>Conecte o catálogo ao <strong>Instagram Shopping</strong> nas configurações</li>
          </ol>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.open(xmlUrl, "_blank")}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Visualizar Feed XML
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open(csvUrl, "_blank")}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Baixar CSV
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TikTokShopCard() {
  const [syncing, setSyncing] = useState<string | null>(null);
  const qc = useQueryClient();

  const callbackUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/tiktok-shop-callback`;

  const { data: tiktokStatus, isLoading, refetch } = useQuery({
    queryKey: ["tiktok-status"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("tiktok_tokens" as any) as any)
        .select("id, shop_id, shop_name, expires_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) return { connected: false };

      const token = data[0];
      const expired = new Date(token.expires_at) < new Date();
      return {
        connected: true,
        expired,
        shopId: token.shop_id,
        shopName: token.shop_name,
        expiresAt: token.expires_at,
        updatedAt: token.updated_at,
      };
    },
  });

  const handleConnect = () => {
    // TikTok Shop OAuth URL - user needs to replace with their app's auth URL
    const appKey = prompt("Informe o App Key do TikTok Shop:");
    if (!appKey) return;
    const authUrl = `https://services.tiktokshop.com/open/authorize?service_id=${appKey}`;
    window.open(authUrl, "_blank");
  };

  const handleSyncProducts = async () => {
    setSyncing("products");
    try {
      const { data, error } = await supabase.functions.invoke("tiktok-shop-sync-products", {
        body: { action: "export" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const results = data?.results || [];
      const success = results.filter((r: any) => r.success).length;
      const failed = results.filter((r: any) => !r.success).length;
      toast.success(`${success} produto(s) exportado(s)${failed > 0 ? `, ${failed} com erro` : ""}`);
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setSyncing(null);
    }
  };

  const handleSyncOrders = async () => {
    setSyncing("orders");
    try {
      const { data, error } = await supabase.functions.invoke("tiktok-shop-sync-orders");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${data?.imported || 0} pedido(s) importado(s) de ${data?.total_found || 0} encontrado(s)`);
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setSyncing(null);
    }
  };

  const handleDisconnect = async () => {
    const { error } = await (supabase.from("tiktok_tokens" as any) as any)
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      toast.error("Erro ao desconectar.");
    } else {
      toast.success("TikTok Shop desconectado.");
      refetch();
    }
  };

  return (
    <Card className={!tiktokStatus?.connected ? "opacity-75" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          TikTok Shop
          {isLoading ? (
            <Badge variant="outline">Verificando...</Badge>
          ) : tiktokStatus?.connected ? (
            <Badge variant={tiktokStatus.expired ? "destructive" : "default"}>
              {tiktokStatus.expired ? "Token expirado" : "Conectado"}
            </Badge>
          ) : (
            <Badge variant="outline">Desconectado</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Sincronização de produtos e pedidos com o TikTok Shop.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {tiktokStatus?.connected && !tiktokStatus.expired && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-primary">
              <CheckCircle className="h-4 w-4" />
              Conectado{tiktokStatus.shopName ? ` — Loja: ${tiktokStatus.shopName}` : ""} 
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Token válido até {new Date(tiktokStatus.expiresAt!).toLocaleString("pt-BR")}
              {" • "}Renovação automática
            </p>
          </div>
        )}

        {tiktokStatus?.connected && tiktokStatus.expired && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <XCircle className="h-4 w-4" />
            Token expirado. Reconecte abaixo.
          </div>
        )}

        {!tiktokStatus?.connected && (
          <div className="text-sm text-muted-foreground">
            Conecte sua conta do TikTok Shop para sincronizar produtos e receber pedidos.
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {tiktokStatus?.connected && !tiktokStatus.expired ? (
            <>
              <Button variant="outline" size="sm" onClick={handleSyncProducts} disabled={!!syncing}>
                {syncing === "products" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Enviar Produtos
              </Button>
              <Button variant="outline" size="sm" onClick={handleSyncOrders} disabled={!!syncing}>
                {syncing === "orders" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                Importar Pedidos
              </Button>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={handleDisconnect}>
                <PowerOff className="h-4 w-4 mr-2" />
                Desconectar
              </Button>
            </>
          ) : (
            <Button variant="default" size="sm" onClick={handleConnect}>
              <Power className="h-4 w-4 mr-2" />
              Conectar TikTok Shop
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Verificar status
          </Button>
        </div>

        <div className="rounded-md bg-muted p-3 space-y-1">
          <p className="text-xs font-medium">Configuração do App TikTok Shop:</p>
          <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
            <li>Crie um App no <a href="https://partner.tiktokshop.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline">TikTok Shop Partner Center</a></li>
            <li>Permissões necessárias: <strong>Products</strong>, <strong>Orders</strong></li>
            <li>URL de callback:
              <code className="bg-background px-1 rounded text-xs break-all ml-1">{callbackUrl}</code>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function GoogleBusinessCard() {
  const { data: settings } = useStoreSettings();
  const qc = useQueryClient();
  const [placeId, setPlaceId] = useState((settings as any)?.google_business_place_id || "");
  const [reviewUrl, setReviewUrl] = useState((settings as any)?.google_business_review_url || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setPlaceId((settings as any)?.google_business_place_id || "");
      setReviewUrl((settings as any)?.google_business_review_url || "");
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("store_settings").update({
        google_business_place_id: placeId,
        google_business_review_url: reviewUrl,
      } as any).eq("id", (settings as any)?.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["store-settings"] });
      toast.success("Configurações do Google salvas!");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const isConfigured = !!reviewUrl;

  return (
    <Card className={!isConfigured ? "opacity-75" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Google Meu Negócio
          {isConfigured ? (
            <Badge variant="default">Configurado</Badge>
          ) : (
            <Badge variant="outline">Não configurado</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Vincule avaliações do Google Meu Negócio para redirecionar feedbacks aprovados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Place ID do Google</Label>
          <Input placeholder="ChIJ..." value={placeId} onChange={(e) => setPlaceId(e.target.value)} />
          <p className="text-xs text-muted-foreground">
            Encontre em <a href="https://developers.google.com/maps/documentation/places/web-service/place-id-finder" target="_blank" rel="noopener noreferrer" className="text-primary underline">Place ID Finder</a>
          </p>
        </div>
        <div className="space-y-2">
          <Label>URL de Avaliação do Google</Label>
          <Input placeholder="https://search.google.com/local/writereview?placeid=..." value={reviewUrl} onChange={(e) => setReviewUrl(e.target.value)} />
          <p className="text-xs text-muted-foreground">
            Gere em: <code className="bg-muted px-1 rounded">https://search.google.com/local/writereview?placeid=SEU_PLACE_ID</code>
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </CardContent>
    </Card>
  );
}

function CloudflareCacheCard() {
  const [purging, setPurging] = useState(false);
  const [mode, setMode] = useState<"all" | "urls">("all");
  const [urls, setUrls] = useState("");

  const handlePurge = async () => {
    setPurging(true);
    try {
      const body: Record<string, unknown> = mode === "all"
        ? { purge_all: true }
        : { purge_all: false, urls: urls.split("\n").map(u => u.trim()).filter(Boolean) };

      if (mode === "urls" && (!body.urls || (body.urls as string[]).length === 0)) {
        toast.error("Informe ao menos uma URL.");
        setPurging(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("cloudflare-purge", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(data?.message || "Cache limpo com sucesso!");
      if (mode === "urls") setUrls("");
    } catch (err: any) {
      toast.error(`Erro: ${err.message || "Falha ao limpar cache"}`);
    } finally {
      setPurging(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Cloudflare Cache
          <Badge variant="default">Configurado</Badge>
        </CardTitle>
        <CardDescription>
          Limpe o cache do Cloudflare para atualizar o conteúdo do site imediatamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Tipo de limpeza</Label>
          <Select value={mode} onValueChange={(v) => setMode(v as "all" | "urls")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Limpar todo o cache</SelectItem>
              <SelectItem value="urls">Limpar URLs específicas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {mode === "urls" && (
          <div className="space-y-1">
            <Label>URLs (uma por linha)</Label>
            <Textarea
              placeholder={"https://seudominio.com.br/\nhttps://seudominio.com.br/produto/exemplo"}
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              rows={4}
            />
          </div>
        )}

        <div className="rounded-md bg-muted p-3">
          <p className="text-xs text-muted-foreground">
            {mode === "all"
              ? "⚠️ Limpar todo o cache pode causar lentidão temporária enquanto os arquivos são re-cacheados."
              : "Informe as URLs exatas que deseja invalidar no cache do Cloudflare."}
          </p>
        </div>

        <Button onClick={handlePurge} disabled={purging} variant={mode === "all" ? "destructive" : "default"}>
          {purging ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          {purging ? "Limpando..." : mode === "all" ? "Limpar Todo o Cache" : "Limpar URLs"}
        </Button>
      </CardContent>
    </Card>
  );
}