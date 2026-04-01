import { useEffect, useCallback, useState, useRef } from "react";
import { useBlocker } from "react-router-dom";

/**
 * Hook to track unsaved changes and warn before SPA navigation or browser close.
 * Pass onSave as a stable callback or it will be captured via ref.
 */
export function useUnsavedChangesGuard(onSave?: () => Promise<void> | void) {
  const [isDirty, setIsDirtyState] = useState(false);
  const saveRef = useRef(onSave);
  useEffect(() => { saveRef.current = onSave; }, [onSave]);

  const blocker = useBlocker(isDirty);

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

  const setDirty = useCallback((v: boolean) => setIsDirtyState(v), []);

  const handleStay = useCallback(() => {
    if (blocker.state === "blocked") blocker.reset();
  }, [blocker]);

  const handleLeave = useCallback(() => {
    if (blocker.state === "blocked") blocker.proceed();
  }, [blocker]);

  const handleSaveAndLeave = useCallback(async () => {
    try {
      if (saveRef.current) await saveRef.current();
      if (blocker.state === "blocked") blocker.proceed();
    } catch {
      // Save failed, stay on page
    }
  }, [blocker]);

  return {
    isDirty,
    setDirty,
    showDialog: blocker.state === "blocked",
    handleStay,
    handleLeave,
    handleSaveAndLeave,
    hasSaveHandler: !!onSave,
  };
}
