import type { RarityTier } from "@/features/game/types";

export const STARTING_LIVES = 3;

/** Pastilles / lignes de rareté (aligné cellules de jeu et grille solution). */
export const RARITY_STYLES: Record<RarityTier, string> = {
  common: "bg-rarity-common/10 text-rarity-common",
  uncommon: "bg-rarity-uncommon/10 text-rarity-uncommon",
  rare: "bg-rarity-rare/10 text-rarity-rare",
  ultra: "bg-rarity-ultra/10 text-rarity-ultra",
};

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
  failed: "⬜", // Blanc : pas de pays trouvé
  common: "🟪", // Violet : le plus commun
  uncommon: "🟦", // Bleu : moins commun
  rare: "🟨", // Jaune : plus rare
  ultra: "🟥", // Rouge : ultra rare (le meilleur)
} as const;
