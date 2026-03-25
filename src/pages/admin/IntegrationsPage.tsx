import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, ExternalLink, RefreshCw } from "lucide-react";

export default function IntegrationsPage() {
  const [blingInviteUrl, setBlingInviteUrl] = useState("");

  const { data: blingStatus, refetch } = useQuery({
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
          <CardContent className="space-y-4">
            {blingStatus?.connected && !blingStatus.expired && (
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

            {!blingStatus?.connected || blingStatus?.expired ? (
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
            ) : null}

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Verificar status
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Configure a URL de callback no app Bling:{" "}
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
            <div className="flex items-center gap-2 text-sm text-primary">
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
            <div className="flex items-center gap-2 text-sm text-primary">
              <CheckCircle className="h-4 w-4" />
              API configurada
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
