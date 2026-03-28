import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Loader2 } from "lucide-react";

const FinalCTA = () => {
  const { data: settings } = useStoreSettings();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const bgColor = (settings as any)?.mailing_bg_color || "#1a365d";
  const buttonColor = (settings as any)?.mailing_button_color || "#e53e3e";
  const titleColor = (settings as any)?.mailing_title_color || "#ffffff";
  const textColor = (settings as any)?.mailing_text_color || "#ffffffcc";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("popup_leads" as any)
        .insert({ email: email.trim(), source: "mailing_capture" } as any);
      if (error) throw error;
      toast.success("E-mail cadastrado com sucesso!");
      setEmail("");
    } catch {
      toast.error("Erro ao cadastrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative overflow-hidden py-12 md:py-24" style={{ backgroundColor: bgColor }}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/5 to-transparent" />
      <div className="container relative text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10 mb-6">
          <Mail className="h-7 w-7" style={{ color: titleColor }} />
        </div>
        <h2 className="text-2xl font-bold md:text-4xl" style={{ color: titleColor }}>
          {(settings as any)?.cta_title || "Fique por dentro das novidades"}
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm md:text-lg" style={{ color: textColor }}>
          {(settings as any)?.cta_subtitle || "Cadastre seu e-mail e seja o primeiro a receber promoções exclusivas e lançamentos."}
        </p>
        <form onSubmit={handleSubmit} className="mx-auto mt-8 flex max-w-md flex-col sm:flex-row gap-3">
          <Input
            type="email"
            required
            placeholder="Seu melhor e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50 h-12"
          />
          <Button
            type="submit"
            disabled={loading}
            className="h-12 px-6 font-semibold text-white shadow-lg hover:opacity-90 transition-opacity whitespace-nowrap"
            style={{ backgroundColor: buttonColor }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Quero receber novidades"}
          </Button>
        </form>
        <p className="mt-4 text-xs" style={{ color: textColor }}>
          Não enviamos spam. Você pode cancelar a qualquer momento.
        </p>
      </div>
    </section>
  );
};

export default FinalCTA;
