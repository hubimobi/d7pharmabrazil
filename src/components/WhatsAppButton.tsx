import { MessageCircle } from "lucide-react";
import { useStoreSettings } from "@/hooks/useStoreSettings";

const WhatsAppButton = () => {
  const { data: settings } = useStoreSettings();

  if (settings && settings.whatsapp_button_enabled === false) return null;

  const phone = settings?.whatsapp?.replace(/\D/g, "") || "5511999999999";
  const message = settings?.whatsapp_button_message || "Olá! Gostaria de falar com um especialista.";
  const buttonName = settings?.whatsapp_button_name || "Fale com um Especialista";

  return (
    <a
      href={`https://wa.me/${phone}?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-success px-5 py-3 text-sm font-semibold text-success-foreground shadow-lg transition-transform hover:scale-105"
      aria-label={buttonName}
    >
      <MessageCircle className="h-5 w-5" />
      <span className="hidden sm:inline">{buttonName}</span>
    </a>
  );
};

export default WhatsAppButton;
