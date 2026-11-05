import type { CellGuessDistribution, CellKey } from "../types";
import { CELL_KEYS } from "./gridTopology";
import { rarityFraction } from "./scoreVariant";

export type BestComboPick = { iso: string; share: number };

/** Départage les combos de même score : le plus rare l'emporte. */
const SHARE_TIE_BREAK = 1e-3;
const INFEASIBLE = 1e9;

/**
 * Affectation de coût minimal (algorithme hongrois, potentiels de Kuhn-Munkres)
 * d'une matrice `n × m`, `n ≤ m`. Renvoie la colonne choisie pour chaque ligne.
 */
function assignMinCost(cost: number[][]): number[] {
  const n = cost.length;
  const m = cost[0]?.length ?? 0;
  // 1-indexed arrays, column 0 is the virtual start.
  const u = new Array<number>(n + 1).fill(0);
  const v = new Array<number>(m + 1).fill(0);
  const rowOfCol = new Array<number>(m + 1).fill(0);
  const way = new Array<number>(m + 1).fill(0);

  for (let row = 1; row <= n; row++) {
    rowOfCol[0] = row;
    let col0 = 0;
    const minv = new Array<number>(m + 1).fill(Number.POSITIVE_INFINITY);
    const used = new Array<boolean>(m + 1).fill(false);
    do {
      used[col0] = true;
      const row0 = rowOfCol[col0];
      let delta = Number.POSITIVE_INFINITY;
      let col1 = 0;
      for (let col = 1; col <= m; col++) {
        if (used[col]) continue;
        const reduced = cost[row0 - 1][col - 1] - u[row0] - v[col];
        if (reduced < minv[col]) {
          minv[col] = reduced;
          way[col] = col0;
        }
        if (minv[col] < delta) {
          delta = minv[col];
          col1 = col;
        }
      }
      for (let col = 0; col <= m; col++) {
        if (used[col]) {
          u[rowOfCol[col]] += delta;
          v[col] -= delta;
        } else {
          minv[col] -= delta;
        }
      }
      col0 = col1;
    } while (rowOfCol[col0] !== 0);
    do {
      const col1 = way[col0];
      rowOfCol[col0] = rowOfCol[col1];
      col0 = col1;
    } while (col0 !== 0);
  }

  const colOfRow = new Array<number>(n).fill(-1);
  for (let col = 1; col <= m; col++) {
    if (rowOfCol[col] !== 0) colOfRow[rowOfCol[col] - 1] = col - 1;
  }
  return colOfRow;
}

/**
 * Calque « Meilleure grille » de la grille solution : un pays par case, sans
 * doublon, qui rapporte le plus de points de rareté sur la répartition donnée
 * (à score égal, le plus rare). Un pays que personne n'a choisi a une part de
 * 0, donc la rareté maximale. `null` si la grille n'a pas de solution complète.
 */
export function bestCombo(
  validAnswers: Record<string, string[]>,
  distribution: Record<string, CellGuessDistribution> | undefined,
): Record<CellKey, BestComboPick> | null {
  const countries = [...new Set(Object.values(validAnswers).flat())].sort();
  if (countries.length < CELL_KEYS.length) return null;

  const shareOf = (cellKey: CellKey, iso: string) =>
    distribution?.[cellKey]?.rarityByCountry[iso] ?? 0;
  const cost = CELL_KEYS.map((cellKey) => {
    const valid = new Set(validAnswers[cellKey] ?? []);
    return countries.map((iso) => {
      if (!valid.has(iso)) return INFEASIBLE;
      const share = shareOf(cellKey, iso);
      return -rarityFraction(share) + share * SHARE_TIE_BREAK;
    });
  });

  const assignment = assignMinCost(cost);
  const picks = {} as Record<CellKey, BestComboPick>;
  for (const [row, cellKey] of CELL_KEYS.entries()) {
    const col = assignment[row];
    if (col < 0 || cost[row][col] >= INFEASIBLE) return null;
    const iso = countries[col];
    picks[cellKey] = { iso, share: shareOf(cellKey, iso) };
  }
  return picks;
}
