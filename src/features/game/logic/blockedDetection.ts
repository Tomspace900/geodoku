import type { Cell, CellKey } from "../types";

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

function isEmptyCellBlocked(
  key: CellKey,
  validAnswers: Record<string, string[]>,
  usedCountries: Set<string>,
): boolean {
  const answers = validAnswers[key];
  if (!answers || answers.length === 0) return false;
  return answers.every((code) => usedCountries.has(code));
}

export function findBlockedEmptyCells(
  cells: Record<CellKey, Cell>,
  validAnswers: Record<string, string[]>,
  usedCountries: Set<string>,
): CellKey[] {
  return CELL_KEYS.filter((key) => {
    const cell = cells[key];
    if (cell.status !== "empty") return false;
    return isEmptyCellBlocked(key, validAnswers, usedCountries);
  });
}

/** Marque les cellules empty dont toutes les solutions sont déjà utilisées. */
export function markBlockedCells(
  cells: Record<CellKey, Cell>,
  validAnswers: Record<string, string[]>,
  usedCountries: Set<string>,
): Record<CellKey, Cell> {
  const blockedKeys = findBlockedEmptyCells(cells, validAnswers, usedCountries);
  if (blockedKeys.length === 0) return cells;

  const newCells = { ...cells };
  for (const key of blockedKeys) {
    newCells[key] = { status: "blocked" };
  }
  return newCells;
}

export function hasEmptyCell(cells: Record<CellKey, Cell>): boolean {
  return Object.values(cells).some((cell) => cell.status === "empty");
}

/** Statut après un guessSuccess ou rehydrate (les vies sont gérées ailleurs). */
export function resolveStatusAfterPlacement(
  cells: Record<CellKey, Cell>,
): "playing" | "won" | "lost" {
  const filledCount = Object.values(cells).filter(
    (cell) => cell.status === "filled",
  ).length;
  if (filledCount === 9) return "won";
  if (!hasEmptyCell(cells)) return "lost";
  return "playing";
}
