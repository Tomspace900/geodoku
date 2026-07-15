import { STORAGE_KEYS, safeGet, safeSet } from "@/lib/storage";
import { createBrowserUuidV4 } from "./browserUuid";

const CLIENT_ID_PATTERN = /^[A-Za-z0-9:_-]+$/;
const MIN_CLIENT_ID_LENGTH = 8;
const MAX_CLIENT_ID_LENGTH = 128;

let volatileClientId: string | null = null;

function isValidClientId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= MIN_CLIENT_ID_LENGTH &&
    value.length <= MAX_CLIENT_ID_LENGTH &&
    CLIENT_ID_PATTERN.test(value)
  );
}

/**
 * Stable per-browser identifier used to scope server-side rate limits.
 * Not a security boundary — just a coarse fairness key so a malicious bot
 * cannot trivially spam every player out of their daily quota.
 */
export function getOrCreateClientId(): string {
  const existing = safeGet(STORAGE_KEYS.clientId);
  if (isValidClientId(existing)) {
    volatileClientId = existing;
    return existing;
  }
  if (volatileClientId) {
    safeSet(STORAGE_KEYS.clientId, volatileClientId);
    return volatileClientId;
  }

  const fresh = createBrowserUuidV4();
  volatileClientId = fresh;
  safeSet(STORAGE_KEYS.clientId, fresh);
  return fresh;
}
