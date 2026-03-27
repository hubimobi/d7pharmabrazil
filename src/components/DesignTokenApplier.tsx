import { useEffect } from "react";
import { useStoreSettings } from "@/hooks/useStoreSettings";

/**
 * Applies dynamic design tokens from store_settings to the document.
 * Renders nothing — purely side-effect based.
 */
export default function DesignTokenApplier() {
  const { data: settings } = useStoreSettings();

  useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;

    // Font
    if (settings.design_font && settings.design_font !== "Inter") {
      // Load Google Font dynamically
      const fontId = "dynamic-font-link";
      let link = document.getElementById(fontId) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.id = fontId;
        link.rel = "stylesheet";
        document.head.appendChild(link);
      }
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(settings.design_font)}:wght@300;400;500;600;700&display=swap`;
      root.style.setProperty("--font-sans", `"${settings.design_font}", ui-sans-serif, system-ui, sans-serif`);
    }

    // Background color
    if (settings.design_bg_color && settings.design_bg_color !== "#ffffff") {
      root.style.setProperty("--design-bg", settings.design_bg_color);
      document.body.style.backgroundColor = settings.design_bg_color;
    }

    // Title color
    if (settings.design_title_color) {
      root.style.setProperty("--design-title", settings.design_title_color);
    }

    // Text color
    if (settings.design_text_color) {
      root.style.setProperty("--design-text", settings.design_text_color);
    }

    return () => {
      // Cleanup on unmount
      root.style.removeProperty("--font-sans");
      root.style.removeProperty("--design-bg");
      root.style.removeProperty("--design-title");
      root.style.removeProperty("--design-text");
      document.body.style.backgroundColor = "";
    };
  }, [settings]);

  return null;
}
