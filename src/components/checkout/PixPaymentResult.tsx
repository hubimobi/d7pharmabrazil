import { useState } from "react";
import { Copy, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PixPaymentResultProps {
  encodedImage: string;
  payload: string;
  expirationDate?: string;
  total: number;
}

export default function PixPaymentResult({ encodedImage, payload, total }: PixPaymentResultProps) {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(payload);
    setCopied(true);
    toast.success("Código Pix copiado!");
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="flex flex-col items-center space-y-4 rounded-lg border border-border bg-card p-6 text-center">
      <CheckCircle className="h-10 w-10 text-success" />
      <h2 className="text-xl font-bold">Pagamento via Pix</h2>
      <p className="text-sm text-muted-foreground">
        Escaneie o QR Code abaixo ou copie o código Pix para pagar
      </p>
      <p className="text-2xl font-bold text-primary">
        R$ {total.toFixed(2).replace(".", ",")}
      </p>

      <div className="rounded-lg border border-border bg-background p-4">
        <img
          src={`data:image/png;base64,${encodedImage}`}
          alt="QR Code Pix"
          className="h-48 w-48"
        />
      </div>

      <div className="w-full space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Pix Copia e Cola:</p>
        <div className="flex gap-2">
          <input
            readOnly
            value={payload}
            className="flex-1 rounded-md border border-border bg-muted px-3 py-2 text-xs"
          />
          <Button variant="outline" size="sm" onClick={copyCode} className="gap-1 shrink-0">
            {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiado!" : "Copiar"}
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Após o pagamento, a confirmação será automática em alguns segundos.
      </p>
    </div>
  );
}
