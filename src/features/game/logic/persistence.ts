import { STORAGE_KEYS, safeGet, safeRemove, safeSet } from "@/lib/storage";
import type { Cell, CellKey, GameState, GameStatus } from "../types";

/** Clé localStorage — réexportée depuis le catalogue central, pour les tests. */
export const PERSISTENCE_STORAGE_KEY = STORAGE_KEYS.game;
const STORAGE_VERSION = 2;

export type PersistedGame = {
  version: number;
  date: string;
  cells: Record<CellKey, Cell>;
  remainingLives: number;
  usedCountries: string[];
  status: GameStatus;
  startedAt: number;
  finishedAt: number | null;
  /** Fin de partie déjà notifiée au serveur (dédup `recordGameEnd`). */
  endRecorded?: boolean;
  /** Difficulté déjà notée par le joueur pour cette grille. */
  rated?: boolean;
};

export function loadPersistedGame(): PersistedGame | null {
  const raw = safeGet(PERSISTENCE_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PersistedGame;
    if (parsed.version !== STORAGE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function savePersistedGame(state: GameState): void {
  const data: PersistedGame = {
    version: STORAGE_VERSION,
    date: state.date,
    cells: state.cells,
    remainingLives: state.remainingLives,
    usedCountries: Array.from(state.usedCountries),
    status: state.status,
    startedAt: state.startedAt,
    finishedAt: state.finishedAt,
    endRecorded: state.endRecorded,
    rated: state.rated,
  };
  safeSet(PERSISTENCE_STORAGE_KEY, JSON.stringify(data));
}

export function clearPersistedGame(): void {
  safeRemove(PERSISTENCE_STORAGE_KEY);
}

export function isPersistedForToday(
  persisted: PersistedGame,
  today: string,
): boolean {
  return persisted.date === today;
}
