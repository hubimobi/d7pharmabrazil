import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const DISMISS_KEY = "popup-dismissed-at";

function isDismissed(reappearHours: number): boolean {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  if (isNaN(dismissedAt)) return false;
  const elapsed = Date.now() - dismissedAt;
  return elapsed < reappearHours * 60 * 60 * 1000;
}

function markDismissed() {
  localStorage.setItem(DISMISS_KEY, String(Date.now()));
}

export default function PopupBanner() {
  const { data: settings } = useStoreSettings();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const s = settings as any;
  const enabled = s?.popup_banner_enabled;
  const delay = s?.popup_banner_delay_seconds || 5;
  const reappearHours = s?.popup_banner_reappear_hours ?? 24;

  const isPublicStorefront = ["/", "/produtos"].includes(location.pathname) || location.pathname.startsWith("/produto/");

  useEffect(() => {
    if (!enabled || !isPublicStorefront) return;
    if (isDismissed(reappearHours)) return;

    const timer = setTimeout(() => setOpen(true), delay * 1000);
    return () => clearTimeout(timer);
  }, [enabled, delay, isPublicStorefront, reappearHours]);

  useEffect(() => {
    if (!enabled || !isPublicStorefront || open) return;
    if (isDismissed(reappearHours)) return;

    const timer = setTimeout(() => setOpen(true), delay * 1000);
    return () => clearTimeout(timer);
  }, [location.pathname, enabled, isPublicStorefront, delay, open, reappearHours]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("popup_leads" as any).insert({ email, name, phone: phone || null, source: "popup" } as any);
      if (error) throw error;
      setSubmitted(true);
      toast.success("Cadastro realizado com sucesso!");
      setTimeout(() => {
        setOpen(false);
        markDismissed();
      }, 2000);
    } catch {
      toast.error("Erro ao cadastrar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    markDismissed();
  };

  if (!enabled || !isPublicStorefront) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-0">
        <button onClick={handleClose} className="absolute right-3 top-3 z-10 rounded-full bg-background/80 p-1 hover:bg-background transition" aria-label="Fechar">
          <X className="h-5 w-5" />
        </button>

        {s?.popup_banner_image_url && (
          <img
            src={s.popup_banner_image_url}
            alt="Promoção"
            className="w-full h-48 object-cover"
          />
        )}

        <div className="p-6 space-y-4">
          {s?.popup_banner_title && (
            <h2 className="text-xl font-bold text-foreground">{s.popup_banner_title}</h2>
          )}
          {s?.popup_banner_description && (
            <p className="text-sm text-muted-foreground">{s.popup_banner_description}</p>
          )}

          {s?.popup_banner_collect_email && !submitted ? (
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} />
              <Input type="email" placeholder="Seu melhor e-mail" required value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input type="tel" placeholder="WhatsApp (00) 00000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Enviando..." : (s?.popup_banner_cta_text || "Cadastre-se")}
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
