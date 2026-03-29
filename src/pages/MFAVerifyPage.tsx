import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck } from "lucide-react";

export default function MFAVerifyPage() {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadFactor();
  }, []);

  const loadFactor = async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error || !data) return;
    const totpFactor = data.totp.find((f) => f.status === "verified");
    if (totpFactor) {
      setFactorId(totpFactor.id);
    } else {
      // No verified factor, redirect to setup
      navigate("/mfa-setup", { replace: true });
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId || code.length !== 6) return;
    setIsLoading(true);

    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) {
      toast({ title: "Erro", description: challengeError.message, variant: "destructive" });
      setIsLoading(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    });
    setIsLoading(false);

    if (verifyError) {
      toast({ title: "Código incorreto", description: "Tente novamente.", variant: "destructive" });
      setCode("");
      return;
    }
    navigate("/admin", { replace: true });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Verificação 2FA</h1>
            <p className="text-sm text-gray-500">
              Digite o código do seu app autenticador
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <Label htmlFor="mfa-code" className="sr-only">Código</Label>
              <Input
                id="mfa-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                className="h-14 text-center text-3xl font-mono tracking-[0.5em] border-gray-200"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                autoFocus
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 font-semibold"
              disabled={isLoading || code.length !== 6}
            >
              {isLoading ? "Verificando..." : "Verificar"}
            </Button>
          </form>

          <button
            onClick={handleLogout}
            className="w-full text-center text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Sair e usar outra conta
          </button>
        </div>
      </div>
    </div>
  );
}
