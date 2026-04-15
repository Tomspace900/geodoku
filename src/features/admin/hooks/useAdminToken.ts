import { useState } from "react";

const STORAGE_KEY = "geodoku_admin_token";

/** sessionStorage : le token disparaît à la fermeture de l’onglet (un peu mieux qu’un localStorage persistant). */
function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function useAdminToken(): [
  string | null,
  (t: string) => void,
  () => void,
] {
  const [token, setTokenState] = useState<string | null>(() => {
    const s = getStorage();
    return s?.getItem(STORAGE_KEY) ?? null;
  });

  function setToken(t: string) {
    const s = getStorage();
    if (s) {
      s.setItem(STORAGE_KEY, t);
    }
    setTokenState(t);
  }

  function clearToken() {
    const s = getStorage();
    s?.removeItem(STORAGE_KEY);
    setTokenState(null);
  }

  return [token, setToken, clearToken];
}
