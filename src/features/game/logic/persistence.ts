import { STORAGE_KEYS, safeGet, safeRemove, safeSet } from "@/lib/storage";
import type { Cell, CellKey, GameState } from "../types";
import { STARTING_LIVES } from "./constants";
import { livesRemaining } from "./lives";

/** Payload minimal, seul format écrit et lu depuis la sortie du rollout v3. */
export const PERSISTENCE_STORAGE_KEY = STORAGE_KEYS.gameV3;
const STORAGE_VERSION = 3;

export type PersistedGame = {
  version: number;
  date: string;
  cells: Record<CellKey, Cell>;
  remainingLives: number;
  /** Fin de partie déjà notifiée au serveur (dédup `recordTodayGameEnd`). */
  endRecorded?: boolean;
  /** Difficulté déjà notée par le joueur pour cette grille. */
  rated?: boolean;
};

function parsePersisted(raw: string | null): PersistedGame | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PersistedGame;
    return parsed.version === STORAGE_VERSION ? parsed : null;
  } catch {
    return null;
  }
}

export function loadPersistedGame(): PersistedGame | null {
  return parsePersisted(safeGet(PERSISTENCE_STORAGE_KEY));
}

/**
 * Partie du jour uniquement. Le format sérialisé garde un `remainingLives`
 * numérique — hérité de la v2 — plutôt que l'union `LivesState`, qui reste une
 * notion d'exécution. Les parties d'entraînement ont leur propre stockage
 * (feature `archive`).
 */
export function savePersistedGame(state: GameState): void {
  const data: PersistedGame = {
    version: STORAGE_VERSION,
    date: state.date,
    cells: state.cells,
    remainingLives: livesRemaining(state.lives) ?? STARTING_LIVES,
    endRecorded: state.endRecorded,
    rated: state.rated,
  };
  safeSet(PERSISTENCE_STORAGE_KEY, JSON.stringify(data));
}

export function clearPersistedGame(): void {
  safeRemove(PERSISTENCE_STORAGE_KEY);
  // Purge du shadow v2 retiré : plus personne ne l'écrit, mais il traîne encore
  // dans le localStorage des joueurs présents avant la sortie du rollout.
  safeRemove(STORAGE_KEYS.game);
}

export function isPersistedForToday(
  persisted: PersistedGame,
  today: string,
): boolean {
  return persisted.date === today;
}
