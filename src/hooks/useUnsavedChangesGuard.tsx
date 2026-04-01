import { useEffect, useCallback, useRef, useState } from "react";

/**
 * Hook to track unsaved changes and warn before navigation.
 * Returns { setDirty, isDirty, confirmNavigation, UnsavedDialog }
 */
export function useUnsavedChangesGuard(onSave?: () => Promise<void> | void) {
  const [isDirty, setIsDirty] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const saveRef = useRef(onSave);
  saveRef.current = onSave;

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

  const setDirty = useCallback((v: boolean) => setIsDirty(v), []);

  const requestNavigation = useCallback((href: string) => {
    if (!isDirty) {
      window.location.href = href;
      return;
    }
    setPendingHref(href);
  }, [isDirty]);

  const handleStay = useCallback(() => setPendingHref(null), []);
  const handleLeave = useCallback(() => {
    setIsDirty(false);
    if (pendingHref) {
      // Use timeout to let state settle
      const href = pendingHref;
      setPendingHref(null);
      setTimeout(() => { window.location.href = href; }, 0);
    }
  }, [pendingHref]);

  const handleSaveAndLeave = useCallback(async () => {
    try {
      if (saveRef.current) await saveRef.current();
      setIsDirty(false);
      if (pendingHref) {
        const href = pendingHref;
        setPendingHref(null);
        setTimeout(() => { window.location.href = href; }, 100);
      }
    } catch {
      // Save failed, stay on page
    }
  }, [pendingHref]);

  return {
    isDirty,
    setDirty,
    requestNavigation,
    showDialog: pendingHref !== null,
    handleStay,
    handleLeave,
    handleSaveAndLeave,
    hasSaveHandler: !!onSave,
  };
}
