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

    // Background color / gradient
    const bgGradient = (settings as any).design_bg_gradient;
    if (bgGradient) {
      root.style.setProperty("--design-bg-gradient", bgGradient);
      document.body.style.background = bgGradient;
    } else if (settings.design_bg_color && settings.design_bg_color !== "#ffffff") {
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

    // Nav color
    const navColor = (settings as any).design_nav_color;
    if (navColor) {
      root.style.setProperty("--design-nav", navColor);
    }

    // Footer gradient
    const footerGradient = (settings as any).design_footer_gradient;
    if (footerGradient) {
      root.style.setProperty("--design-footer-gradient", footerGradient);
    }

    return () => {
      root.style.removeProperty("--font-sans");
      root.style.removeProperty("--design-bg");
      root.style.removeProperty("--design-bg-gradient");
      root.style.removeProperty("--design-title");
      root.style.removeProperty("--design-text");
      root.style.removeProperty("--design-nav");
      root.style.removeProperty("--design-footer-gradient");
      document.body.style.backgroundColor = "";
      document.body.style.background = "";
    };
  }, [settings]);

  return null;
}
