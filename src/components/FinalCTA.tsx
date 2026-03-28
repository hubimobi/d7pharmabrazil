import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";

type Step = "email" | "extra" | "done";

const FinalCTA = () => {
  const { data: settings } = useStoreSettings();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("email");
  const [leadId, setLeadId] = useState<string | null>(null);

  const bgColor = (settings as any)?.mailing_bg_color || "#08090A";
  const buttonColor = (settings as any)?.mailing_button_color || "#e53e3e";
  const titleColor = (settings as any)?.mailing_title_color || "#ffffff";
  const textColor = (settings as any)?.mailing_text_color || "#ffffffcc";

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("popup_leads" as any)
        .insert({ email: email.trim(), source: "mailing_capture" } as any)
        .select("id")
        .single();
      if (error) throw error;
      setLeadId((data as any)?.id || null);
      setStep("extra");
    } catch {
      toast.error("Erro ao cadastrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleExtraSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    setLoading(true);
    try {
      if (leadId) {
        await supabase
          .from("popup_leads" as any)
          .update({ name: name.trim(), phone: phone.trim() } as any)
          .eq("id", leadId);
      }
      setStep("done");
    } catch {
      toast.error("Erro ao salvar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    setStep("done");
  };

  return (
    <section className="relative overflow-hidden rounded-container mx-4 md:mx-8 mb-8" style={{ backgroundColor: bgColor }}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/5 to-transparent" />
      <div className="container relative py-16 md:py-28 text-center">
        {step === "email" && (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full glass mb-6">
              <Mail className="h-7 w-7" style={{ color: titleColor }} />
            </div>
            <h2 className="heading-section" style={{ color: titleColor }}>
              {(settings as any)?.cta_title || "Fique por dentro das novidades"}
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base md:text-lg" style={{ color: textColor }}>
              {(settings as any)?.cta_subtitle || "Cadastre seu e-mail e seja o primeiro a receber promoções exclusivas e lançamentos."}
            </p>
            <form onSubmit={handleEmailSubmit} className="mx-auto mt-10 flex max-w-md flex-col sm:flex-row gap-3">
              <Input
                type="email"
                required
                placeholder="Seu melhor e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50 h-12 rounded-full px-5"
              />
              <Button
                type="submit"
                disabled={loading}
                className="h-12 px-8 font-semibold text-white shadow-lg hover:opacity-90 transition-opacity whitespace-nowrap rounded-full text-[11.2px] uppercase tracking-wide"
                style={{ backgroundColor: buttonColor }}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Quero receber novidades"}
              </Button>
            </form>
            <p className="mt-5 text-xs" style={{ color: textColor }}>
              Não enviamos spam. Você pode cancelar a qualquer momento.
            </p>
          </>
        )}

        {step === "extra" && (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full glass mb-6">
              <Mail className="h-7 w-7" style={{ color: titleColor }} />
            </div>
            <h2 className="heading-section" style={{ color: titleColor }}>
              Receba também as novidades direto no seu WhatsApp!
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base md:text-lg" style={{ color: textColor }}>
              Preencha seu nome e WhatsApp para não perder nenhuma promoção.
            </p>
            <form onSubmit={handleExtraSubmit} className="mx-auto mt-10 flex max-w-md flex-col gap-3">
              <Input
                type="text"
                required
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-12 rounded-full px-5"
              />
              <Input
                type="tel"
                required
                placeholder="Seu WhatsApp (ex: 11999999999)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-12 rounded-full px-5"
              />
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-12 px-8 font-semibold text-white shadow-lg hover:opacity-90 transition-opacity rounded-full text-[11.2px] uppercase tracking-wide"
                  style={{ backgroundColor: buttonColor }}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Quero receber"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleSkip}
                  className="h-12 px-8 font-medium hover:bg-white/10 transition-colors rounded-full"
                  style={{ color: textColor }}
                >
                  Não, obrigado
                </Button>
              </div>
            </form>
          </>
        )}

        {step === "done" && (
          <div className="py-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 mb-6">
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
            <h2 className="heading-section" style={{ color: titleColor }}>
              Obrigado! Seu cadastro foi enviado com sucesso!
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base md:text-lg" style={{ color: textColor }}>
              Em breve você receberá as melhores ofertas e novidades.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default FinalCTA;
