import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Globe, Copy, RefreshCw, Trash2, Loader2, CheckCircle2, AlertCircle, Clock } from "lucide-react";

interface Domain {
  id: string;
  domain: string;
  is_primary: boolean;
  verified_at: string | null;
  ssl_enabled: boolean;
  verification_token: string | null;
  verification_status: string;
  last_check_at: string | null;
  last_error: string | null;
}

const LOVABLE_IP = "185.158.133.1";
const DOMAIN_RE = /^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,}$/i;

export default function DomainsPage() {
  const { tenantId } = useTenant();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDomain, setNewDomain] = useState("");
  const [adding, setAdding] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);

  const fetchDomains = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tenant_domains").select("*").eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setDomains((data ?? []) as Domain[]);
    setLoading(false);
  };

  useEffect(() => { fetchDomains(); }, [tenantId]);

  const addDomain = async () => {
    const d = newDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!DOMAIN_RE.test(d)) {
      toast.error("Domínio inválido (ex: minhaloja.com.br)");
      return;
    }
    setAdding(true);
    const { error } = await supabase.from("tenant_domains").insert({
      tenant_id: tenantId, domain: d, is_primary: domains.length === 0,
    });
    setAdding(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Esse domínio já está cadastrado" : error.message);
      return;
    }
    setNewDomain("");
    toast.success("Domínio adicionado! Configure os DNS e clique em Verificar.");
    fetchDomains();
  };

  const verifyDomain = async (id: string) => {
    setVerifying(id);
    try {
      const { data, error } = await supabase.functions.invoke("verify-custom-domain", { body: { domain_id: id } });
      if (error) throw error;
      if (data?.status === "verified") toast.success("Domínio verificado com sucesso!");
      else toast.error(data?.error ?? "DNS ainda não propagado. Tente em alguns minutos.");
      fetchDomains();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro na verificação");
    } finally {
      setVerifying(null);
    }
  };

  const deleteDomain = async (id: string) => {
    if (!confirm("Remover este domínio?")) return;
    const { error } = await supabase.from("tenant_domains").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Domínio removido"); fetchDomains(); }
  };

  const setPrimary = async (id: string) => {
    await supabase.from("tenant_domains").update({ is_primary: false }).eq("tenant_id", tenantId);
    await supabase.from("tenant_domains").update({ is_primary: true }).eq("id", id);
    fetchDomains();
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const statusBadge = (d: Domain) => {
    if (d.verification_status === "verified") return <Badge className="bg-success/10 text-success hover:bg-success/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Verificado</Badge>;
    if (d.verification_status === "failed") return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Falhou</Badge>;
    return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Globe className="w-6 h-6" /> Domínios próprios</h1>
        <p className="text-muted-foreground">Conecte seu próprio domínio (ex: minhaloja.com.br) à sua loja.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Adicionar domínio</CardTitle>
          <CardDescription>Digite o domínio sem http:// ou www (ele será adicionado automaticamente)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input placeholder="minhaloja.com.br" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} disabled={adding} />
            <Button onClick={addDomain} disabled={adding || !newDomain.trim()}>
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : "Adicionar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seus domínios</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : domains.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum domínio cadastrado ainda.</p>
          ) : (
            <div className="space-y-4">
              {domains.map((d) => (
                <div key={d.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-semibold text-lg">{d.domain}</span>
                      {statusBadge(d)}
                      {d.is_primary && <Badge variant="outline">Principal</Badge>}
                    </div>
                    <div className="flex gap-2">
                      {d.verification_status === "verified" && !d.is_primary && (
                        <Button size="sm" variant="outline" onClick={() => setPrimary(d.id)}>Tornar principal</Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => verifyDomain(d.id)} disabled={verifying === d.id}>
                        {verifying === d.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        <span className="ml-1">Verificar</span>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteDomain(d.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {d.verification_status !== "verified" && (
                    <div className="bg-muted/50 rounded p-3 space-y-3">
                      <p className="text-sm font-medium">Configure estes registros DNS no seu provedor:</p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-20">Tipo</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell><Badge variant="outline">A</Badge></TableCell>
                            <TableCell className="font-mono text-xs">@ (raiz) e www</TableCell>
                            <TableCell className="font-mono text-xs">{LOVABLE_IP}</TableCell>
                            <TableCell><Button size="sm" variant="ghost" onClick={() => copy(LOVABLE_IP)}><Copy className="w-3 h-3" /></Button></TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell><Badge variant="outline">TXT</Badge></TableCell>
                            <TableCell className="font-mono text-xs">_lovable</TableCell>
                            <TableCell className="font-mono text-xs break-all">{d.verification_token}</TableCell>
                            <TableCell><Button size="sm" variant="ghost" onClick={() => copy(d.verification_token ?? "")}><Copy className="w-3 h-3" /></Button></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                      <p className="text-xs text-muted-foreground">A propagação do DNS pode levar até 72h. Após configurar, clique em <strong>Verificar</strong>.</p>
                      {d.last_error && (
                        <p className="text-xs text-destructive border-l-2 border-destructive pl-2">{d.last_error}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
