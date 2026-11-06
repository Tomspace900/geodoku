import type { HistoryEntry } from "@/features/game/logic/history";

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
