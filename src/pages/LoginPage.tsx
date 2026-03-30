import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Lock, Mail, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [magicEmail, setMagicEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: settings } = useStoreSettings();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    if (error) {
      toast({ title: "Erro ao entrar", description: "Email ou senha incorretos.", variant: "destructive" });
      return;
    }
    await handlePostLogin();
  };

  const handlePostLogin = async () => {
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const hasVerifiedTOTP = factorsData?.totp?.some((f) => f.status === "verified");
    if (hasVerifiedTOTP) {
      navigate("/mfa-verify");
    } else {
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "");
      const adminRoles = ["super_admin", "suporte", "administrador", "gestor", "financeiro", "admin"];
      const isAdmin = rolesData?.some((r) => adminRoles.includes(r.role));
      if (isAdmin) {
        navigate("/mfa-setup");
      } else {
        navigate("/admin");
      }
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magicEmail.trim() || !magicEmail.includes("@")) {
      toast({ title: "Email inválido", description: "Digite um email válido.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: magicEmail,
      options: { emailRedirectTo: window.location.origin + "/admin" },
    });
    setIsLoading(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setMagicLinkSent(true);
      toast({ title: "Link enviado!", description: "Verifique seu email para acessar." });
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) {
      toast({ title: "Erro", description: "Falha ao conectar com Google.", variant: "destructive" });
    }
  };

  const handleAppleLogin = async () => {
    const { error } = await lovable.auth.signInWithOAuth("apple", {
      redirect_uri: window.location.origin,
    });
    if (error) {
      toast({ title: "Erro", description: "Falha ao conectar com Apple.", variant: "destructive" });
    }
  };

  const storeName = settings?.store_name || "D7 Pharma";
  const logoUrl = settings?.logo_url;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left — Form */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12 lg:py-0">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Bem-vindo ao {storeName}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Escolha como deseja acessar
            </p>
          </div>

          {/* Social login buttons */}
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full h-12 gap-3 text-sm font-medium border-gray-200 hover:bg-gray-50"
              onClick={handleGoogleLogin}
              disabled={isLoading}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continuar com Google
            </Button>

            <Button
              variant="outline"
              className="w-full h-12 gap-3 text-sm font-medium border-gray-200 hover:bg-gray-50"
              onClick={handleAppleLogin}
              disabled={isLoading}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Continuar com Apple
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-3 text-gray-400">ou</span></div>
          </div>

          <Tabs defaultValue="password" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-10">
              <TabsTrigger value="password" className="text-xs">Email e Senha</TabsTrigger>
              <TabsTrigger value="magic" className="text-xs">Link Mágico</TabsTrigger>
            </TabsList>

            <TabsContent value="password" className="mt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    className="h-12 border-gray-200 bg-gray-50/50 focus:bg-white"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
                    Senha <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="h-12 border-gray-200 bg-gray-50/50 focus:bg-white"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox id="remember" />
                    <label htmlFor="remember" className="text-sm text-gray-500 cursor-pointer">
                      Lembrar acesso
                    </label>
                  </div>
                  <Link to="/esqueci-senha" className="text-sm font-medium text-primary hover:underline">
                    Esqueci minha senha
                  </Link>
                </div>

                <Button type="submit" className="w-full h-12 text-base font-semibold rounded-lg" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Entrando...</> : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="magic" className="mt-4">
              {magicLinkSent ? (
                <div className="text-center py-8 space-y-3">
                  <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                    <Mail className="h-8 w-8 text-success" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Link enviado!</h3>
                  <p className="text-sm text-gray-500">
                    Verifique seu email <strong>{magicEmail}</strong> e clique no link para acessar.
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => setMagicLinkSent(false)}>
                    Enviar novamente
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleMagicLink} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-gray-700">
                      Email <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      className="h-12 border-gray-200 bg-gray-50/50 focus:bg-white"
                      value={magicEmail}
                      onChange={(e) => setMagicEmail(e.target.value)}
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    Enviaremos um link de acesso direto para seu email. Sem necessidade de senha.
                  </p>
                  <Button type="submit" className="w-full h-12 text-base font-semibold rounded-lg gap-2" disabled={isLoading}>
                    {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : <><Mail className="h-4 w-4" /> Enviar Link Mágico</>}
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right — Branded panel */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden items-center justify-center"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(250 60% 30%) 50%, hsl(220 70% 20%) 100%)",
        }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-15" style={{ background: "hsl(45 90% 55%)" }} />
          <div className="absolute top-10 right-32 w-40 h-40 rounded-full opacity-10" style={{ background: "hsl(190 80% 50%)" }} />
          <div className="absolute bottom-20 -left-16 w-56 h-56 rounded-full opacity-10" style={{ background: "hsl(220 80% 60%)" }} />
          <div className="absolute bottom-40 right-10 w-32 h-32 rounded-full opacity-10" style={{ background: "hsl(260 70% 50%)" }} />
          <div className="absolute top-1/3 left-10 w-20 h-20 rounded-full opacity-20" style={{ background: "hsl(45 90% 55%)" }} />
          <div className="absolute top-1/4 right-1/4 w-24 h-24 opacity-15"
            style={{ backgroundImage: "radial-gradient(circle, white 1.5px, transparent 1.5px)", backgroundSize: "8px 8px" }}
          />
          <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 600 800">
            <path d="M -50 200 Q 300 100 650 300" stroke="white" strokeWidth="1.5" fill="none" />
            <path d="M -50 500 Q 300 400 650 600" stroke="hsl(190 80% 60%)" strokeWidth="1" fill="none" />
          </svg>
        </div>

        <div className="relative z-10 text-center px-12 space-y-6">
          {logoUrl ? (
            <img src={logoUrl} alt={storeName} className="h-20 w-20 mx-auto object-contain rounded-2xl bg-white/10 p-2" />
          ) : (
            <div className="mx-auto w-20 h-20 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
              <Lock className="h-10 w-10 text-white" />
            </div>
          )}
          <h2 className="text-3xl font-bold text-white">Painel Administrativo</h2>
          <p className="text-white/70 text-base max-w-xs mx-auto">
            Gerencie seus produtos, pedidos e clientes em um só lugar
          </p>
        </div>
      </div>
    </div>
  );
}
