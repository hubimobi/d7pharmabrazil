import { useState, useEffect, useRef } from "react";
import { Copy, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface PixPaymentResultProps {
  encodedImage: string;
  payload: string;
  expirationDate?: string;
  total: number;
  paymentId?: string;
  orderId?: string;
  onConfirmed?: () => void;
}

export default function PixPaymentResult({
  encodedImage,
  payload,
  total,
  paymentId,
  orderId,
  onConfirmed,
}: PixPaymentResultProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copyCode = () => {
    navigator.clipboard.writeText(payload);
    setCopied(true);
    toast.success("Código Pix copiado!");
    setTimeout(() => setCopied(false), 3000);
  };

  // Poll for payment confirmation
  useEffect(() => {
    if (!paymentId || confirmed) return;

    const checkStatus = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("check-payment-status", {
          body: { payment_id: paymentId, order_id: orderId },
        });
        if (error) return;
        if (data?.status === "CONFIRMED" || data?.status === "RECEIVED") {
          setConfirmed(true);
          toast.success("Pagamento confirmado! 🎉");
          onConfirmed?.();
          if (intervalRef.current) clearInterval(intervalRef.current);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          if (orderId) navigate(`/pedido-confirmado/${orderId}`);
        }
      } catch {
        // silently retry
      }
    };

    intervalRef.current = setInterval(checkStatus, 5000);
    // Auto-stop after 15 minutes
    timeoutRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }, 15 * 60 * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [paymentId, orderId, confirmed, onConfirmed]);

  if (confirmed) {
    return (
      <div className="flex flex-col items-center space-y-4 rounded-lg border border-border bg-card p-6 text-center">
        <CheckCircle className="h-12 w-12 text-success" />
        <h2 className="text-xl font-bold">Pagamento Confirmado!</h2>
        <p className="text-muted-foreground">
          Seu pedido foi confirmado com sucesso. Você receberá um email com os detalhes.
        </p>
        {orderId && (
          <p className="text-sm text-muted-foreground">
            Pedido: <span className="font-mono">{orderId.slice(0, 8)}</span>
          </p>
        )}
        <Link to="/produtos">
          <Button>Continuar Comprando</Button>
        </Link>
      </div>
    );
  }

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

      {paymentId && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Aguardando confirmação do pagamento...
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Após o pagamento, a confirmação será automática em alguns segundos.
      </p>
    </div>
  );
}
