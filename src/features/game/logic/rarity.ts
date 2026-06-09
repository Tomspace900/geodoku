import type { FilledCell, GameState, RarityTier } from "../types";
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
 * Score d'originalité : moyenne des tier values sur les cases REMPLIES.
 * Découplé de la complétion (mesurée par le score de grille) — on ne juge que
 * la qualité des choix faits. Une grille sans case remplie vaut 0.
 */
export function computeOriginalityScore(state: GameState): {
  score: number;
  grade: OriginalityGrade;
} {
  const filled = Object.values(state.cells).filter(
    (c): c is FilledCell => c.status === "filled",
  );
  if (filled.length === 0) return { score: 0, grade: "D" };
  const total = filled.reduce(
    (sum, c) => sum + ORIGINALITY_TIER_VALUES[c.rarityTier],
    0,
  );
  const score = Math.round(total / filled.length);
  return { score, grade: originalityToGrade(score) };
}
