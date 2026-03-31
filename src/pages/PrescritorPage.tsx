import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, LogOut, UserPlus, Link2, Copy, Check, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  pending: { label: "Gerada", variant: "outline" },
  awaiting: { label: "Aguardando", variant: "secondary" },
  paid: { label: "Paga", variant: "default" },
};

export default function PrescritorPage() {
  const { user, signOut, session, signIn } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [monthFilter, setMonthFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Get doctor record for logged in user
  const { data: doctor } = useQuery({
    queryKey: ["my-doctor", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctors")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!user,
  });

  const { data: commissions, isLoading } = useQuery({
    queryKey: ["prescritor-commissions", doctor?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commissions")
        .select("*, orders(customer_name, created_at, total, coupon_code)")
        .eq("doctor_id", doctor!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!doctor,
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");
    const { error } = await signIn(email, password);
    if (error) {
      setLoginError("E-mail ou senha incorretos.");
    }
    setIsLoggingIn(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (password.length < 6) {
      setLoginError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setLoginError("As senhas não conferem.");
      return;
    }

    setIsSigningUp(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-prescriber-signup", {
        body: { email, password },
      });

      if (error || data?.error) {
        setLoginError(data?.error || "Erro ao criar conta.");
        setIsSigningUp(false);
        return;
      }

      // Auto-login after signup
      const { error: loginErr } = await signIn(email, password);
      if (loginErr) {
        toast({ title: "Conta criada!", description: "Faça login com suas credenciais." });
        setMode("login");
      }
    } catch (err: any) {
      setLoginError(err?.message || "Erro ao criar conta.");
    }
    setIsSigningUp(false);
  };

  // Not logged in — show login/signup form
  if (!session) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-md py-20">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Portal do Prescritor</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {mode === "login" ? "Acesse para visualizar seus cashbacks" : "Crie sua conta para acessar seus cashbacks"}
              </p>
            </CardHeader>
            <CardContent>
              {mode === "login" ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="seu@email.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Senha</Label>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                  {loginError && <p className="text-sm text-destructive">{loginError}</p>}
                  <Button type="submit" className="w-full" disabled={isLoggingIn}>
                    {isLoggingIn ? "Entrando..." : "Entrar"}
                  </Button>
                  <div className="text-center">
                    <button
                      type="button"
                      className="text-sm text-primary hover:underline"
                      onClick={() => { setMode("signup"); setLoginError(""); }}
                    >
                      <UserPlus className="inline h-3.5 w-3.5 mr-1" />
                      Não tem conta? Criar acesso
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSignup} className="space-y-4">
                  <p className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
                    Somente prescritores já cadastrados no sistema podem criar acesso. Use o mesmo e-mail informado no seu cadastro.
                  </p>
                  <div className="space-y-2">
                    <Label>E-mail cadastrado</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="seu@email.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Criar Senha</Label>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Mínimo 6 caracteres" />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirmar Senha</Label>
                    <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                  </div>
                  {loginError && <p className="text-sm text-destructive">{loginError}</p>}
                  <Button type="submit" className="w-full" disabled={isSigningUp}>
                    {isSigningUp ? "Criando conta..." : "Criar Conta"}
                  </Button>
                  <div className="text-center">
                    <button
                      type="button"
                      className="text-sm text-primary hover:underline"
                      onClick={() => { setMode("login"); setLoginError(""); }}
                    >
                      Já tem conta? Fazer login
                    </button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Logged in but not a prescriber
  if (!doctor) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-md py-20 text-center">
          <Card>
            <CardContent className="py-12">
              <p className="text-muted-foreground">Sua conta não está vinculada a um prescritor.</p>
              <p className="text-sm text-muted-foreground mt-2">Entre em contato com o suporte.</p>
              <Button variant="outline" className="mt-4" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" /> Sair
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Build month options
  const months = Array.from(new Set(
    commissions?.map((c) => {
      const d = new Date(c.created_at);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }) ?? []
  )).sort().reverse();

  const filtered = commissions?.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (monthFilter !== "all") {
      const d = new Date(c.created_at);
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (m !== monthFilter) return false;
    }
    return true;
  });

  const totalCashback = filtered?.reduce((s, c) => s + Number(c.commission_value), 0) ?? 0;
  const paidCashback = filtered?.filter((c) => c.status === "paid").reduce((s, c) => s + Number(c.commission_value), 0) ?? 0;
  const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  const formatMonth = (m: string) => {
    const [y, mo] = m.split("-");
    const date = new Date(Number(y), Number(mo) - 1);
    return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Meus Cashbacks</h1>
            <p className="text-sm text-muted-foreground">Olá, {doctor.name}</p>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Mês" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os meses</SelectItem>
              {months.map((m) => (
                <SelectItem key={m} value={m}>{formatMonth(m)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Gerada</SelectItem>
              <SelectItem value="awaiting">Aguardando</SelectItem>
              <SelectItem value="paid">Paga</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Cashback</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{fmt(totalCashback)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pago</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold text-success">{fmt(paidCashback)}</p></CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Cupom</TableHead>
                  <TableHead>Valor Produtos</TableHead>
                  <TableHead>Taxa</TableHead>
                  <TableHead>Cashback</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : !filtered?.length ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum cashback encontrado</TableCell></TableRow>
                ) : (
                  filtered.map((c) => {
                    const st = STATUS_MAP[c.status] ?? STATUS_MAP.pending;
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="text-sm">{(c as any).orders?.customer_name ?? "—"}</TableCell>
                        <TableCell className="text-xs font-mono">{(c as any).orders?.coupon_code ?? "—"}</TableCell>
                        <TableCell>{fmt(Number(c.order_total))}</TableCell>
                        <TableCell>{c.commission_rate}%</TableCell>
                        <TableCell className="font-semibold">{fmt(Number(c.commission_value))}</TableCell>
                        <TableCell className="text-sm">{new Date(c.created_at).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell>
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
