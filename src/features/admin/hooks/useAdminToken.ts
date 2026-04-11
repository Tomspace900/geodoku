import { useState } from "react";

const STORAGE_KEY = "geodoku_admin_token";

export function useAdminToken(): [
  string | null,
  (t: string) => void,
  () => void,
] {
  const [token, setTokenState] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY),
  );

  function setToken(t: string) {
    localStorage.setItem(STORAGE_KEY, t);
    setTokenState(t);
  }

  function clearToken() {
    localStorage.removeItem(STORAGE_KEY);
    setTokenState(null);
  }

  return [token, setToken, clearToken];
}
