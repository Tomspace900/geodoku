import type { Cell, CellKey, GameState, GameStatus } from "../types";

const STORAGE_KEY = "geodoku.currentGame";
const STORAGE_VERSION = 1;

export type PersistedGame = {
  version: number;
  date: string;
  cells: Record<CellKey, Cell>;
  remainingLives: number;
  usedCountries: string[];
  status: GameStatus;
  startedAt: number;
  finishedAt: number | null;
};

export function loadPersistedGame(): PersistedGame | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedGame;
    if (parsed.version !== STORAGE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function savePersistedGame(state: GameState): void {
  try {
    const data: PersistedGame = {
      version: STORAGE_VERSION,
      date: state.date,
      cells: state.cells,
      remainingLives: state.remainingLives,
      usedCountries: Array.from(state.usedCountries),
      status: state.status,
      startedAt: state.startedAt,
      finishedAt: state.finishedAt,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage plein ou désactivé → le jeu continue sans persistance
  }
}

export function clearPersistedGame(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function isPersistedForToday(
  persisted: PersistedGame,
  today: string,
): boolean {
  return persisted.date === today;
}
