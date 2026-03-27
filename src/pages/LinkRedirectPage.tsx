import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "d7_link_ref";
const REF_EXPIRY_DAYS = 30;

export function getActiveRef(): { linkId: string; code: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() > data.expiresAt) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return { linkId: data.linkId, code: data.code };
  } catch {
    return null;
  }
}

function setRef(linkId: string, code: string) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ linkId, code, expiresAt: Date.now() + REF_EXPIRY_DAYS * 86400000 })
  );
}

const LinkRedirectPage = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!code) { navigate("/", { replace: true }); return; }

    (async () => {
      // Fetch link
      const { data: link } = await supabase
        .from("short_links")
        .select("id, target_url, code")
        .eq("code", code)
        .eq("active", true)
        .single();

      if (!link) { navigate("/", { replace: true }); return; }

      // Save ref
      setRef(link.id, link.code);

      // Detect device
      const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);

      // Record click (non-blocking)
      supabase.from("link_clicks").insert({
        short_link_id: link.id,
        device_type: isMobile ? "mobile" : "desktop",
        referrer: document.referrer || "",
      }).then(() => {});

      // Increment counter
      supabase.rpc("increment_link_clicks", { link_id: link.id }).then(() => {});

      // GA4 event
      if (typeof window !== "undefined" && (window as any).gtag) {
        (window as any).gtag("event", "link_click", {
          link_code: link.code,
          link_id: link.id,
        });
      }

      // Redirect
      navigate(link.target_url, { replace: true });
    })();
  }, [code, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground animate-pulse">Redirecionando...</p>
    </div>
  );
};

export default LinkRedirectPage;
