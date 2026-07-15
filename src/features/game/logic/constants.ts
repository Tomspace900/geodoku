import type { RarityTier } from "@/features/game/types";

export { STARTING_LIVES } from "./gridTopology";

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
 * Seuil d'avertissement : tant qu'une case remplie reste sous ce total de
 * soumissions, sa part brute est encore trop mince → rareté signalée provisoire
 * (marqueur « ≈ » + message « ça s'affinera »). Le score est live (`useQuery`
 * réactif) : il évolue au fil de la journée à mesure que la cohorte se remplit,
 * et le drapeau s'éteint dès que la case atteint ce seuil.
 */
export const ESTIMATED_MAX_TOTAL = 5;

export const SHARE_EMOJIS = {
  failed: "⬜", // Blanc : pas de pays trouvé (sortie par les vies)
  blocked: "⬛", // Carré noir : case bloquée par la règle 1 pays = 1 placement
  common: "🟪", // Violet : le plus commun
  uncommon: "🟦", // Bleu : moins commun
  rare: "🟨", // Jaune : plus rare
  ultra: "🟥", // Rouge : ultra rare (le meilleur)
} as const;
