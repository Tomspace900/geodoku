import {
  CONSTRAINT_BY_ID,
  type Constraint,
  type ConstraintCategory,
} from "@/features/game/logic/constraints";

/**
 * Thématiques de « Mes stats » (#155) : chaque continent compte à part, les
 * autres contraintes se regroupent par famille, assez larges pour réunir
 * quelques cases par mois.
 */
export const THEME_IDS = [
  "continent_africa",
  "continent_asia",
  "continent_europe",
  "continent_north_america",
  "continent_south_america",
  "continent_oceania",
  "flags",
  "population",
  "area",
  "borders",
  "languages",
  "seas",
  "nature",
  "history",
  "economy",
  "society",
  "regions",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

const CONTINENT_THEMES = new Set<string>(
  THEME_IDS.filter((id) => id.startsWith("continent_")),
);

/** Côtes : des mers, pas du relief, même si leur catégorie est « physical ». */
const SEA_CONSTRAINTS = new Set<string>([
  "physical_mediterranean_coast",
  "physical_caribbean_coast",
]);

const THEME_BY_CATEGORY = {
  // Jamais lu : chaque continent est sa propre thématique (plus haut).
  continent: "nature",
  flag: "flags",
  population: "population",
  density: "population",
  area: "area",
  borders_count: "borders",
  borders_pivot: "borders",
  language: "languages",
  ocean: "seas",
  water_access: "seas",
  physical: "nature",
  nature: "nature",
  latitude: "nature",
  history: "history",
  political: "history",
  regime: "history",
  event: "history",
  production: "economy",
  energy: "economy",
  society: "society",
  time_zones: "society",
  subregion: "regions",
} as const satisfies Record<ConstraintCategory, ThemeId>;

/**
 * Thématique d'une contrainte, archivées comprises (une grille passée peut en
 * porter une). `null` pour un identifiant inconnu, qui ne compte nulle part.
 */
export function themeOf(constraintId: string): ThemeId | null {
  if (CONTINENT_THEMES.has(constraintId)) return constraintId as ThemeId;
  if (SEA_CONSTRAINTS.has(constraintId)) return "seas";
  const byId: ReadonlyMap<string, Constraint> = CONSTRAINT_BY_ID;
  const category = byId.get(constraintId)?.category;
  return category ? THEME_BY_CATEGORY[category] : null;
}
