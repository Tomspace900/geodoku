import {
  CONSTRAINTS,
  type ConstraintId,
} from "@/features/game/logic/constraints";
import { translate } from "@/i18n/index";

const CONSTRAINT_MAP = new Map(CONSTRAINTS.map((c) => [c.id, c]));

export function constraintLabel(id: string): string {
  const c = CONSTRAINT_MAP.get(id as ConstraintId);
  return c ? translate("fr", c.labelKey) : id;
}

/** Titre de grille admin (ex. en-tête GridDetail, résumés accordéon). */
export function formatGridDateHeadingFr(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(y as number, (m as number) - 1, d as number));
}

export function difficultyStars(d: number): string {
  const stars = Math.round((d / 100) * 5);
  return "★".repeat(stars) + "☆".repeat(5 - stars);
}

/** Seuils 0–100 alignés sur l’admin (facile / moyen / difficile). */
const DIFFICULTY_EASY_MAX = 33;
const DIFFICULTY_MEDIUM_MAX = 66;

export type DifficultyTier = "easy" | "medium" | "hard";

export function difficultyTierFromScore(d: number): DifficultyTier {
  if (d <= DIFFICULTY_EASY_MAX) return "easy";
  if (d <= DIFFICULTY_MEDIUM_MAX) return "medium";
  return "hard";
}

const TIER_SURFACE_TEXT: Record<DifficultyTier, string> = {
  easy: "bg-green-600/15 text-green-600",
  medium: "bg-rarity-rare/15 text-rarity-rare",
  hard: "bg-rarity-ultra/15 text-rarity-ultra",
};

const TIER_SOLID_BG: Record<DifficultyTier, string> = {
  easy: "bg-green-600",
  medium: "bg-rarity-rare",
  hard: "bg-rarity-ultra",
};

/** Pastille avec fond léger + texte (scores dans la grille preview). */
export function difficultyPillClass(d: number): string {
  return TIER_SURFACE_TEXT[difficultyTierFromScore(d)];
}

/** Point plein ou légende calendrier (même tiers que les pastilles). */
export function difficultySolidDotClass(d: number): string {
  return TIER_SOLID_BG[difficultyTierFromScore(d)];
}

/** Badges « X faciles / moyennes / difficiles » (tier sans score numérique). */
export function difficultyTierSurfaceClass(tier: DifficultyTier): string {
  return TIER_SURFACE_TEXT[tier];
}
