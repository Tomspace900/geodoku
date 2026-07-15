import { STORAGE_KEYS, safeGet, safeRemove, safeSet } from "@/lib/storage";
import type { Cell, CellKey, GameState, GameStatus } from "../types";
import { getUsedCountryCodes } from "./usedCountries";

/** Payload minimal lu par le bundle courant. */
export const PERSISTENCE_STORAGE_KEY = STORAGE_KEYS.gameV3;
/** Shadow v2 lu par le bundle précédent pendant la fenêtre de rollback. */
export const PERSISTENCE_V2_STORAGE_KEY = STORAGE_KEYS.game;
const STORAGE_VERSION = 3;
const PREVIOUS_STORAGE_VERSION = 2;
const V2_SHADOW_MARKER = "v3-shadow";

export type PersistedGame = {
  version: number;
  date: string;
  cells: Record<CellKey, Cell>;
  remainingLives: number;
  /** Révision commune aux deux clés pour récupérer un commit partiel. */
  persistenceRevision?: number;
  /** Champs v2 lus uniquement pendant la migration vers le payload minimal v3. */
  usedCountries?: string[];
  status?: GameStatus;
  startedAt?: number;
  finishedAt?: number | null;
  /** Fin de partie déjà notifiée au serveur (dédup `recordTodayGameEnd`). */
  endRecorded?: boolean;
  /** Difficulté déjà notée par le joueur pour cette grille. */
  rated?: boolean;
};

type PersistedGameV2Shadow = PersistedGame & {
  version: 2;
  persistenceRevision: number;
  usedCountries: string[];
  status: GameStatus;
  startedAt: number;
  finishedAt: number | null;
  compatibilitySource: typeof V2_SHADOW_MARKER;
};

function parsePersisted(raw: string | null): PersistedGame | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PersistedGame;
    return parsed.version === PREVIOUS_STORAGE_VERSION ||
      parsed.version === STORAGE_VERSION
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function getPersistenceRevision(persisted: PersistedGame | null): number {
  const revision = persisted?.persistenceRevision;
  return typeof revision === "number" &&
    Number.isSafeInteger(revision) &&
    revision >= 0
    ? revision
    : 0;
}

export function loadPersistedGame(): PersistedGame | null {
  const current = parsePersisted(safeGet(PERSISTENCE_STORAGE_KEY));
  const previous = parsePersisted(safeGet(PERSISTENCE_V2_STORAGE_KEY));

  // Le bundle précédent réécrit la v2 sans connaître ce marqueur. Après un
  // rollback, cette absence indique donc que la v2 a pu progresser pendant que
  // la v3 restait figée : elle redevient autoritaire au prochain rollout.
  if (
    previous?.version === PREVIOUS_STORAGE_VERSION &&
    (previous as PersistedGame & { compatibilitySource?: unknown })
      .compatibilitySource !== V2_SHADOW_MARKER
  ) {
    return previous;
  }
  if (!current) return previous;
  if (!previous) return current;
  return getPersistenceRevision(previous) > getPersistenceRevision(current)
    ? previous
    : current;
}

function readPreviousTimestamps(date: string): {
  startedAt: number;
  finishedAt: number | null;
} {
  const existing = parsePersisted(safeGet(PERSISTENCE_V2_STORAGE_KEY));
  if (
    existing?.version !== PREVIOUS_STORAGE_VERSION ||
    existing.date !== date
  ) {
    return { startedAt: Date.now(), finishedAt: null };
  }
  return {
    startedAt:
      typeof existing.startedAt === "number" &&
      Number.isFinite(existing.startedAt)
        ? existing.startedAt
        : Date.now(),
    finishedAt:
      existing.finishedAt === null ||
      (typeof existing.finishedAt === "number" &&
        Number.isFinite(existing.finishedAt))
        ? existing.finishedAt
        : null,
  };
}

export function savePersistedGame(state: GameState): void {
  const current = parsePersisted(safeGet(PERSISTENCE_STORAGE_KEY));
  const previous = parsePersisted(safeGet(PERSISTENCE_V2_STORAGE_KEY));
  const persistenceRevision =
    Math.max(
      getPersistenceRevision(current),
      getPersistenceRevision(previous),
    ) + 1;
  const data: PersistedGame = {
    version: STORAGE_VERSION,
    date: state.date,
    cells: state.cells,
    remainingLives: state.remainingLives,
    persistenceRevision,
    endRecorded: state.endRecorded,
    rated: state.rated,
  };

  const previousTimestamps = readPreviousTimestamps(state.date);
  const shadow: PersistedGameV2Shadow = {
    version: PREVIOUS_STORAGE_VERSION,
    date: state.date,
    cells: state.cells,
    remainingLives: state.remainingLives,
    persistenceRevision,
    usedCountries: [...getUsedCountryCodes(state.cells)],
    status: state.status,
    startedAt: previousTimestamps.startedAt,
    finishedAt:
      state.status === "playing"
        ? null
        : (previousTimestamps.finishedAt ?? Date.now()),
    endRecorded: state.endRecorded,
    rated: state.rated,
    compatibilitySource: V2_SHADOW_MARKER,
  };
  // Le shadow compatible rollback est le premier étage du commit. Si cette
  // écriture échoue, publier uniquement la v3 rendrait un rollback destructif.
  if (!safeSet(PERSISTENCE_V2_STORAGE_KEY, JSON.stringify(shadow))) return;
  safeSet(PERSISTENCE_STORAGE_KEY, JSON.stringify(data));
}

export function clearPersistedGame(): void {
  safeRemove(PERSISTENCE_STORAGE_KEY);
  safeRemove(PERSISTENCE_V2_STORAGE_KEY);
}

export function isPersistedForToday(
  persisted: PersistedGame,
  today: string,
): boolean {
  return persisted.date === today;
}
