import {
  CONSTRAINT_BY_ID,
  type ConstraintId,
} from "@/features/game/logic/constraints";
import { translate } from "@/i18n/index";

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

type DifficultyTier = "easy" | "medium" | "hard";

function difficultyTierFromScore(d: number): DifficultyTier {
  if (d <= DIFFICULTY_EASY_MAX) return "easy";
  if (d <= DIFFICULTY_MEDIUM_MAX) return "medium";
  return "hard";
}

const TIER_SURFACE_TEXT: Record<DifficultyTier, string> = {
  easy: "bg-success/15 text-success",
  medium: "bg-warning/15 text-warning",
  hard: "bg-error/15 text-error",
};

/** Pastille avec fond léger + texte (score de difficulté 0–100). */
export function difficultyPillClass(d: number): string {
  return TIER_SURFACE_TEXT[difficultyTierFromScore(d)];
}

// ─── Notoriété des solutions (popTop3) ─────────────────────────────────────────
// Convention : score 0–100 = popularityScore100(popTop3), 100 = solutions très
// connues = case facile. Les couleurs réutilisent les tiers de difficulté en
// inversant le score (100 − s) : vert = connu, rouge = obscur.

/** Pastille texte pour un score de notoriété (fond léger). */
export function popularityPillClass(score: number): string {
  return TIER_SURFACE_TEXT[difficultyTierFromScore(100 - score)];
}

// ─── Taux observés par case (trompés, laissées vides) ──────────────────────────
// Plus le taux est haut, plus le rouge est soutenu : la case dure saute aux yeux.

const RATE_TIERS: ReadonlyArray<{ min: number; className: string }> = [
  { min: 0.4, className: "bg-error text-surface-lowest" },
  { min: 0.2, className: "bg-error/20 text-error" },
  { min: 0.1, className: "bg-error/10 text-error" },
];
const RATE_LOW_CLASS = "bg-surface-low text-on-surface-variant";

/** Pastille d'un taux par case (0–1), `null` = cohorte trop mince. */
export function cellRatePillClass(rate: number | null): string {
  if (rate === null) return RATE_LOW_CLASS;
  return (
    RATE_TIERS.find((tier) => rate >= tier.min)?.className ?? RATE_LOW_CLASS
  );
}

/** Pourcentage arrondi d'un taux, `—` quand il n'est pas lisible. */
export function formatRate(rate: number | null): string {
  return rate === null ? "—" : `${Math.round(rate * 100)} %`;
}
