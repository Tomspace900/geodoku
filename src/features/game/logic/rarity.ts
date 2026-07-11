import type { CellGuessDistribution, RarityTier } from "../types";
import {
  MIN_CELL_TOTAL_GUESSES_FOR_SHARE_PERCENT,
  RARITY_TIERS,
} from "./constants";

export function rarityToTier(rarity: number): RarityTier {
  if (rarity > RARITY_TIERS.common) return "common";
  if (rarity > RARITY_TIERS.uncommon) return "uncommon";
  if (rarity > RARITY_TIERS.rare) return "rare";
  return "ultra";
}

/**
 * Tier dérivé de la part **brute** du jour (tous les joueurs, coup inclus).
 * Sert la grille solution (cohorte) ; `null` tant qu'il n'y a pas de donnée.
 */
export function filledCellTier(
  countryCode: string,
  cellDist: CellGuessDistribution | undefined,
): RarityTier | null {
  if (!cellDist || cellDist.totalGuesses <= 0) return null;
  const share = cellDist.rarityByCountry[countryCode];
  if (share === undefined) return null;
  return rarityToTier(share);
}

/**
 * Part des **autres** joueurs pour LE pick DU joueur (leave-one-out) :
 * `(count − 1) / (total − 1)`. Sans ça, ton propre coup gonfle ton dénominateur et
 * l'arc rareté plafonne sous 100 %. Sous `MIN_CELL_TOTAL_GUESSES_FOR_SHARE_PERCENT`
 * soumissions, la donnée est trop mince → on retombe sur la part brute et on signale
 * `estimated` (le score s'affinera au fil des parties du jour). `null` si pas de donnée.
 */
export function playerLeaveOneOutShare(
  countryCode: string,
  cellDist: CellGuessDistribution | undefined,
): { share: number; estimated: boolean } | null {
  if (!cellDist || cellDist.totalGuesses <= 0) return null;
  const brute = cellDist.rarityByCountry[countryCode];
  if (brute === undefined) return null;
  const total = cellDist.totalGuesses;
  if (total > 1 && total >= MIN_CELL_TOTAL_GUESSES_FOR_SHARE_PERCENT) {
    const count = Math.round(brute * total);
    return { share: (count - 1) / (total - 1), estimated: false };
  }
  return { share: brute, estimated: true };
}

/**
 * Tier de la réponse **du joueur** (leave-one-out) — couleur de sa case, emoji de
 * partage, succès. `null` tant que la case n'a pas de donnée.
 */
export function playerCellTier(
  countryCode: string,
  cellDist: CellGuessDistribution | undefined,
): RarityTier | null {
  const resolved = playerLeaveOneOutShare(countryCode, cellDist);
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
