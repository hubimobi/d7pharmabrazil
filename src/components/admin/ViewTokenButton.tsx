import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Copy, Check, KeyRound, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ViewTokenButtonProps {
  /** Human label shown in the dialog title */
  label: string;
  /** Secret names to fetch (server-side allowlist enforced) */
  secretNames: string[];
  /** Optional button size */
  size?: "sm" | "default";
  variant?: "outline" | "ghost" | "secondary";
}

export function ViewTokenButton({ label, secretNames, size = "sm", variant = "outline" }: ViewTokenButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState<Record<string, string | null>>({});
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-integration-secret", {
        body: { names: secretNames },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setValues(data.secrets || {});
    } catch (err: any) {
      toast.error(err?.message === "forbidden" ? "Apenas super admin pode ver tokens." : `Erro: ${err?.message || "Falha ao carregar."}`);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (o: boolean) => {
    setOpen(o);
    if (o) {
      setValues({});
      setReveal({});
      load();
    }
  };

  const copy = async (name: string, value: string | null) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(name);
    toast.success("Copiado!");
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <>
      <Button variant={variant} size={size} onClick={() => handleOpen(true)}>
        <KeyRound className="h-4 w-4 mr-2" />
        Ver token
      </Button>
      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Credenciais — {label}</DialogTitle>
            <DialogDescription>
              Valores sensíveis. Não compartilhe. Acesso restrito a super admin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
              </div>
            ) : (
              secretNames.map((name) => {
                const value = values[name];
                const shown = reveal[name];
                return (
                  <div key={name} className="space-y-1">
                    <Label className="text-xs">{name}</Label>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        type={shown ? "text" : "password"}
                        value={value ?? "(não configurado)"}
                        className="font-mono text-xs"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={!value}
                        onClick={() => setReveal((r) => ({ ...r, [name]: !r[name] }))}
                        title={shown ? "Ocultar" : "Revelar"}
                      >
                        {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={!value}
                        onClick={() => copy(name, value)}
                        title="Copiar"
                      >
                        {copied === name ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
