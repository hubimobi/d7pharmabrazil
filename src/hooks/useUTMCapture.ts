import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { captureUTMs, trackPageView } from "@/lib/tracking";

export function useUTMCapture() {
  const location = useLocation();
  const initialRef = useRef(false);

  // Capture UTMs on first load
  useEffect(() => {
    if (!initialRef.current) {
      initialRef.current = true;
      captureUTMs();
    }
  }, []);

  // Track page_view on every route change
  useEffect(() => {
    trackPageView(window.location.href);
  }, [location.pathname, location.search]);
}
