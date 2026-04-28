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

export function formatRarityPercent(rarity: number): string {
  const pct = Math.round(rarity * 100);
  return pct < 1 ? "<1%" : `${pct}%`;
}

/**
 * Score de grille : performance pure (cellules remplies + vies restantes).
 * 9 cellules + 3 vies = 12 points. 100 % = grille complétée sans erreur.
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
  if (score >= 80) return "S";
  if (score >= 60) return "A";
  if (score >= 40) return "B";
  if (score >= 20) return "C";
  return "D";
}

/**
 * Score d'originalité : moyenne des tier values sur 9 cellules. Cellules vides
 * comptent 0 — l'incomplétion pénalise l'originalité.
 */
export function computeOriginalityScore(state: GameState): {
  score: number;
  grade: OriginalityGrade;
} {
  const filled = Object.values(state.cells).filter(
    (c): c is FilledCell => c.status === "filled",
  );
  const total = filled.reduce(
    (sum, c) => sum + ORIGINALITY_TIER_VALUES[c.rarityTier],
    0,
  );
  const score = Math.round(total / 9);
  return { score, grade: originalityToGrade(score) };
}
