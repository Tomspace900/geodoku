import type { Cell, CellKey, GameStatus, LivesState } from "../types";
import { hasEmptyCell, markBlockedCells } from "./blockedDetection";
import { STARTING_LIVES } from "./constants";
import { CELL_KEYS, GRID_CELL_COUNT } from "./gridTopology";
import { isOutOfLives } from "./lives";
import type { PersistedGame } from "./persistence";

export type SanitizedPersistedGame = {
  date: string;
  cells: Record<CellKey, Cell>;
  lives: LivesState;
  status: GameStatus;
  endRecorded: boolean;
  rated: boolean;
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

/**
 * Contrôles de cellules, communs aux deux modes : chaque case est d'une forme
 * connue, chaque pays posé figure dans les réponses publiées de sa case, aucun
 * pays n'est placé deux fois, et une case sérialisée `blocked` l'est réellement
 * d'après les pays déjà utilisés. `null` = corruption ou triche.
 */
function sanitizeCells(
  rawCells: unknown,
  validAnswers: Record<string, string[]>,
): { cells: Record<CellKey, Cell>; usedCodes: string[] } | null {
  if (!rawCells || typeof rawCells !== "object" || Array.isArray(rawCells)) {
    return null;
  }
  const source = rawCells as Partial<Record<CellKey, unknown>>;
  const cells = {} as Record<CellKey, Cell>;
  const usedCodes: string[] = [];

  for (const key of CELL_KEYS) {
    const raw = source[key];
    const status =
      raw && typeof raw === "object"
        ? (raw as { status?: string }).status
        : undefined;

    let cell: Cell | null;
    if (status === "empty") cell = parseEmptyCell(raw);
    else if (status === "blocked") cell = parseBlockedCell(raw);
    else cell = parseFilledCell(raw, validAnswers[key]);

    if (!cell) return null;
    cells[key] = cell;
    if (cell.status === "filled") usedCodes.push(cell.countryCode);
  }

  if (new Set(usedCodes).size !== usedCodes.length) return null;

  const usedSet = new Set(usedCodes);
  for (const key of CELL_KEYS) {
    if (cells[key].status !== "blocked") continue;
    const answers = validAnswers[key] ?? [];
    if (answers.some((code) => !usedSet.has(code))) return null;
  }

  return { cells, usedCodes };
}

/**
 * Statut canonique d'une partie, dérivé des seules cellules et des vies : grille
 * pleine → gagnée, vies épuisées ou plus aucune case remplissable → perdue.
 * Ne dépend pas de `validAnswers`, ce qui permet de trancher l'état d'une partie
 * sans avoir chargé sa grille (cf. le garde d'accès à `/archive`).
 */
export function canonicalStatus(
  filledCount: number,
  lives: LivesState,
  cells: Record<CellKey, Cell>,
): GameStatus {
  if (filledCount === GRID_CELL_COUNT) return "won";
  if (isOutOfLives(lives)) return "lost";
  if (!hasEmptyCell(cells)) return "lost";
  return "playing";
}

function persistedStatusMatchesCanonical(
  persisted: GameStatus,
  canonical: GameStatus,
  filledCount: number,
  lives: LivesState,
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
    return isOutOfLives(lives) || !hasEmptyCell(cells);
  }
  return persisted === "playing" && !isOutOfLives(lives) && hasEmptyCell(cells);
}

/**
 * Vérifie la cohérence d'une partie du jour rechargée depuis localStorage avec
 * la grille du jour (validAnswers serveur). Retourne null si triche / corruption
 * détectée : l’appelant doit alors clear + init.
 */
export function sanitizePersistedForGrid(
  persisted: PersistedGame,
  validAnswers: Record<string, string[]>,
): SanitizedPersistedGame | null {
  if (typeof persisted.date !== "string" || persisted.date.length === 0)
    return null;

  const sanitized = sanitizeCells(persisted.cells, validAnswers);
  if (!sanitized) return null;
  const { cells, usedCodes } = sanitized;
  const filledCount = usedCodes.length;

  if (!Number.isFinite(persisted.remainingLives)) return null;
  const lives: LivesState = {
    kind: "limited",
    remaining: clampInt(
      Math.trunc(persisted.remainingLives),
      0,
      STARTING_LIVES,
    ),
  };
  if (filledCount === CELL_KEYS.length && isOutOfLives(lives)) return null;

  const canonicalCells = markBlockedCells(
    cells,
    validAnswers,
    new Set(usedCodes),
  );
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
    date: persisted.date,
    cells: canonicalCells,
    lives,
    status: canonical,
    endRecorded:
      typeof persisted.endRecorded === "boolean"
        ? persisted.endRecorded
        : false,
    rated: typeof persisted.rated === "boolean" ? persisted.rated : false,
  };
}

/**
 * Équivalent pour une partie d'entraînement. Prend des primitives plutôt que le
 * type persisté de la feature `archive`, pour que le domaine du jeu ne dépende
 * pas d'elle. Le régime est illimité : pas de plafond de vies à clamper, juste
 * un compteur d'essais entier positif.
 */
export function sanitizeTrainingGame(
  input: { date: string; cells: unknown; failedAttempts: unknown },
  validAnswers: Record<string, string[]>,
): SanitizedPersistedGame | null {
  if (typeof input.date !== "string" || input.date.length === 0) return null;
  if (
    typeof input.failedAttempts !== "number" ||
    !Number.isFinite(input.failedAttempts) ||
    input.failedAttempts < 0
  ) {
    return null;
  }

  const sanitized = sanitizeCells(input.cells, validAnswers);
  if (!sanitized) return null;
  const { cells, usedCodes } = sanitized;

  const lives: LivesState = {
    kind: "unlimited",
    failedAttempts: Math.trunc(input.failedAttempts),
  };
  const canonicalCells = markBlockedCells(
    cells,
    validAnswers,
    new Set(usedCodes),
  );

  return {
    date: input.date,
    cells: canonicalCells,
    lives,
    status: canonicalStatus(usedCodes.length, lives, canonicalCells),
    endRecorded: false,
    rated: false,
  };
}
