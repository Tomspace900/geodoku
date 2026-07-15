import type { Cell, CellKey, GameStatus } from "../types";
import { hasEmptyCell, markBlockedCells } from "./blockedDetection";
import { STARTING_LIVES } from "./constants";
import { CELL_KEYS, GRID_CELL_COUNT } from "./gridTopology";
import type { PersistedGame } from "./persistence";

export type SanitizedPersistedGame = Omit<
  PersistedGame,
  "usedCountries" | "status" | "startedAt" | "finishedAt"
> & {
  status: GameStatus;
};

function clampInt(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function parseFilledCell(
  raw: unknown,
  validForCell: string[] | undefined,
): Cell | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.status !== "filled") return null;
  if (typeof o.countryCode !== "string" || o.countryCode.length === 0)
    return null;
  if (!validForCell?.includes(o.countryCode)) return null;
  // Rareté non persistée (dynamique) : un éventuel champ legacy est ignoré.
  return { status: "filled", countryCode: o.countryCode };
}

function parseEmptyCell(raw: unknown): Cell | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.status !== "empty") return null;
  return { status: "empty" };
}

function parseBlockedCell(raw: unknown): Cell | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.status !== "blocked") return null;
  return { status: "blocked" };
}

function canonicalStatus(
  filledCount: number,
  lives: number,
  cells: Record<CellKey, Cell>,
): GameStatus {
  if (filledCount === GRID_CELL_COUNT) return "won";
  if (lives <= 0) return "lost";
  if (!hasEmptyCell(cells)) return "lost";
  return "playing";
}

function persistedStatusMatchesCanonical(
  persisted: GameStatus,
  canonical: GameStatus,
  filledCount: number,
  lives: number,
  cells: Record<CellKey, Cell>,
): boolean {
  if (canonical === "won") {
    if (persisted === "lost") return false;
    if (persisted === "won") return true;
    return persisted === "playing" && filledCount === GRID_CELL_COUNT;
  }
  if (canonical === "lost") {
    if (persisted === "won") return false;
    if (persisted === "lost") return true;
    if (persisted !== "playing") return false;
    return lives === 0 || !hasEmptyCell(cells);
  }
  return persisted === "playing" && lives > 0 && hasEmptyCell(cells);
}

/**
 * Vérifie la cohérence d'une partie rechargée depuis localStorage avec la
 * grille du jour (validAnswers serveur). Retourne null si triche / corruption
 * détectée : l’appelant doit alors clear + init.
 */
export function sanitizePersistedForGrid(
  persisted: PersistedGame,
  validAnswers: Record<string, string[]>,
): SanitizedPersistedGame | null {
  if (typeof persisted.date !== "string" || persisted.date.length === 0)
    return null;
  if (
    !persisted.cells ||
    typeof persisted.cells !== "object" ||
    Array.isArray(persisted.cells)
  ) {
    return null;
  }
  const cells = {} as Record<CellKey, Cell>;
  const usedCodes: string[] = [];

  for (const key of CELL_KEYS) {
    const raw = persisted.cells[key];
    const validForCell = validAnswers[key];

    let cell: Cell | null = null;
    if (
      raw &&
      typeof raw === "object" &&
      (raw as { status?: string }).status === "empty"
    ) {
      cell = parseEmptyCell(raw);
    } else if (
      raw &&
      typeof raw === "object" &&
      (raw as { status?: string }).status === "blocked"
    ) {
      cell = parseBlockedCell(raw);
    } else {
      cell = parseFilledCell(raw, validForCell);
    }
    if (!cell) return null;
    cells[key] = cell;
    if (cell.status === "filled") usedCodes.push(cell.countryCode);
  }

  if (new Set(usedCodes).size !== usedCodes.length) return null;

  const filledCount = usedCodes.length;

  if (!Number.isFinite(persisted.remainingLives)) return null;
  const lives = clampInt(
    Math.trunc(persisted.remainingLives),
    0,
    STARTING_LIVES,
  );
  if (filledCount === CELL_KEYS.length && lives === 0) return null;

  const usedSet = new Set(usedCodes);

  // Rejet : une cellule sérialisée `blocked` doit l'être vraiment d'après usedCountries.
  // Si elle a encore une réponse valide non utilisée, c'est de la corruption.
  for (const key of CELL_KEYS) {
    if (cells[key].status !== "blocked") continue;
    const answers = validAnswers[key] ?? [];
    if (answers.some((code) => !usedSet.has(code))) return null;
  }

  const canonicalCells = markBlockedCells(cells, validAnswers, usedSet);
  const canonical = canonicalStatus(filledCount, lives, canonicalCells);

  if (
    persisted.status !== undefined &&
    !persistedStatusMatchesCanonical(
      persisted.status,
      canonical,
      filledCount,
      lives,
      canonicalCells,
    )
  ) {
    return null;
  }

  return {
    version: persisted.version,
    date: persisted.date,
    cells: canonicalCells,
    remainingLives: lives,
    status: canonical,
    endRecorded:
      typeof persisted.endRecorded === "boolean"
        ? persisted.endRecorded
        : false,
    rated: typeof persisted.rated === "boolean" ? persisted.rated : false,
  };
}
