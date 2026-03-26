import { useState, useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { useStoreSettings } from "@/hooks/useStoreSettings";

const WhatsAppButton = () => {
  const { data: settings } = useStoreSettings();
  const [visible, setVisible] = useState(false);

  const delaySeconds = settings?.whatsapp_delay_seconds || 0;
  const showOnScroll = settings?.whatsapp_show_on_scroll ?? false;
  const position = settings?.whatsapp_position || "right";

  useEffect(() => {
    if (settings && settings.whatsapp_button_enabled === false) return;

    const shouldDelay = delaySeconds > 0;
    const shouldScroll = showOnScroll;

    if (!shouldDelay && !shouldScroll) {
      setVisible(true);
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    let scrollHandler: (() => void) | undefined;

    if (shouldDelay) {
      timer = setTimeout(() => setVisible(true), delaySeconds * 1000);
    }

    if (shouldScroll) {
      scrollHandler = () => {
        if (window.scrollY > 300) {
          setVisible(true);
        }
      };
      window.addEventListener("scroll", scrollHandler, { passive: true });
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (scrollHandler) window.removeEventListener("scroll", scrollHandler);
    };
  }, [settings?.whatsapp_button_enabled, delaySeconds, showOnScroll]);

  if (settings && settings.whatsapp_button_enabled === false) return null;
  if (!visible) return null;

  const phone = settings?.whatsapp?.replace(/\D/g, "") || "5511999999999";
  const message = settings?.whatsapp_button_message || "Olá! Gostaria de falar com um especialista.";
  const buttonName = settings?.whatsapp_button_name || "Fale com um Especialista";

  return (
    <a
      href={`https://wa.me/${phone}?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`fixed bottom-6 z-50 flex items-center gap-2 rounded-full bg-success px-5 py-3 text-sm font-semibold text-success-foreground shadow-lg transition-all hover:scale-105 animate-fade-in ${
        position === "left" ? "left-6" : "right-6"
      }`}
      aria-label={buttonName}
    >
      <MessageCircle className="h-5 w-5" />
      <span className="hidden sm:inline">{buttonName}</span>
    </a>
  );
};

export default WhatsAppButton;
