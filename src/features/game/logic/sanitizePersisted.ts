import type { Cell, CellKey, GameStatus } from "../types";
import { STARTING_LIVES } from "./constants";
import type { PersistedGame } from "./persistence";
import { rarityToTier } from "./rarity";

const CELL_KEYS: CellKey[] = [
  "0,0",
  "0,1",
  "0,2",
  "1,0",
  "1,1",
  "1,2",
  "2,0",
  "2,1",
  "2,2",
];

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
  if (typeof o.rarity !== "number" || !Number.isFinite(o.rarity)) return null;
  const rarity = clampInt(o.rarity, 0, 1);
  return {
    status: "filled",
    countryCode: o.countryCode,
    rarity,
    rarityTier: rarityToTier(rarity),
  };
}

function parseEmptyCell(raw: unknown): Cell | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.status !== "empty") return null;
  return { status: "empty" };
}

function canonicalStatus(filledCount: number, lives: number): GameStatus {
  if (filledCount === 9) return "won";
  if (lives <= 0) return "lost";
  return "playing";
}

function persistedStatusMatchesCanonical(
  persisted: GameStatus,
  canonical: GameStatus,
  filledCount: number,
  lives: number,
): boolean {
  if (canonical === "won") {
    if (persisted === "lost") return false;
    if (persisted === "won") return true;
    return persisted === "playing" && filledCount === 9;
  }
  if (canonical === "lost") {
    if (persisted === "won") return false;
    if (persisted === "lost") return true;
    return persisted === "playing" && lives === 0 && filledCount < 9;
  }
  return persisted === "playing" && lives > 0 && filledCount < 9;
}

/**
 * Vérifie la cohérence d'une partie rechargée depuis localStorage avec la
 * grille du jour (validAnswers serveur). Retourne null si triche / corruption
 * détectée : l’appelant doit alors clear + init.
 */
export function sanitizePersistedForGrid(
  persisted: PersistedGame,
  validAnswers: Record<string, string[]>,
): PersistedGame | null {
  if (typeof persisted.date !== "string" || persisted.date.length === 0)
    return null;
  if (!Number.isFinite(persisted.startedAt)) return null;

  const rawFinishedAt =
    persisted.finishedAt != null && Number.isFinite(persisted.finishedAt)
      ? persisted.finishedAt
      : null;

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

  const canonical = canonicalStatus(filledCount, lives);
  if (
    !persistedStatusMatchesCanonical(
      persisted.status,
      canonical,
      filledCount,
      lives,
    )
  ) {
    return null;
  }

  let finishedAt: number | null = rawFinishedAt;
  if (canonical === "playing") {
    if (finishedAt !== null) return null;
  } else if (finishedAt === null) {
    finishedAt = persisted.startedAt;
  }

  return {
    version: persisted.version,
    date: persisted.date,
    cells,
    remainingLives: canonical === "lost" ? 0 : lives,
    usedCountries: [...new Set(usedCodes)],
    status: canonical,
    startedAt: persisted.startedAt,
    finishedAt,
  };
}
