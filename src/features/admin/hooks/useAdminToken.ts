import { STORAGE_KEYS, safeGet, safeRemove, safeSet } from "@/lib/storage";
import { useState } from "react";

/** sessionStorage : le token disparaît à la fermeture de l’onglet (un peu mieux qu’un localStorage persistant). */
export function useAdminToken(): [
  string | null,
  (t: string) => void,
  () => void,
] {
  const [token, setTokenState] = useState<string | null>(() =>
    safeGet(STORAGE_KEYS.adminToken, "session"),
  );

  function setToken(t: string) {
    safeSet(STORAGE_KEYS.adminToken, t, "session");
    setTokenState(t);
  }

  function clearToken() {
    safeRemove(STORAGE_KEYS.adminToken, "session");
    setTokenState(null);
  }

  return [token, setToken, clearToken];
}
