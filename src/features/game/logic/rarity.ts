import type { FilledCell, GameState, RarityTier } from "../types";
import {
  COMPLETION_POINTS_PER_CELL,
  MAX_SCORE,
  RARITY_POINTS,
  RARITY_TIERS,
} from "./constants";

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

export function computeScore(state: GameState): {
  raw: number;
  percent: number;
  filledCount: number;
} {
  const filled = Object.values(state.cells).filter(
    (c): c is FilledCell => c.status === "filled",
  );
  const completion = filled.length * COMPLETION_POINTS_PER_CELL;
  const rarityBonus = filled.reduce(
    (sum, c) => sum + RARITY_POINTS[c.rarityTier],
    0,
  );
  const raw = completion + rarityBonus;
  return {
    raw,
    percent: Math.round((raw / MAX_SCORE) * 100),
    filledCount: filled.length,
  };
}
