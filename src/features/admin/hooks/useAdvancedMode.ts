import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "geodoku_admin_advanced";

function readInitial(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Persists the admin "Advanced" toggle in sessionStorage so it survives
 * navigation but resets across browser sessions (intentional — production
 * builds should never ship with Advanced on by default).
 */
export function useAdvancedMode(): [boolean, (value: boolean) => void] {
  const [advanced, setAdvanced] = useState<boolean>(readInitial);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, advanced ? "1" : "0");
    } catch {
      // sessionStorage may be unavailable (private mode quotas); ignore.
    }
  }, [advanced]);

  const set = useCallback((value: boolean) => setAdvanced(value), []);
  return [advanced, set];
}
