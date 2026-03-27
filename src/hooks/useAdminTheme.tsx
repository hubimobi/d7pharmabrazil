import { useState, useEffect, useCallback } from "react";
import { useStoreSettings } from "@/hooks/useStoreSettings";

export type AdminTheme = "dark" | "light" | "company";

function hexToHSL(hex: string): string {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function useAdminTheme() {
  const [theme, setThemeState] = useState<AdminTheme>(() => {
    return (localStorage.getItem("admin-theme") as AdminTheme) || "dark";
  });
  const { data: settings } = useStoreSettings();

  const setTheme = useCallback((t: AdminTheme) => {
    setThemeState(t);
    localStorage.setItem("admin-theme", t);
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    // Clear company custom properties first
    root.style.removeProperty("--primary");
    root.style.removeProperty("--sidebar-primary");

    if (theme === "company" && settings) {
      root.setAttribute("data-admin-theme", "company");
      // Apply company colors from store settings
      const titleColor = settings.design_title_color;
      const navColor = (settings as any).design_nav_color;
      if (titleColor) {
        const hsl = hexToHSL(titleColor);
        root.style.setProperty("--primary", hsl);
        root.style.setProperty("--sidebar-primary", hsl);
      }
      if (navColor) {
        const hsl = hexToHSL(navColor);
        root.style.setProperty("--sidebar-background", hsl);
      }
    } else {
      root.setAttribute("data-admin-theme", theme);
    }

    return () => {
      root.removeAttribute("data-admin-theme");
      root.style.removeProperty("--primary");
      root.style.removeProperty("--sidebar-primary");
      root.style.removeProperty("--sidebar-background");
    };
  }, [theme, settings]);

  return { theme, setTheme };
}
