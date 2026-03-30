import { Shield, ShieldCheck, Lock, RefreshCw } from "lucide-react";

export default function TrustMicroTexts() {
  return (
    <div className="space-y-2 mt-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5 text-success shrink-0" />
        <span>Pagamento processado em ambiente criptografado (SSL 256-bit)</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-success shrink-0" />
        <span>Garantia de 7 dias ou seu dinheiro de volta</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Shield className="h-3.5 w-3.5 text-success shrink-0" />
        <span>Seus dados estão protegidos e não serão compartilhados</span>
      </div>
    </div>
  );
}
