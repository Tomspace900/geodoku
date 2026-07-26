import { failedAttemptCount } from "@/features/game/logic/lives";
import { isReplayableDate } from "@/features/game/logic/replayWindow";
import type { Cell, CellKey, GameState } from "@/features/game/types";
import { STORAGE_KEYS, safeGet, safeSet } from "@/lib/storage";

/**
 * Parties d'entraînement persistées, une entrée par date, sous une clé distincte
 * de la partie du jour. Pas de shadow de compatibilité : la fonctionnalité est
 * neuve, il n'y a pas de bundle antérieur à ménager.
 *
 * Le stockage est borné par la fenêtre de rejeu : les dates sorties de l'archive
 * sont purgées à chaque lecture, la croissance est donc plafonnée à 7 entrées.
 */

const STORAGE_KEY = STORAGE_KEYS.training;
const STORAGE_VERSION = 1;

export type PersistedTrainingGame = {
  date: string;
  cells: Record<CellKey, Cell>;
  failedAttempts: number;
};

type PersistedTrainingStore = {
  version: number;
  games: PersistedTrainingGame[];
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/** Lecture tolérante : toute entrée douteuse est écartée, jamais propagée. */
function parseStore(raw: string | null): PersistedTrainingGame[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as PersistedTrainingStore;
    if (parsed?.version !== STORAGE_VERSION || !Array.isArray(parsed.games)) {
      return [];
    }
    return parsed.games.filter(
      (game): game is PersistedTrainingGame =>
        isPlainRecord(game) &&
        typeof game.date === "string" &&
        game.date.length > 0 &&
        isPlainRecord(game.cells) &&
        typeof game.failedAttempts === "number" &&
        Number.isFinite(game.failedAttempts) &&
        game.failedAttempts >= 0,
    );
  } catch {
    return [];
  }
}

function writeStore(games: PersistedTrainingGame[]): void {
  const store: PersistedTrainingStore = { version: STORAGE_VERSION, games };
  safeSet(STORAGE_KEY, JSON.stringify(store));
}

/**
 * Parties d'entraînement encore dans la fenêtre. Les dates périmées sont
 * purgées et le stockage réécrit, pour que la clé ne grossisse pas indéfiniment.
 */
export function loadTrainingGames(today: string): PersistedTrainingGame[] {
  const stored = parseStore(safeGet(STORAGE_KEY));
  const fresh = stored.filter((game) => isReplayableDate(game.date, today));
  if (fresh.length !== stored.length) writeStore(fresh);
  return fresh;
}

export function loadTrainingGame(
  date: string,
  today: string,
): PersistedTrainingGame | null {
  return loadTrainingGames(today).find((game) => game.date === date) ?? null;
}

export function saveTrainingGame(state: GameState, today: string): void {
  if (!state.date) return;
  const others = loadTrainingGames(today).filter(
    (game) => game.date !== state.date,
  );
  writeStore([
    ...others,
    {
      date: state.date,
      cells: state.cells,
      failedAttempts: failedAttemptCount(state.lives),
    },
  ]);
}

/** Bouton « Recommencer » : on oublie la partie, la grille repart vierge. */
export function clearTrainingGame(date: string, today: string): void {
  writeStore(loadTrainingGames(today).filter((game) => game.date !== date));
}
