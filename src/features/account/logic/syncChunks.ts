import type { HistoryEntry } from "@/features/game/logic/history";
import { STORAGE_KEYS, safeGet, safeRemove, safeSet } from "@/lib/storage";

/** Doit rester sous `MAX_SYNC_ENTRIES` (`convex/account.ts`). */
export const SYNC_CHUNK_SIZE = 50;

/**
 * Le journal découpé pour le rattachement : toujours au moins un appel, même
 * vide, parce que c'est lui qui crée le profil d'un nouveau compte.
 */
export function chunkEntries(
  entries: readonly HistoryEntry[],
  size = SYNC_CHUNK_SIZE,
): HistoryEntry[][] {
  if (entries.length === 0) return [[]];
  return Array.from({ length: Math.ceil(entries.length / size) }, (_, i) =>
    entries.slice(i * size, (i + 1) * size),
  );
}

/** Jusqu'où le journal a été rattaché, pour une session donnée. */
export type SyncMarker = { session: string; through: string };

/**
 * Les entrées encore à rattacher : tout le journal à une nouvelle session,
 * sinon les jours à partir du dernier rattaché (celui-ci compris : la partie
 * du jour a pu bouger depuis).
 */
export function entriesToSync(
  entries: readonly HistoryEntry[],
  marker: SyncMarker | null,
  session: string,
): HistoryEntry[] {
  if (!marker || marker.session !== session) return [...entries];
  return entries.filter((entry) => entry.date >= marker.through);
}

export function loadSyncMarker(): SyncMarker | null {
  try {
    const raw = JSON.parse(safeGet(STORAGE_KEYS.accountSync) ?? "null");
    return raw &&
      typeof raw.session === "string" &&
      typeof raw.through === "string"
      ? { session: raw.session, through: raw.through }
      : null;
  } catch {
    return null;
  }
}

export function saveSyncMarker(marker: SyncMarker): void {
  safeSet(STORAGE_KEYS.accountSync, JSON.stringify(marker));
}

export function clearSyncMarker(): void {
  safeRemove(STORAGE_KEYS.accountSync);
}
