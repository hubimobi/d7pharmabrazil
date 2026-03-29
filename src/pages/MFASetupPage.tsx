import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Copy, Check, Smartphone } from "lucide-react";
import { useStoreSettings } from "@/hooks/useStoreSettings";

export default function MFASetupPage() {
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(true);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: settings } = useStoreSettings();

  useEffect(() => {
    enrollTOTP();
  }, []);

  const enrollTOTP = async () => {
    setIsEnrolling(true);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: settings?.store_name || "D7 Pharma",
    });
    if (error) {
      toast({ title: "Erro ao configurar 2FA", description: error.message, variant: "destructive" });
      setIsEnrolling(false);
      return;
    }
    if (data) {
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
    }
    setIsEnrolling(false);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyCode.length !== 6) {
      toast({ title: "Código inválido", description: "O código deve ter 6 dígitos.", variant: "destructive" });
      return;
    }
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
      code: verifyCode,
    });
    setIsLoading(false);
    if (verifyError) {
      toast({ title: "Código incorreto", description: "Verifique o código no app autenticador e tente novamente.", variant: "destructive" });
      return;
    }
    toast({ title: "2FA ativado!", description: "Autenticação de dois fatores configurada com sucesso." });
    navigate("/admin");
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] px-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Configurar Autenticação 2FA</h1>
            <p className="text-sm text-gray-500">
              Para sua segurança, é obrigatório ativar a autenticação de dois fatores.
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-5">
            {/* Step 1 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-bold">1</span>
                <span className="text-sm font-semibold text-gray-700">Baixe um app autenticador</span>
              </div>
              <div className="ml-8 flex items-center gap-3 text-xs text-gray-500">
                <Smartphone className="h-4 w-4 flex-shrink-0" />
                <span>Google Authenticator, Authy ou Microsoft Authenticator</span>
              </div>
            </div>

            {/* Step 2 — QR Code */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-bold">2</span>
                <span className="text-sm font-semibold text-gray-700">Escaneie o QR Code no app</span>
              </div>
              <div className="ml-8">
                {isEnrolling ? (
                  <div className="w-48 h-48 mx-auto bg-gray-100 rounded-xl animate-pulse" />
                ) : qrCode ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-3 bg-white border-2 border-gray-200 rounded-xl">
                      <img src={qrCode} alt="QR Code 2FA" className="w-44 h-44" />
                    </div>
                    <div className="w-full">
                      <p className="text-xs text-gray-400 mb-1 text-center">Ou insira a chave manualmente:</p>
                      <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                        <code className="text-xs font-mono text-gray-600 flex-1 break-all select-all">{secret}</code>
                        <button onClick={copySecret} className="text-gray-400 hover:text-primary transition-colors">
                          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-red-500">Erro ao gerar QR Code. Tente recarregar a página.</p>
                )}
              </div>
            </div>

            {/* Step 3 — Verify */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-bold">3</span>
                <span className="text-sm font-semibold text-gray-700">Digite o código gerado</span>
              </div>
              <form onSubmit={handleVerify} className="ml-8 space-y-3">
                <div>
                  <Label htmlFor="code" className="sr-only">Código</Label>
                  <Input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="000000"
                    className="h-12 text-center text-2xl font-mono tracking-[0.5em] border-gray-200"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    autoFocus
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 font-semibold"
                  disabled={isLoading || verifyCode.length !== 6}
                >
                  {isLoading ? "Verificando..." : "Ativar 2FA"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
