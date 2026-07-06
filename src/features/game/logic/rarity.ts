import type {
  Cell,
  CellGuessDistribution,
  CellKey,
  FilledCell,
  GameState,
  RarityTier,
} from "../types";
import {
  MAX_GRID_POINTS,
  ORIGINALITY_TIER_VALUES,
  RARITY_TIERS,
} from "./constants";

export type OriginalityGrade = "S" | "A" | "B" | "C" | "D";

export function rarityToTier(rarity: number): RarityTier {
  if (rarity > RARITY_TIERS.common) return "common";
  if (rarity > RARITY_TIERS.uncommon) return "uncommon";
  if (rarity > RARITY_TIERS.rare) return "rare";
  return "ultra";
}

/** Tier d'une réponse dérivé de la distribution du jour ; `null` tant qu'elle n'a pas de donnée pour ce pays. */
export function filledCellTier(
  countryCode: string,
  cellDist: CellGuessDistribution | undefined,
): RarityTier | null {
  if (!cellDist || cellDist.totalGuesses <= 0) return null;
  const share = cellDist.rarityByCountry[countryCode];
  if (share === undefined) return null;
  return rarityToTier(share);
}

/** Part des joueurs (0..1) → entier 0..100 (clé de tri = libellé affiché). */
export function raritySharePercent(rarity: number): number {
  return Math.round(rarity * 100);
}

/** Part des joueurs (0..1) → pourcentage entier arrondi. */
export function formatRarityPercent(rarity: number): string {
  return `${raritySharePercent(rarity)}%`;
}

/**
 * Score de grille : performance pure (cellules remplies + vies restantes).
 * 9 cellules + 5 vies = 14 points. 100 % = grille complétée sans erreur.
 */
export function computeGridScore(state: GameState): {
  percent: number;
  filledCount: number;
  livesLeft: number;
} {
  const filledCount = Object.values(state.cells).filter(
    (c): c is FilledCell => c.status === "filled",
  ).length;
  const livesLeft = state.remainingLives;
  const points = filledCount + livesLeft;
  return {
    percent: Math.round((points / MAX_GRID_POINTS) * 100),
    filledCount,
    livesLeft,
  };
}

export function originalityToGrade(score: number): OriginalityGrade {
  if (score >= 70) return "S";
  if (score >= 50) return "A";
  if (score >= 30) return "B";
  if (score >= 12) return "C";
  return "D";
}

/**
 * Score d'originalité : moyenne des tier values des cases remplies, dérivées de
 * la distribution dynamique. Découplé de la complétion. `null` tant que la
 * distribution n'a pas livré tous les tiers ; grille vide → `{ 0, "D" }`.
 */
export function computeOriginalityScore(
  cells: Record<CellKey, Cell>,
  distribution: Record<string, CellGuessDistribution> | undefined,
): { score: number; grade: OriginalityGrade } | null {
  const filled = (Object.entries(cells) as [CellKey, Cell][]).filter(
    (entry): entry is [CellKey, FilledCell] => entry[1].status === "filled",
  );
  if (filled.length === 0) return { score: 0, grade: "D" };
  if (!distribution) return null;

  let total = 0;
  for (const [key, cell] of filled) {
    const tier = filledCellTier(cell.countryCode, distribution[key]);
    if (tier === null) return null;
    total += ORIGINALITY_TIER_VALUES[tier];
  }
  const score = Math.round(total / filled.length);
  return { score, grade: originalityToGrade(score) };
}
