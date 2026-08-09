import type { CellGuessDistribution, GameModeId, RarityTier } from "../types";
import { ESTIMATED_MAX_TOTAL, RARITY_TIERS } from "./constants";

export function rarityToTier(rarity: number): RarityTier {
  if (rarity > RARITY_TIERS.common) return "common";
  if (rarity > RARITY_TIERS.uncommon) return "uncommon";
  if (rarity > RARITY_TIERS.rare) return "rare";
  return "ultra";
}

/**
 * Une cohorte est **close** dès que la journée est passée : plus aucun coup ne
 * viendra s'y ajouter. C'est le cas du mode entraînement, qui rejoue une grille
 * d'hier sans jamais rien écrire ; la grille du jour, elle, se remplit encore.
 */
export function isCohortComplete(mode: GameModeId): boolean {
  return mode === "training";
}

/**
 * Part **brute** du jour d'un pays dans une case (cohorte, coup du joueur inclus,
 * `count / total`) + drapeau `estimated` (sous `ESTIMATED_MAX_TOTAL` soumissions →
 * donnée mince, provisoire). Base **unique** de rareté : score, couleur des cases
 * en jeu, emojis de partage ET grille solution s'appuient dessus, donc un pays
 * affiche le même tier partout. `null` tant qu'il n'y a pas de donnée.
 *
 * `cohortComplete` change la lecture d'un pays **absent** de la distribution :
 * - cohorte ouverte (grille du jour) → `null`. L'absence veut dire « pas encore » :
 *   la journée continue, et le coup du joueur lui-même n'est pas encore agrégé.
 * - cohorte close (grille passée) → part **0**, donc ultra. L'absence est alors
 *   définitive et signifie « personne ne l'a choisi », ce qui est la définition
 *   même du maximum de rareté. C'est déjà la lecture de la grille solution
 *   (`rarityByCountry[iso] ?? 0`) — sans cela, un pays inédit n'aurait aucun
 *   badge et, pire, laisserait le score en attente indéfiniment.
 */
export function filledCellShare(
  countryCode: string,
  cellDist: CellGuessDistribution | undefined,
  cohortComplete = false,
): { share: number; estimated: boolean } | null {
  // Distribution pas encore chargée : aucune lecture possible, quel que soit le mode.
  if (!cellDist) return null;
  if (cohortComplete) {
    // Cohorte figée : rien ne s'affinera, donc jamais de marqueur « ≈ ».
    return {
      share: cellDist.rarityByCountry[countryCode] ?? 0,
      estimated: false,
    };
  }
  if (cellDist.totalGuesses <= 0) return null;
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
  cohortComplete = false,
): RarityTier | null {
  const resolved = filledCellShare(countryCode, cellDist, cohortComplete);
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
