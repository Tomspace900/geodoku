import { STORAGE_KEYS, safeGet, safeSet } from "@/lib/storage";
import { type FinishedDay, sanitizeFinishedDay } from "./finishedDay";

/**
 * Cache navigateur des jours finis (#155). Un jour fini ne change plus : on
 * ne le redemande pas. Un jour pèse environ 0,6 Ko (0,7 Ko au 9ᵉ décile sur
 * la prod de novembre 2026) : deux ans tiennent dans 500 Ko, loin de priver
 * la partie en cours de place. Un jour plus ancien se relit au serveur.
 */
const DAY_CACHE_VERSION = 1;
export const MAX_CACHED_DAYS = 730;

export function loadDayCache(): Map<string, FinishedDay> {
  const raw = safeGet(STORAGE_KEYS.finishedDays);
  if (!raw) return new Map();
  try {
    const parsed = JSON.parse(raw) as { version?: unknown; days?: unknown };
    if (parsed.version !== DAY_CACHE_VERSION || !Array.isArray(parsed.days)) {
      return new Map();
    }
    return new Map(
      parsed.days
        .map(sanitizeFinishedDay)
        .filter((day): day is FinishedDay => day !== null)
        .map((day) => [day.date, day]),
    );
  } catch {
    return new Map();
  }
}

/** Garde les `MAX_CACHED_DAYS` jours les plus récents. */
export function trimDayCache(
  days: ReadonlyMap<string, FinishedDay>,
): FinishedDay[] {
  return [...days.values()]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, MAX_CACHED_DAYS);
}

export function saveDayCache(days: ReadonlyMap<string, FinishedDay>): void {
  safeSet(
    STORAGE_KEYS.finishedDays,
    JSON.stringify({ version: DAY_CACHE_VERSION, days: trimDayCache(days) }),
  );
}
