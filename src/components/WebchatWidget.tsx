import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useStoreSettings } from "@/hooks/useStoreSettings";

export default function WebchatWidget() {
  const { data: settings } = useStoreSettings();
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  const isPublicStorefront = ["/", "/produtos"].includes(location.pathname) || location.pathname.startsWith("/produto/");
  const isCheckout = location.pathname === "/checkout";
  const hideOnCheckout = settings?.hide_chat_on_checkout && isCheckout;
  const shouldHide = !isPublicStorefront && !isCheckout;

  const delaySeconds = settings?.webchat_delay_seconds || 0;
  const showOnScroll = settings?.webchat_show_on_scroll ?? false;
  const position = settings?.webchat_position || "right";

  useEffect(() => {
    if (!settings?.webchat_enabled || !settings?.webchat_script || hideOnCheckout || shouldHide) return;

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
        if (window.scrollY > 300) setVisible(true);
      };
      window.addEventListener("scroll", scrollHandler, { passive: true });
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (scrollHandler) window.removeEventListener("scroll", scrollHandler);
    };
  }, [settings?.webchat_enabled, settings?.webchat_script, delaySeconds, showOnScroll]);

  useEffect(() => {
    if (!visible || !settings?.webchat_enabled || !settings?.webchat_script || hideOnCheckout || shouldHide) return;

    const container = document.createElement("div");
    container.id = "webchat-widget-container";
    if (position === "left") {
      container.style.cssText = "position:fixed;bottom:0;left:0;z-index:9999;";
    }
    document.body.appendChild(container);

    const temp = document.createElement("div");
    temp.innerHTML = settings.webchat_script;

    // Whitelist of allowed script domains for webchat widgets
    const ALLOWED_DOMAINS = [
      "cdn.jsdelivr.net", "unpkg.com", "cdnjs.cloudflare.com",
      "widget.intercom.io", "js.intercomcdn.com",
      "embed.tawk.to", "static.zdassets.com",
      "api.whatsapp.com", "web.whatsapp.com",
      "d3v4jsc54141g1.cloudfront.net", "static.hsappstatic.net",
      "js.driftt.com", "widget.crisp.chat",
      "cdn.botpress.cloud", "mediafiles.botpress.cloud",
    ];

    const isScriptAllowed = (script: HTMLScriptElement): boolean => {
      const src = script.getAttribute("src") || "";
      if (!src) return !!script.textContent; // inline scripts allowed
      try {
        const url = new URL(src);
        return ALLOWED_DOMAINS.some((d) => url.hostname === d || url.hostname.endsWith("." + d));
      } catch {
        return false;
      }
    };

    const scripts = temp.querySelectorAll("script");
    scripts.forEach((origScript) => {
      if (!isScriptAllowed(origScript)) {
        console.warn("[WebchatWidget] Blocked script from untrusted domain:", origScript.getAttribute("src"));
        return;
      }
      const newScript = document.createElement("script");
      Array.from(origScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      if (origScript.textContent) {
        newScript.textContent = origScript.textContent;
      }
      document.body.appendChild(newScript);
    });

    const nonScripts = temp.querySelectorAll(":not(script)");
    nonScripts.forEach((el) => container.appendChild(el.cloneNode(true)));

    return () => {
      container.remove();
      document.querySelectorAll('script[data-webchat="true"]').forEach((s) => s.remove());
    };
  }, [visible, settings?.webchat_enabled, settings?.webchat_script, position]);

  return null;
}
