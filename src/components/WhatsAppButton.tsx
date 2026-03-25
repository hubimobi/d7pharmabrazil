import { MessageCircle } from "lucide-react";

const WhatsAppButton = () => (
  <a
    href="https://wa.me/5511999999999?text=Olá! Gostaria de falar com um especialista."
    target="_blank"
    rel="noopener noreferrer"
    className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-success px-5 py-3 text-sm font-semibold text-success-foreground shadow-lg transition-transform hover:scale-105"
    aria-label="Fale com um especialista via WhatsApp"
  >
    <MessageCircle className="h-5 w-5" />
    <span className="hidden sm:inline">Fale com um especialista</span>
  </a>
);

export default WhatsAppButton;
