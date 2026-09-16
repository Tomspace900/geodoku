import type { CellGuessDistribution, RarityTier } from "../types";
import { filledCellShare, filledCellTier, raritySharePercent } from "./rarity";

export type OrderedSolutionCountry = { iso: string; tier: RarityTier | null };

/**
 * Ordonne les réponses d'une case solution : du plus rare au plus commun
 * (part croissante) ; les réponses sans part connue (pas encore agrégées, sur
 * une cohorte ouverte) suivent, triées par nom, plutôt que de se mêler aux
 * parts connues — repli alphabétique aussi à part strictement égale.
 *
 * Base de rareté unique — `filledCellShare`/`filledCellTier`, partagée avec
 * le score, les cases en jeu et le résumé de case (`solutionCellSummary.ts`) —
 * pour qu'un pays affiche le même tier partout : une cohorte close donne
 * « ultra » à un pays absent (personne ne l'a choisi) là où une cohorte
 * ouverte renvoie `null` (pas encore agrégé).
 */
export function orderSolutionCountries(
  codes: readonly string[],
  cellDist: CellGuessDistribution | undefined,
  cohortComplete: boolean,
  compareByName: (a: string, b: string) => number,
): OrderedSolutionCountry[] {
  return codes
    .map((iso) => ({
      iso,
      tier: filledCellTier(iso, cellDist, cohortComplete),
    }))
    .sort((a, b) => {
      const shareA = filledCellShare(a.iso, cellDist, cohortComplete);
      const shareB = filledCellShare(b.iso, cellDist, cohortComplete);
      if (shareA !== null && shareB !== null) {
        const pctA = raritySharePercent(shareA.share);
        const pctB = raritySharePercent(shareB.share);
        if (pctA !== pctB) return pctA - pctB;
        return compareByName(a.iso, b.iso);
      }
      if (shareA !== null) return -1;
      if (shareB !== null) return 1;
      return compareByName(a.iso, b.iso);
    });
}
