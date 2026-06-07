import type { RarityTier } from "@/features/game/types";

export const STARTING_LIVES = 5;

/** Durées JS alignées sur les `animate-*` de `src/index.css`. */
export const UI_ANIMATION_MS = {
  errorFeedback: 1500,
  heartBreak: 450,
  flagBounce: 700,
} as const;

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

/**
 * Nombre minimal de soumissions agrégées pour une case avant d’afficher
 * le pourcentage de joueurs par pays (grille solution).
 */
export const MIN_CELL_TOTAL_GUESSES_FOR_SHARE_PERCENT = 5;

// Scoring — V2 : deux scores indépendants
// - Grille : 9 cellules + 5 vies = 14 points → percent = (filled + lives) / 14.
// - Originalité : moyenne des tier values sur les cases REMPLIES (grille vide = 0).
//   Découplé de la complétion (que mesure déjà le score de grille) : ne juge que
//   la qualité des choix faits. common = 0 → un win « safe » tout-commun = grade D.
export const MAX_GRID_POINTS = 9 + STARTING_LIVES; // 14
export const ORIGINALITY_TIER_VALUES: Record<RarityTier, number> = {
  common: 0,
  uncommon: 40,
  rare: 70,
  ultra: 100,
};

export const SHARE_EMOJIS = {
  failed: "⬜", // Blanc : pas de pays trouvé (sortie par les vies)
  blocked: "⬛", // Carré noir : case bloquée par la règle 1 pays = 1 placement
  common: "🟪", // Violet : le plus commun
  uncommon: "🟦", // Bleu : moins commun
  rare: "🟨", // Jaune : plus rare
  ultra: "🟥", // Rouge : ultra rare (le meilleur)
} as const;
