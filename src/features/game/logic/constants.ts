export const STARTING_LIVES = 3;

// Rarity thresholds (rarity = count / total)
export const RARITY_TIERS = {
  common: 0.5, // > 50% of players
  uncommon: 0.25, // > 25%
  rare: 0.1, // > 10%
  // ultra: <= 10%
} as const;

// Scoring
export const COMPLETION_POINTS_PER_CELL = 20;
export const RARITY_POINTS = {
  common: 0,
  uncommon: 5,
  rare: 12,
  ultra: 25,
} as const;
export const MAX_SCORE =
  9 * COMPLETION_POINTS_PER_CELL + 9 * RARITY_POINTS.ultra; // 405

export const SHARE_EMOJIS = {
  common: "🟩",
  uncommon: "🟨",
  rare: "🟧",
  ultra: "🟥",
  failed: "⬛",
} as const;
