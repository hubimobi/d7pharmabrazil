import { useState } from "react";
import { X } from "lucide-react";
import { useStoreSettings } from "@/hooks/useStoreSettings";

export default function NotificationBar() {
  const { data: settings } = useStoreSettings();
  const [dismissed, setDismissed] = useState(false);

  if (!settings?.notification_bar_enabled || dismissed) return null;

  const text = settings.notification_bar_text || "🚚 Frete Grátis para compras acima de R$ 499!";

  return (
    <div
      className="relative flex items-center justify-center px-4 py-2 text-sm font-medium"
      style={{
        backgroundColor: settings.notification_bar_bg_color || "#1a1a2e",
        color: settings.notification_bar_text_color || "#ffffff",
      }}
    >
      <span className="text-center">{text}</span>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
