import { useEffect, useCallback, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Hook to track unsaved changes and warn before SPA navigation or browser close.
 * Works with BrowserRouter (no data router required).
 */
export function useUnsavedChangesGuard(onSave?: () => Promise<void> | void) {
  const [isDirty, setIsDirtyState] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const pendingPath = useRef<string | null>(null);
  const saveRef = useRef(onSave);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { saveRef.current = onSave; }, [onSave]);

  // Warn on browser close / refresh
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Intercept sidebar / link clicks via popstate
  useEffect(() => {
    if (!isDirty) return;

    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#")) return;
      if (href === location.pathname) return;

      e.preventDefault();
      e.stopPropagation();
      pendingPath.current = href;
      setShowDialog(true);
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [isDirty, location.pathname]);

  const setDirty = useCallback((v: boolean) => setIsDirtyState(v), []);

  const handleStay = useCallback(() => {
    pendingPath.current = null;
    setShowDialog(false);
  }, []);

  const handleLeave = useCallback(() => {
    const path = pendingPath.current;
    pendingPath.current = null;
    setShowDialog(false);
    setIsDirtyState(false);
    if (path) navigate(path);
  }, [navigate]);

  const handleSaveAndLeave = useCallback(async () => {
    try {
      if (saveRef.current) await saveRef.current();
      const path = pendingPath.current;
      pendingPath.current = null;
      setShowDialog(false);
      setIsDirtyState(false);
      if (path) navigate(path);
    } catch {
      // Save failed, stay on page
    }
  }, [navigate]);

  return {
    isDirty,
    setDirty,
    showDialog,
    handleStay,
    handleLeave,
    handleSaveAndLeave,
    hasSaveHandler: !!onSave,
  };
}
