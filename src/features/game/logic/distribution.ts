import type { CellGuessDistribution } from "../types";
import { CELL_KEYS } from "./gridTopology";

/**
 * Répartition brute d'une grille, telle que `cellStats` la renvoie : nombre de
 * joueurs par pays et par case, en entiers. Le total et les parts se calculent
 * côté client, ce qui garde la réponse petite et exacte.
 */
export type CellCounts = Record<string, Record<string, number>>;

/** Vue « parts » consommée par la rareté, le score et la grille solution. */
export function toGuessDistribution(
  counts: CellCounts,
): Record<string, CellGuessDistribution> {
  return Object.fromEntries(
    CELL_KEYS.map((cellKey) => {
      const byCountry = counts[cellKey] ?? {};
      const totalGuesses = Object.values(byCountry).reduce(
        (sum, n) => sum + n,
        0,
      );
      const rarityByCountry: Record<string, number> = {};
      if (totalGuesses > 0) {
        Object.entries(byCountry).forEach(([iso, n]) => {
          rarityByCountry[iso] = n / totalGuesses;
        });
      }
      return [cellKey, { totalGuesses, rarityByCountry }];
    }),
  );
}
