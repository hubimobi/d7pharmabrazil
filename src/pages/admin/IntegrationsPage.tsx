import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const BLING_AUTHORIZE_URL = `https://www.bling.com.br/Api/v3/oauth/authorize?response_type=code&client_id=${import.meta.env.VITE_BLING_CLIENT_ID || ""}&state=bling`;

export default function IntegrationsPage() {
  const { data: blingStatus, isLoading, refetch } = useQuery({
    queryKey: ["bling-status"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bling_tokens")
        .select("id, expires_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) return { connected: false };

      const token = data[0];
      const expired = new Date(token.expires_at) < new Date();
      return {
        connected: true,
        expired,
        expiresAt: token.expires_at,
        updatedAt: token.updated_at,
      };
    },
  });

  const handleSyncTest = async () => {
    toast.info("Para sincronizar, um pedido precisa ser criado pelo checkout.");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Integrações</h1>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Bling */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Bling ERP
              {blingStatus?.connected ? (
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
          <CardContent className="space-y-3">
            {blingStatus?.connected && !blingStatus.expired && (
              <div className="flex items-center gap-2 text-sm text-green-600">
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

            <div className="flex gap-2">
              <Button asChild>
                <a href={BLING_AUTHORIZE_URL} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {blingStatus?.connected ? "Reconectar Bling" : "Conectar Bling"}
                </a>
              </Button>
              <Button variant="outline" size="icon" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Callback URL:{" "}
              <code className="bg-muted px-1 rounded text-xs">
                https://xufiemrhlmirkrdrcxox.supabase.co/functions/v1/bling-callback
              </code>
            </p>
          </CardContent>
        </Card>

        {/* Asaas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Asaas Pagamentos
              <Badge>Conectado</Badge>
            </CardTitle>
            <CardDescription>
              Pagamentos via Pix e Cartão de Crédito integrados ao checkout.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              API configurada (Produção)
            </div>
          </CardContent>
        </Card>

        {/* Melhor Envio */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Melhor Envio
              <Badge>Conectado</Badge>
            </CardTitle>
            <CardDescription>
              Cálculo de frete automático por CEP com peso e dimensões dos produtos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              API configurada
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
