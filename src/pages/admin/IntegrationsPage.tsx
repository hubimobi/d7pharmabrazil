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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle, XCircle, ExternalLink, RefreshCw, Unplug, Power, PowerOff, AlertTriangle, MessageSquare, Phone } from "lucide-react";
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
              <div className="flex items-center gap-2 text-sm text-primary">
                <CheckCircle className="h-4 w-4" />
                Conectado — token válido até{" "}
                {new Date(blingStatus.expiresAt!).toLocaleString("pt-BR")}
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
      </div>

      {/* Webchat & WhatsApp Section */}
      <WebchatWhatsAppSettings />
    </div>
  );
}

function WebchatWhatsAppSettings() {
  const { data: settings, isLoading } = useStoreSettings();
  const qc = useQueryClient();

  const [webchatEnabled, setWebchatEnabled] = useState(false);
  const [webchatScript, setWebchatScript] = useState("");
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);

  useEffect(() => {
    if (settings) {
      setWebchatEnabled(settings.webchat_enabled ?? false);
      setWebchatScript(settings.webchat_script ?? "");
      setWhatsappEnabled(settings.whatsapp_button_enabled ?? true);
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
    mutation.mutate({ webchat_enabled: webchatEnabled, webchat_script: webchatScript });
  };

  const toggleWhatsapp = (checked: boolean) => {
    setWhatsappEnabled(checked);
    mutation.mutate({ whatsapp_button_enabled: checked });
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
              <Switch checked={whatsappEnabled} onCheckedChange={toggleWhatsapp} id="whatsapp-toggle" />
              <Label htmlFor="whatsapp-toggle">{whatsappEnabled ? "Botão ativado" : "Botão desativado"}</Label>
            </div>
            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
              <p>O número de WhatsApp é configurado em <strong>Configurações da Loja → WhatsApp</strong>.</p>
              {settings?.whatsapp && (
                <p className="mt-1">Número atual: <code className="bg-background px-1 rounded">{settings.whatsapp}</code></p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
