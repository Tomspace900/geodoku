import type { Cell, CellKey, GameStatus } from "../types";
import {
  markBlockedCells,
  resolveStatusAfterPlacement,
} from "./blockedDetection";
import { CELL_KEYS, GRID_CELL_COUNT, STARTING_LIVES } from "./gridTopology";

/**
 * Ligne de partie (#70), au format du journal local (#154) : pays posés et
 * erreurs par case, dans l'ordre row-major de `CELL_KEYS`. Rien d'autre n'est
 * stocké : vies, cases bloquées, statut et score se recalculent ici, côté
 * serveur (`playMove`, cohorte) comme côté client.
 */
export type GameRecord = {
  /** ISO3 du pays placé, `null` pour une case vide ou bloquée. */
  cells: (string | null)[];
  failed: number[];
};

export function emptyGameRecord(): GameRecord {
  return {
    cells: Array.from({ length: GRID_CELL_COUNT }, () => null),
    failed: Array.from({ length: GRID_CELL_COUNT }, () => 0),
  };
}

export function recordFailedTotal(record: GameRecord): number {
  return record.failed.reduce((sum, n) => sum + n, 0);
}

/**
 * Nombre de coups joués : le `moveIndex` attendu du prochain coup. Un coup
 * réussi remplit une case, un coup raté ajoute une erreur, d'où l'idempotence
 * sans reçu.
 */
export function recordMoveCount(record: GameRecord): number {
  return (
    record.cells.filter((code) => code !== null).length +
    recordFailedTotal(record)
  );
}

export function recordLivesRemaining(record: GameRecord): number {
  return Math.max(0, STARTING_LIVES - recordFailedTotal(record));
}

/** Cases de jeu, bloquées comprises, recalculées depuis la ligne. */
export function recordCells(
  record: GameRecord,
  validAnswers: Record<string, string[]>,
): Record<CellKey, Cell> {
  const cells = Object.fromEntries(
    CELL_KEYS.map((key, index) => {
      const code = record.cells[index];
      return [
        key,
        code
          ? { status: "filled" as const, countryCode: code }
          : { status: "empty" as const },
      ];
    }),
  ) as Record<CellKey, Cell>;
  const used = new Set(
    record.cells.filter((code): code is string => code !== null),
  );
  return markBlockedCells(cells, validAnswers, used);
}

export function recordStatus(
  record: GameRecord,
  validAnswers: Record<string, string[]>,
): GameStatus {
  if (recordLivesRemaining(record) <= 0) return "lost";
  return resolveStatusAfterPlacement(recordCells(record, validAnswers));
}

export type MoveOutcome =
  | { kind: "success"; record: GameRecord }
  | { kind: "failure"; record: GameRecord }
  | { kind: "refused"; reason: "game_over" | "cell_unavailable" };

/**
 * Applique un coup avec la règle du client : le pays doit figurer dans les
 * réponses publiées de la case et ne pas être déjà posé. Tout autre pays coûte
 * une vie, comme à l'écran.
 */
export function applyMove(
  record: GameRecord,
  cellKey: CellKey,
  countryCode: string,
  validAnswers: Record<string, string[]>,
): MoveOutcome {
  if (recordStatus(record, validAnswers) !== "playing") {
    return { kind: "refused", reason: "game_over" };
  }
  const index = CELL_KEYS.indexOf(cellKey);
  if (recordCells(record, validAnswers)[cellKey].status !== "empty") {
    return { kind: "refused", reason: "cell_unavailable" };
  }

  const valid =
    (validAnswers[cellKey] ?? []).includes(countryCode) &&
    !record.cells.includes(countryCode);
  if (valid) {
    const cells = [...record.cells];
    cells[index] = countryCode;
    return { kind: "success", record: { ...record, cells } };
  }
  const failed = [...record.failed];
  failed[index] += 1;
  return { kind: "failure", record: { ...record, failed } };
}
