import { STORAGE_KEYS, safeGet, safeSet } from "@/lib/storage";
import type { DifficultyRating, GameState } from "../types";
import { isDifficultyRating } from "./difficultyRating";
import { CELL_KEYS, GRID_CELL_COUNT } from "./gridTopology";

/**
 * Journal local des parties quotidiennes (#154), invisible pour le joueur : il
 * prépare « Mes stats » (#70) et l'import au login (#155). Une entrée par jour
 * joué, au format de la future ligne serveur, pour que l'import soit une copie.
 * Ni score, ni vies, ni statut : tout se recalcule depuis la grille et les
 * répartitions. L'entraînement n'y entre pas. Pas de plafond (~50 Ko par an).
 */

export const HISTORY_STORAGE_KEY = STORAGE_KEYS.history;
const HISTORY_VERSION = 1;

/** Tableaux dans l'ordre row-major de `CELL_KEYS` ("0,0", "0,1"… "2,2"). */
export type HistoryEntry = {
  date: string;
  /** ISO3 du pays placé, `null` pour une case vide ou bloquée. */
  cells: (string | null)[];
  /** Erreurs par case. */
  failed: number[];
  rating?: DifficultyRating;
};

type HistoryStore = {
  version: number;
  entries: HistoryEntry[];
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO3_PATTERN = /^[A-Z]{3}$/;

/**
 * Entrée du jour tirée de l'état de la partie, ou `null` tant qu'aucun coup
 * (réussi ou raté) n'a été joué : l'entrée naît au premier coup, comme la ligne
 * serveur, jamais au simple chargement de la grille.
 */
export function historyEntryFromGame(
  game: Pick<GameState, "date" | "cells" | "failed" | "rating">,
): HistoryEntry | null {
  const cells = CELL_KEYS.map((key) => {
    const cell = game.cells[key];
    return cell.status === "filled" ? cell.countryCode : null;
  });
  const failed = CELL_KEYS.map((key) => game.failed[key]);
  const hasMove =
    cells.some((code) => code !== null) || failed.some((count) => count > 0);
  if (!game.date || !hasMove) return null;
  return {
    date: game.date,
    cells,
    failed,
    ...(game.rating ? { rating: game.rating } : {}),
  };
}

/** Remplace l'entrée de la même date (mise à jour à chaque coup), triée par date. */
export function upsertHistoryEntry(
  entries: HistoryEntry[],
  entry: HistoryEntry,
): HistoryEntry[] {
  return [...entries.filter((e) => e.date !== entry.date), entry].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

function sanitizeEntry(raw: unknown): HistoryEntry | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.date !== "string" || !DATE_PATTERN.test(o.date)) return null;

  const { cells, failed } = o;
  if (!Array.isArray(cells) || cells.length !== GRID_CELL_COUNT) return null;
  if (
    !cells.every(
      (c) => c === null || (typeof c === "string" && ISO3_PATTERN.test(c)),
    )
  ) {
    return null;
  }
  const placed = cells.filter((c): c is string => c !== null);
  if (new Set(placed).size !== placed.length) return null;

  if (!Array.isArray(failed) || failed.length !== GRID_CELL_COUNT) return null;
  if (
    !failed.every((n) => typeof n === "number" && Number.isInteger(n) && n >= 0)
  ) {
    return null;
  }

  // Une note illisible ne coûte que la note, pas la partie.
  return {
    date: o.date,
    cells: cells as (string | null)[],
    failed: failed as number[],
    ...(isDifficultyRating(o.rating) ? { rating: o.rating } : {}),
  };
}

/**
 * Lecture tolérante du journal stocké : toute entrée douteuse est écartée sans
 * emporter les autres. Une date en double garde sa dernière occurrence.
 */
export function sanitizeHistory(raw: unknown): HistoryEntry[] {
  if (!raw || typeof raw !== "object") return [];
  const store = raw as Partial<HistoryStore>;
  if (store.version !== HISTORY_VERSION || !Array.isArray(store.entries)) {
    return [];
  }
  return store.entries.reduce<HistoryEntry[]>((entries, rawEntry) => {
    const entry = sanitizeEntry(rawEntry);
    return entry ? upsertHistoryEntry(entries, entry) : entries;
  }, []);
}

export function loadHistory(): HistoryEntry[] {
  const raw = safeGet(HISTORY_STORAGE_KEY);
  if (!raw) return [];
  try {
    return sanitizeHistory(JSON.parse(raw));
  } catch {
    return [];
  }
}

/** Écrit ou met à jour l'entrée du jour. Sans effet hors grille quotidienne. */
export function recordDailyGame(state: GameState): void {
  if (state.mode !== "daily") return;
  const entry = historyEntryFromGame(state);
  if (!entry) return;
  const store: HistoryStore = {
    version: HISTORY_VERSION,
    entries: upsertHistoryEntry(loadHistory(), entry),
  };
  safeSet(HISTORY_STORAGE_KEY, JSON.stringify(store));
}
