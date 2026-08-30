import {
  answersForConstraint,
  type ConstraintId,
} from "../../../../content/constraints";
import type { TKey } from "../../../i18n/types.ts";

export type { ConstraintId } from "../../../../content/constraints";

export type ConstraintCategory =
  | "continent"
  | "water_access"
  | "borders_count"
  | "borders_pivot"
  | "area"
  | "population"
  | "language"
  | "flag"
  | "latitude"
  | "subregion"
  | "time_zones"
  | "event"
  | "political"
  | "regime"
  | "physical"
  | "density"
  | "nature"
  | "society"
  | "ocean";

export type Constraint = {
  id: ConstraintId;
  labelKey: TKey;
  category: ConstraintCategory;
};

// ─── Constraints ──────────────────────────────────────────────────────────────
// Les listes ISO3 acceptées vivent dans `content/constraints/<id>/answers.ts` :
// ce module ne porte plus que l'identité, le label i18n et la catégorie.

/** Catalogue utilisé pour générer les nouvelles grilles. */
export const CONSTRAINTS: Constraint[] = [
  // ── Continent ──────────────────────────────────────────────────────────────
  {
    id: "continent_africa",
    labelKey: "constraint.continent_africa",
    category: "continent",
  },
  {
    id: "continent_asia",
    labelKey: "constraint.continent_asia",
    category: "continent",
  },
  {
    id: "continent_europe",
    labelKey: "constraint.continent_europe",
    category: "continent",
  },
  {
    id: "continent_north_america",
    labelKey: "constraint.continent_north_america",
    category: "continent",
  },
  {
    id: "continent_south_america",
    labelKey: "constraint.continent_south_america",
    category: "continent",
  },
  {
    id: "continent_oceania",
    labelKey: "constraint.continent_oceania",
    category: "continent",
  },

  // ── Accès à l'eau ──────────────────────────────────────────────────────────
  {
    id: "water_island",
    labelKey: "constraint.water_island",
    category: "water_access",
  },
  {
    id: "water_landlocked",
    labelKey: "constraint.water_landlocked",
    category: "water_access",
  },

  // ── Frontières — nombre ────────────────────────────────────────────────────
  {
    id: "borders_solo",
    labelKey: "constraint.borders_solo",
    category: "borders_count",
  },
  {
    id: "borders_min_5",
    labelKey: "constraint.borders_min_5",
    category: "borders_count",
  },
  {
    id: "borders_min_7",
    labelKey: "constraint.borders_min_7",
    category: "borders_count",
  },

  // ── Frontières — pivot ─────────────────────────────────────────────────────
  {
    id: "borders_russia",
    labelKey: "constraint.borders_russia",
    category: "borders_pivot",
  },
  {
    id: "borders_china",
    labelKey: "constraint.borders_china",
    category: "borders_pivot",
  },
  {
    id: "borders_brazil",
    labelKey: "constraint.borders_brazil",
    category: "borders_pivot",
  },
  {
    id: "borders_india",
    labelKey: "constraint.borders_india",
    category: "borders_pivot",
  },

  // ── Superficie — comparaison à un pays-repère ──────────────────────────────
  {
    id: "area_larger_india",
    labelKey: "constraint.area_larger_india",
    category: "area",
  },
  {
    id: "area_larger_mexico",
    labelKey: "constraint.area_larger_mexico",
    category: "area",
  },
  {
    id: "area_larger_france",
    labelKey: "constraint.area_larger_france",
    category: "area",
  },
  {
    id: "area_smaller_belgium",
    labelKey: "constraint.area_smaller_belgium",
    category: "area",
  },
  {
    id: "area_smaller_luxembourg",
    labelKey: "constraint.area_smaller_luxembourg",
    category: "area",
  },

  // ── Population — comparaison à un pays-repère ──────────────────────────────
  {
    id: "population_more_germany",
    labelKey: "constraint.population_more_germany",
    category: "population",
  },
  {
    id: "population_more_canada",
    labelKey: "constraint.population_more_canada",
    category: "population",
  },
  {
    id: "population_less_iceland",
    labelKey: "constraint.population_less_iceland",
    category: "population",
  },

  // ── Langue ─────────────────────────────────────────────────────────────────
  {
    id: "language_french",
    labelKey: "constraint.language_french",
    category: "language",
  },
  {
    id: "language_arabic",
    labelKey: "constraint.language_arabic",
    category: "language",
  },
  {
    id: "language_spanish",
    labelKey: "constraint.language_spanish",
    category: "language",
  },
  {
    id: "language_english",
    labelKey: "constraint.language_english",
    category: "language",
  },
  {
    id: "language_portuguese",
    labelKey: "constraint.language_portuguese",
    category: "language",
  },
  {
    id: "language_russian",
    labelKey: "constraint.language_russian",
    category: "language",
  },

  // ── Drapeau ────────────────────────────────────────────────────────────────
  {
    id: "flag_has_star",
    labelKey: "constraint.flag_has_star",
    category: "flag",
  },
  {
    id: "flag_has_crescent",
    labelKey: "constraint.flag_has_crescent",
    category: "flag",
  },
  {
    id: "flag_has_cross",
    labelKey: "constraint.flag_has_cross",
    category: "flag",
  },
  {
    id: "flag_has_animal",
    labelKey: "constraint.flag_has_animal",
    category: "flag",
  },

  // ── Latitude ───────────────────────────────────────────────────────────────
  {
    id: "latitude_south_hemisphere",
    labelKey: "constraint.latitude_south_hemisphere",
    category: "latitude",
  },
  {
    id: "latitude_polar",
    labelKey: "constraint.latitude_polar",
    category: "latitude",
  },

  // ── Sous-région ────────────────────────────────────────────────────────────
  {
    id: "subregion_middle_east",
    labelKey: "constraint.subregion_middle_east",
    category: "subregion",
  },
  {
    id: "subregion_caribbean",
    labelKey: "constraint.subregion_caribbean",
    category: "subregion",
  },
  {
    id: "subregion_southeast_asia",
    labelKey: "constraint.subregion_southeast_asia",
    category: "subregion",
  },

  // ── Fuseaux horaires ──────────────────────────────────────────────────────
  {
    id: "time_zones_multiple",
    labelKey: "constraint.time_zones_multiple",
    category: "time_zones",
  },

  // ── Événements ─────────────────────────────────────────────────────────────
  {
    id: "event_fifa_wc_host",
    labelKey: "constraint.event_fifa_wc_host",
    category: "event",
  },
  {
    id: "event_summer_olympics_host",
    labelKey: "constraint.event_summer_olympics_host",
    category: "event",
  },
  {
    id: "event_winter_olympics_host",
    labelKey: "constraint.event_winter_olympics_host",
    category: "event",
  },

  // ── Politique / memberships ────────────────────────────────────────────────
  {
    id: "political_eu",
    labelKey: "constraint.political_eu",
    category: "political",
  },
  {
    id: "political_g20",
    labelKey: "constraint.political_g20",
    category: "political",
  },
  {
    id: "political_nato",
    labelKey: "constraint.political_nato",
    category: "political",
  },
  {
    id: "political_commonwealth",
    labelKey: "constraint.political_commonwealth",
    category: "political",
  },
  {
    id: "political_arab_league",
    labelKey: "constraint.political_arab_league",
    category: "political",
  },
  {
    id: "political_opec",
    labelKey: "constraint.political_opec",
    category: "political",
  },

  // ── Régime ─────────────────────────────────────────────────────────────────
  {
    id: "regime_monarchy",
    labelKey: "constraint.regime_monarchy",
    category: "regime",
  },

  // ── Géographie physique ────────────────────────────────────────────────────
  {
    id: "physical_crosses_equator",
    labelKey: "constraint.physical_crosses_equator",
    category: "physical",
  },
  {
    id: "physical_mediterranean_coast",
    labelKey: "constraint.physical_mediterranean_coast",
    category: "physical",
  },
  {
    id: "physical_caribbean_coast",
    labelKey: "constraint.physical_caribbean_coast",
    category: "physical",
  },
  {
    id: "physical_peak_over_5000m",
    labelKey: "constraint.physical_peak_over_5000m",
    category: "physical",
  },

  // ── Densité de population — comparaison à un pays-repère ───────────────────
  {
    id: "density_more_netherlands",
    labelKey: "constraint.density_more_netherlands",
    category: "density",
  },
  {
    id: "density_more_japan",
    labelKey: "constraint.density_more_japan",
    category: "density",
  },
  {
    id: "density_less_russia",
    labelKey: "constraint.density_less_russia",
    category: "density",
  },
  {
    id: "density_less_canada",
    labelKey: "constraint.density_less_canada",
    category: "density",
  },

  // ── Nature — biomes ────────────────────────────────────────────────────────
  {
    id: "nature_desert",
    labelKey: "constraint.nature_desert",
    category: "nature",
  },
  {
    id: "nature_rainforest",
    labelKey: "constraint.nature_rainforest",
    category: "nature",
  },
  {
    id: "nature_holocene_volcano",
    labelKey: "constraint.nature_holocene_volcano",
    category: "nature",
  },
  {
    id: "nature_mountain_area_majority",
    labelKey: "constraint.nature_mountain_area_majority",
    category: "nature",
  },
  {
    id: "forest_cover_majority",
    labelKey: "constraint.forest_cover_majority",
    category: "nature",
  },

  // ── Océans — façade maritime ───────────────────────────────────────────────
  {
    id: "ocean_atlantic",
    labelKey: "constraint.ocean_atlantic",
    category: "ocean",
  },
  {
    id: "ocean_pacific",
    labelKey: "constraint.ocean_pacific",
    category: "ocean",
  },
  {
    id: "ocean_indian",
    labelKey: "constraint.ocean_indian",
    category: "ocean",
  },
  {
    id: "ocean_multiple_basins",
    labelKey: "constraint.ocean_multiple_basins",
    category: "ocean",
  },

  // ── Société ────────────────────────────────────────────────────────────────
  {
    id: "society_drives_on_left",
    labelKey: "constraint.society_drives_on_left",
    category: "society",
  },
  {
    id: "society_capital_not_largest",
    labelKey: "constraint.society_capital_not_largest",
    category: "society",
  },
  {
    id: "urban_centres_min_3_over_1m",
    labelKey: "constraint.urban_centres_min_3_over_1m",
    category: "society",
  },
];

// ─── Contraintes archivées ──────────────────────────────────────────────────────
// Hors génération, conservées pour rejouer d'anciennes grilles publiées qui les
// référencent encore. Jamais dans `CONSTRAINTS` ; seul `CONSTRAINT_BY_ID` et
// `constraintAnswers` les exposent. Leurs listes ISO3 sont figées à la main
// (`content/constraints/<id>/answers.ts`, sans en-tête @generated).

/** Contraintes hors génération, conservées pour rejouer les anciennes grilles. */
export const ARCHIVED_CONSTRAINTS: Constraint[] = [
  {
    id: "flag_two_colors",
    labelKey: "constraint.flag_two_colors",
    category: "flag",
  },
  {
    id: "area_gt_2M",
    labelKey: "constraint.area_gt_2M",
    category: "area",
  },
  {
    id: "area_gt_500k",
    labelKey: "constraint.area_gt_500k",
    category: "area",
  },
  {
    id: "area_lt_1k",
    labelKey: "constraint.area_lt_1k",
    category: "area",
  },
  {
    id: "density_high",
    labelKey: "constraint.density_high",
    category: "density",
  },
  {
    id: "density_low",
    labelKey: "constraint.density_low",
    category: "density",
  },
  {
    id: "language_multilingual",
    labelKey: "constraint.language_multilingual",
    category: "language",
  },
  {
    id: "population_gt_100M",
    labelKey: "constraint.population_gt_100M",
    category: "population",
  },
  {
    id: "population_gt_30M",
    labelKey: "constraint.population_gt_30M",
    category: "population",
  },
  {
    id: "population_lt_1M",
    labelKey: "constraint.population_lt_1M",
    category: "population",
  },
  {
    id: "population_lt_2_5M",
    labelKey: "constraint.population_lt_2_5M",
    category: "population",
  },
];

const ALL_CONSTRAINTS: Constraint[] = [...CONSTRAINTS, ...ARCHIVED_CONSTRAINTS];

/**
 * Lookup id → contrainte couvrant l'actif **et** l'archivé. Sert à résoudre le
 * label d'une grille quelconque, y compris une ancienne grille rejouée.
 * `CONSTRAINTS` reste l'unique source de la génération.
 */
export const CONSTRAINT_BY_ID: ReadonlyMap<ConstraintId, Constraint> = new Map(
  ALL_CONSTRAINTS.map((constraint) => [constraint.id, constraint]),
);

/** Projection runtime immuable des listes éditoriales, construite au chargement. */
const ANSWERS_BY_ID: ReadonlyMap<ConstraintId, ReadonlySet<string>> = new Map(
  ALL_CONSTRAINTS.map(({ id }) => [id, new Set(answersForConstraint(id))]),
);

/**
 * Codes ISO3 acceptés par une contrainte, active ou archivée.
 *
 * Lève sur un identifiant inconnu : la carte couvre `ConstraintId` de façon
 * exhaustive, donc un miss signale une grille corrompue et doit rester bruyant
 * plutôt que se traduire en « aucun pays ne convient ».
 */
export function constraintAnswers(
  constraintId: ConstraintId,
): ReadonlySet<string> {
  const answers = ANSWERS_BY_ID.get(constraintId);
  if (!answers) throw new Error(`Unknown constraint id: ${constraintId}`);
  return answers;
}

export function matchesConstraint(
  constraintId: ConstraintId,
  iso3: string,
): boolean {
  return constraintAnswers(constraintId).has(iso3);
}
