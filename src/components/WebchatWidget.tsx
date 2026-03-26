import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useStoreSettings } from "@/hooks/useStoreSettings";

export default function WebchatWidget() {
  const { data: settings } = useStoreSettings();
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  const isCheckout = location.pathname === "/checkout";
  const hideOnCheckout = settings?.hide_chat_on_checkout && isCheckout;

  const delaySeconds = settings?.webchat_delay_seconds || 0;
  const showOnScroll = settings?.webchat_show_on_scroll ?? false;
  const position = settings?.webchat_position || "right";

  useEffect(() => {
    if (!settings?.webchat_enabled || !settings?.webchat_script) return;

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
    if (!visible || !settings?.webchat_enabled || !settings?.webchat_script) return;

    const container = document.createElement("div");
    container.id = "webchat-widget-container";
    if (position === "left") {
      container.style.cssText = "position:fixed;bottom:0;left:0;z-index:9999;";
    }
    document.body.appendChild(container);

    const temp = document.createElement("div");
    temp.innerHTML = settings.webchat_script;

    const scripts = temp.querySelectorAll("script");
    scripts.forEach((origScript) => {
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
