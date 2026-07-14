import type { CellGuessDistribution, RarityTier } from "../types";
import { ESTIMATED_MAX_TOTAL, RARITY_TIERS } from "./constants";

export function rarityToTier(rarity: number): RarityTier {
  if (rarity > RARITY_TIERS.common) return "common";
  if (rarity > RARITY_TIERS.uncommon) return "uncommon";
  if (rarity > RARITY_TIERS.rare) return "rare";
  return "ultra";
}

/**
 * Part **brute** du jour d'un pays dans une case (cohorte, coup du joueur inclus,
 * `count / total`) + drapeau `estimated` (sous `ESTIMATED_MAX_TOTAL` soumissions →
 * donnée mince, provisoire). Base **unique** de rareté : score, couleur des cases
 * en jeu, emojis de partage ET grille solution s'appuient dessus, donc un pays
 * affiche le même tier partout. `null` tant qu'il n'y a pas de donnée.
 */
export function filledCellShare(
  countryCode: string,
  cellDist: CellGuessDistribution | undefined,
): { share: number; estimated: boolean } | null {
  if (!cellDist || cellDist.totalGuesses <= 0) return null;
  const share = cellDist.rarityByCountry[countryCode];
  if (share === undefined) return null;
  return { share, estimated: cellDist.totalGuesses < ESTIMATED_MAX_TOTAL };
}

/**
 * Tier dérivé de la part brute du jour (cohorte). Couleur des cases en jeu, des
 * emojis de partage et de la grille solution. `null` tant qu'il n'y a pas de donnée.
 */
export function filledCellTier(
  countryCode: string,
  cellDist: CellGuessDistribution | undefined,
): RarityTier | null {
  const resolved = filledCellShare(countryCode, cellDist);
  return resolved === null ? null : rarityToTier(resolved.share);
}

/** Part des joueurs (0..1) → entier 0..100 (clé de tri = libellé affiché). */
export function raritySharePercent(rarity: number): number {
  return Math.round(rarity * 100);
}

/** Part des joueurs (0..1) → pourcentage entier arrondi. */
export function formatRarityPercent(rarity: number): string {
  return `${raritySharePercent(rarity)}%`;
}
