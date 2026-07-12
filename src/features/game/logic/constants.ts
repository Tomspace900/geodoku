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
 * Seuil d'ESTIMATEUR : total minimal de soumissions sur une case pour passer de
 * la part brute au leave-one-out. Sous ce seuil, le leave-one-out est dégénéré
 * (dénominateur nul à `total = 1`) ou binaire/instable (0 ou 1 à `total = 2`),
 * donc on garde la part brute. Dès `total ≥ 3`, le leave-one-out est non biaisé.
 */
export const LOO_MIN_TOTAL = 3;

/**
 * Seuil d'AVERTISSEMENT : tant qu'une case remplie reste sous ce total, la rareté
 * est signalée provisoire (marqueur « ≈ » + message « ça s'affinera »). Découplé
 * de `LOO_MIN_TOTAL` : entre les deux (`total` 3–4), on utilise déjà le bon
 * estimateur (leave-one-out) mais on prévient qu'il bouge encore — le score est
 * live (`useQuery` réactif), donc le nombre se réajuste au fil de la journée.
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
