import type { Cell, CellKey } from "../types";
import { CELL_KEYS } from "./gridTopology";

/**
 * Erreurs par case (#154). Le total reste porté par `LivesState` : ce détail
 * n'existe que pour le journal des parties, au format de la future ligne
 * serveur (`failed[9]`).
 */

export function emptyFailedByCell(): Record<CellKey, number> {
  return Object.fromEntries(CELL_KEYS.map((key) => [key, 0])) as Record<
    CellKey,
    number
  >;
}

export function totalFailed(failed: Record<CellKey, number>): number {
  return CELL_KEYS.reduce((sum, key) => sum + failed[key], 0);
}

/**
 * Répartition des erreurs d'une partie enregistrée avant le détail par case :
 * seul le total est connu. On le garde exact (les vies s'en recalculent) et on
 * l'étale une à une sur les cases encore non remplies, dans l'ordre des cases,
 * là où le joueur a forcément pu se tromper sans conclure. On évite ainsi de
 * fabriquer une case « record » qui fausserait un taux d'échec par case. Grille
 * pleine : sur toutes les cases.
 */
export function distributeLegacyFailures(
  total: number,
  cells: Record<CellKey, Cell>,
): Record<CellKey, number> {
  const failed = emptyFailedByCell();
  const unfilled = CELL_KEYS.filter((key) => cells[key].status !== "filled");
  const targets = unfilled.length > 0 ? unfilled : CELL_KEYS;
  Array.from({ length: Math.max(0, total) }).forEach((_, index) => {
    failed[targets[index % targets.length]] += 1;
  });
  return failed;
}

/**
 * Détail persisté s'il est intact et cohérent avec le total des vies, sinon
 * `null` : l'appelant retombe alors sur `distributeLegacyFailures`.
 */
export function parseFailedByCell(
  raw: unknown,
  expectedTotal: number,
): Record<CellKey, number> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const source = raw as Partial<Record<CellKey, unknown>>;
  const failed = emptyFailedByCell();
  const valid = CELL_KEYS.every((key) => {
    const value = source[key];
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
      return false;
    }
    failed[key] = value;
    return true;
  });
  return valid && totalFailed(failed) === expectedTotal ? failed : null;
}
