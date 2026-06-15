import {
  CONSTRAINT_BY_ID,
  type ConstraintId,
} from "@/features/game/logic/constraints";
import { translate } from "@/i18n/index";
import type { DeltaSeverity } from "./analytics";

export function constraintLabel(id: string): string {
  const c = CONSTRAINT_BY_ID.get(id as ConstraintId);
  return c ? translate("fr", c.labelKey) : id;
}

/** Titre de grille admin (ex. en-tête du détail de grille au clic). */
export function formatGridDateHeadingFr(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(y as number, (m as number) - 1, d as number));
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
  easy: "bg-success/15 text-success",
  medium: "bg-warning/15 text-warning",
  hard: "bg-error/15 text-error",
};

/** Pastille avec fond léger + texte (scores dans la grille preview). */
export function difficultyPillClass(d: number): string {
  return TIER_SURFACE_TEXT[difficultyTierFromScore(d)];
}

/** Badges « X faciles / moyennes / difficiles » (tier sans score numérique). */
export function difficultyTierSurfaceClass(tier: DifficultyTier): string {
  return TIER_SURFACE_TEXT[tier];
}

// ─── Notoriété des solutions (popTop3) ─────────────────────────────────────────
// Convention : score 0–100 = popularityScore100(popTop3), 100 = solutions très
// connues = case facile. Les couleurs réutilisent les tiers de difficulté en
// inversant le score (100 − s) : vert = connu, rouge = obscur.

/** Pastille texte pour un score de notoriété (fond léger). */
export function popularityPillClass(score: number): string {
  return TIER_SURFACE_TEXT[difficultyTierFromScore(100 - score)];
}

const DELTA_SEVERITY_TEXT: Record<DeltaSeverity, string> = {
  good: "text-success",
  off: "text-warning",
  missed: "text-error",
};

/** Couleur de texte d'un écart prédiction/observé selon sa sévérité. */
export function deltaSeverityTextClass(severity: DeltaSeverity): string {
  return DELTA_SEVERITY_TEXT[severity];
}
