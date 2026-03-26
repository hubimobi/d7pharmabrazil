import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function PopupBanner() {
  const { data: settings } = useStoreSettings();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const enabled = settings?.popup_banner_enabled;
  const delay = settings?.popup_banner_delay_seconds || 5;

  useEffect(() => {
    if (!enabled) return;
    // Don't show again if already dismissed this session
    if (sessionStorage.getItem("popup-dismissed")) return;

    const timer = setTimeout(() => setOpen(true), delay * 1000);
    return () => clearTimeout(timer);
  }, [enabled, delay]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("popup_leads" as any).insert({ email, name, source: "popup" } as any);
      if (error) throw error;
      setSubmitted(true);
      toast.success("Cadastro realizado com sucesso!");
      setTimeout(() => {
        setOpen(false);
        sessionStorage.setItem("popup-dismissed", "1");
      }, 2000);
    } catch {
      toast.error("Erro ao cadastrar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    sessionStorage.setItem("popup-dismissed", "1");
  };

  if (!enabled) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-0">
        <button onClick={handleClose} className="absolute right-3 top-3 z-10 rounded-full bg-background/80 p-1 hover:bg-background transition" aria-label="Fechar">
          <X className="h-5 w-5" />
        </button>

        {settings?.popup_banner_image_url && (
          <img
            src={settings.popup_banner_image_url}
            alt="Promoção"
            className="w-full h-48 object-cover"
          />
        )}

        <div className="p-6 space-y-4">
          {settings?.popup_banner_title && (
            <h2 className="text-xl font-bold text-foreground">{settings.popup_banner_title}</h2>
          )}
          {settings?.popup_banner_description && (
            <p className="text-sm text-muted-foreground">{settings.popup_banner_description}</p>
          )}

          {settings?.popup_banner_collect_email && !submitted ? (
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                type="email"
                placeholder="Seu melhor e-mail"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Enviando..." : (settings?.popup_banner_cta_text || "Cadastre-se")}
              </Button>
            </form>
          ) : submitted ? (
            <div className="text-center py-4">
              <p className="text-primary font-semibold">✓ Cadastrado com sucesso!</p>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
