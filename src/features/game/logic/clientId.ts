import { STORAGE_KEYS, safeGet, safeSet } from "@/lib/storage";

/**
 * Stable per-browser identifier used to scope server-side rate limits.
 * Not a security boundary — just a coarse fairness key so a malicious bot
 * cannot trivially spam every player out of their daily quota.
 */
export function getOrCreateClientId(): string {
  const existing = safeGet(STORAGE_KEYS.clientId);
  if (existing) return existing;
  const fresh = crypto.randomUUID();
  safeSet(STORAGE_KEYS.clientId, fresh);
  return fresh;
}
