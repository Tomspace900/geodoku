import type { CellKey, GameState } from "../types";
import {
  type GameRecord,
  recordCells,
  recordLivesRemaining,
  recordStatus,
} from "./gameRecord";
import { CELL_KEYS } from "./gridTopology";
import type { SanitizedPersistedGame } from "./sanitizePersisted";

/**
 * Partie du jour d'un joueur connecté (#155) : le serveur fait foi, le
 * navigateur n'en garde qu'un cache. Ces fonctions comparent la ligne du
 * serveur à la partie affichée et la reprennent au besoin.
 */

export function recordOfState(
  state: Pick<GameState, "cells" | "failed">,
): GameRecord {
  return {
    cells: CELL_KEYS.map((key) => {
      const cell = state.cells[key];
      return cell.status === "filled" ? cell.countryCode : null;
    }),
    failed: CELL_KEYS.map((key) => state.failed[key]),
  };
}

export function sameRecord(a: GameRecord, b: GameRecord): boolean {
  return (
    a.cells.every((code, i) => code === b.cells[i]) &&
    a.failed.every((n, i) => n === b.failed[i])
  );
}

/**
 * La ligne du serveur, prête à remplacer la partie affichée. Une partie déjà
 * finie ailleurs a déjà émis sa fin : `endRecorded` évite un second
 * `game_completed`.
 */
export function persistedFromRecord(
  date: string,
  record: GameRecord,
  validAnswers: Record<string, string[]>,
): SanitizedPersistedGame {
  const status = recordStatus(record, validAnswers);
  return {
    date,
    cells: recordCells(record, validAnswers),
    lives: { kind: "limited", remaining: recordLivesRemaining(record) },
    failed: Object.fromEntries(
      CELL_KEYS.map((key, index) => [key, record.failed[index] ?? 0]),
    ) as Record<CellKey, number>,
    status,
    endRecorded: status !== "playing",
  };
}
