import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Lock, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useStoreSettings } from "@/hooks/useStoreSettings";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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
    } else {
      navigate("/admin");
    }
  };

  const storeName = settings?.store_name || "D7 Pharma";
  const logoUrl = settings?.logo_url;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left — Form */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12 lg:py-0">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Bem-vindo ao {storeName}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Faça login com suas credenciais abaixo
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold rounded-lg"
              disabled={isLoading}
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </div>
      </div>

      {/* Right — Branded panel */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden items-center justify-center"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(250 60% 30%) 50%, hsl(220 70% 20%) 100%)",
        }}
      >
        {/* Decorative circles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-15"
            style={{ background: "hsl(45 90% 55%)" }} />
          <div className="absolute top-10 right-32 w-40 h-40 rounded-full opacity-10"
            style={{ background: "hsl(190 80% 50%)" }} />
          <div className="absolute bottom-20 -left-16 w-56 h-56 rounded-full opacity-10"
            style={{ background: "hsl(220 80% 60%)" }} />
          <div className="absolute bottom-40 right-10 w-32 h-32 rounded-full opacity-10"
            style={{ background: "hsl(260 70% 50%)" }} />
          <div className="absolute top-1/3 left-10 w-20 h-20 rounded-full opacity-20"
            style={{ background: "hsl(45 90% 55%)" }} />
          {/* Dotted pattern */}
          <div className="absolute top-1/4 right-1/4 w-24 h-24 opacity-15"
            style={{
              backgroundImage: "radial-gradient(circle, white 1.5px, transparent 1.5px)",
              backgroundSize: "8px 8px",
            }}
          />
          <div className="absolute bottom-1/3 left-1/4 w-32 h-32 opacity-10"
            style={{
              backgroundImage: "radial-gradient(circle, white 1.5px, transparent 1.5px)",
              backgroundSize: "10px 10px",
            }}
          />
          {/* Curved lines */}
          <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 600 800">
            <path d="M -50 200 Q 300 100 650 300" stroke="white" strokeWidth="1.5" fill="none" />
            <path d="M -50 500 Q 300 400 650 600" stroke="hsl(190 80% 60%)" strokeWidth="1" fill="none" />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 text-center px-12 space-y-6">
          {logoUrl ? (
            <img src={logoUrl} alt={storeName} className="h-20 w-20 mx-auto object-contain rounded-2xl bg-white/10 p-2" />
          ) : (
            <div className="mx-auto w-20 h-20 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
              <Lock className="h-10 w-10 text-white" />
            </div>
          )}
          <h2 className="text-3xl font-bold text-white">
            Painel Administrativo
          </h2>
          <p className="text-white/70 text-base max-w-xs mx-auto">
            Gerencie seus produtos, pedidos e clientes em um só lugar
          </p>
        </div>
      </div>
    </div>
  );
}
