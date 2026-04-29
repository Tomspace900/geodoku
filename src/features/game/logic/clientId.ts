const STORAGE_KEY = "geodoku.clientId";

/**
 * Stable per-browser identifier used to scope server-side rate limits.
 * Not a security boundary — just a coarse fairness key so a malicious bot
 * cannot trivially spam every player out of their daily quota.
 */
export function getOrCreateClientId(): string {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, fresh);
    return fresh;
  } catch {
    // localStorage indisponible (mode privé strict) — id éphémère par session
    return crypto.randomUUID();
  }
}
