import type { Cell, CellGuessDistribution, RarityTier } from "../types";
import { filledCellShare, filledCellTier, rarityToTier } from "./rarity";

export type SolutionCellSummary = Readonly<{
  userPick: Readonly<{
    iso: string;
    tier: RarityTier | null;
    /** Replié pour ne pas dupliquer la ligne quand le choix du joueur est aussi le plus rare trouvé. */
    isRarestFound: boolean;
  }> | null;
  /** `null` sans distribution, sans réponse à part strictement positive, ou si c'est déjà `userPick`. */
  rarestFound: Readonly<{ iso: string; tier: RarityTier }> | null;
  answerCount: number;
}>;

/**
 * Résumé lisible d'une case de la grille solution : le choix du joueur (avec
 * son tier), le pays le plus rare trouvé par la cohorte (part strictement
 * positive — donc choisi au moins une fois), et le nombre de réponses
 * valides. Base de rareté unique (`filledCellShare`/`filledCellTier`),
 * partagée avec le jeu et le Drawer des réponses.
 */
export function computeSolutionCellSummary(params: {
  codes: readonly string[];
  userCell: Cell | undefined;
  cellDist: CellGuessDistribution | undefined;
  cohortComplete: boolean;
  compareByName: (a: string, b: string) => number;
}): SolutionCellSummary {
  const { codes, userCell, cellDist, cohortComplete, compareByName } = params;
  const userIso = userCell?.status === "filled" ? userCell.countryCode : null;

  const rarest = codes
    .map((iso) => ({
      iso,
      share: filledCellShare(iso, cellDist, cohortComplete),
    }))
    .filter(
      (
        entry,
      ): entry is {
        iso: string;
        share: { share: number; estimated: boolean };
      } => entry.share !== null && entry.share.share > 0,
    )
    .sort((a, b) => {
      if (a.share.share !== b.share.share) {
        return a.share.share - b.share.share;
      }
      return compareByName(a.iso, b.iso);
    })
    .at(0);

  const rarestIsUserPick = rarest !== undefined && rarest.iso === userIso;

  return {
    userPick: userIso
      ? {
          iso: userIso,
          tier: filledCellTier(userIso, cellDist, cohortComplete),
          isRarestFound: rarestIsUserPick,
        }
      : null,
    rarestFound:
      rarest && !rarestIsUserPick
        ? { iso: rarest.iso, tier: rarityToTier(rarest.share.share) }
        : null,
    answerCount: codes.length,
  };
}
