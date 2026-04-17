import { useEffect } from "react";
import { useStoreSettings } from "@/hooks/useStoreSettings";

/**
 * Updates document title, favicon, and theme meta tags based on the
 * current tenant's store settings. Pure side-effect — renders nothing.
 */
export default function DynamicBranding() {
  const { data: settings } = useStoreSettings();

  useEffect(() => {
    if (!settings) return;

    const storeName = settings.store_name || "Loja";

    // Title — only update if it still contains the loading placeholder
    // or the previous tenant name. We always set a base title; per-page
    // SEOHead will override with `${pageTitle} | ${storeName}`.
    if (!document.title || document.title === "Carregando…" || !document.title.includes(storeName)) {
      const seoDefault = (settings as any).seo_default_title;
      document.title = seoDefault ? `${storeName} | ${seoDefault}` : storeName;
    }

    // Favicon
    if (settings.favicon_url) {
      let link = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = settings.favicon_url;
    }

    // Apple mobile title
    const setMeta = (name: string, content: string, isProperty = false) => {
      const sel = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let el = document.querySelector(sel) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        if (isProperty) el.setAttribute("property", name);
        else el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("apple-mobile-web-app-title", storeName);
    setMeta("application-name", storeName);
    setMeta("og:site_name", storeName, true);

    // Theme color
    const bgColor = settings.design_bg_color;
    if (bgColor && bgColor !== "#ffffff") {
      setMeta("theme-color", bgColor);
    }
  }, [settings]);

  return null;
}
