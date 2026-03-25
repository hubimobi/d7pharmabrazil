import { useEffect } from "react";
import { useStoreSettings } from "@/hooks/useStoreSettings";

export default function WebchatWidget() {
  const { data: settings } = useStoreSettings();

  useEffect(() => {
    if (!settings?.webchat_enabled || !settings?.webchat_script) return;

    // Create a container and inject the script
    const container = document.createElement("div");
    container.id = "webchat-widget-container";
    document.body.appendChild(container);

    // Parse and execute scripts from the webchat_script HTML
    const temp = document.createElement("div");
    temp.innerHTML = settings.webchat_script;

    const scripts = temp.querySelectorAll("script");
    scripts.forEach((origScript) => {
      const newScript = document.createElement("script");
      // Copy attributes
      Array.from(origScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      // Copy inline content
      if (origScript.textContent) {
        newScript.textContent = origScript.textContent;
      }
      document.body.appendChild(newScript);
    });

    // Append non-script elements
    const nonScripts = temp.querySelectorAll(":not(script)");
    nonScripts.forEach((el) => container.appendChild(el.cloneNode(true)));

    return () => {
      container.remove();
      // Clean up injected scripts
      document.querySelectorAll('script[data-webchat="true"]').forEach((s) => s.remove());
    };
  }, [settings?.webchat_enabled, settings?.webchat_script]);

  return null;
}
