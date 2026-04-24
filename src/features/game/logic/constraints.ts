import type { TKey } from "../../../i18n/types.ts";
import type { Country } from "../../countries/types.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  | "event"
  | "political"
  | "regime"
  | "physical"
  | "density";

export type ConstraintDifficulty = "easy" | "medium" | "hard";

/** Identifiant stable d'une contrainte (clé i18n sans le préfixe `constraint.`). */
export type ConstraintId =
  | "area_gt_2M"
  | "area_gt_500k"
  | "area_lt_1k"
  | "borders_brazil"
  | "borders_china"
  | "borders_india"
  | "borders_min_5"
  | "borders_min_7"
  | "borders_russia"
  | "borders_solo"
  | "borders_turkey"
  | "continent_africa"
  | "continent_asia"
  | "continent_europe"
  | "continent_north_america"
  | "continent_oceania"
  | "continent_south_america"
  | "density_high"
  | "density_low"
  | "event_fifa_wc_host"
  | "event_summer_olympics_host"
  | "flag_has_crescent"
  | "flag_has_cross"
  | "flag_has_star"
  | "language_arabic"
  | "language_english"
  | "language_french"
  | "language_multilingual"
  | "language_portuguese"
  | "language_russian"
  | "language_spanish"
  | "latitude_polar"
  | "latitude_south_hemisphere"
  | "physical_caribbean_coast"
  | "physical_crosses_equator"
  | "physical_mediterranean_coast"
  | "physical_peak_over_5000m"
  | "political_commonwealth"
  | "political_eu"
  | "political_g20"
  | "political_nato"
  | "population_gt_100M"
  | "population_gt_30M"
  | "population_lt_1M"
  | "population_lt_2_5M"
  | "regime_monarchy"
  | "subregion_caribbean"
  | "subregion_middle_east"
  | "subregion_southeast_asia"
  | "water_island"
  | "water_landlocked";

export type Constraint = {
  id: ConstraintId;
  labelKey: TKey;
  category: ConstraintCategory;
  /** Heuristique pour le scoring des grilles (mélange easy/medium/hard). */
  difficulty: ConstraintDifficulty;
  predicate: (country: Country) => boolean;
};

// ─── Area thresholds (km²) ────────────────────────────────────────────────────

const AREA_GT_2M = 2_000_000;
const AREA_GT_500K = 500_000;
const AREA_LT_1K = 1_000;

// ─── Population thresholds (hab.) — calibrés sur countries.json (197 pays) ─────

const POP_GT_100M = 100_000_000;
const POP_GT_30M = 30_000_000;
const POP_LT_2_5M = 2_500_000;
const POP_LT_1M = 1_000_000;

// ─── Border count thresholds ──────────────────────────────────────────────────

const BORDERS_SOLO = 1;
const BORDERS_MIN_5 = 5;
const BORDERS_MIN_7 = 7;

// ─── Latitude thresholds (degrés décimaux) ────────────────────────────────────

/** |lat| > POLAR_ABS_LAT → pays du grand nord/sud (Scandinavie, Canada, Russie). */
const POLAR_ABS_LAT = 55;

// ─── Density thresholds (hab./km²) ────────────────────────────────────────────

const DENSITY_HIGH = 300;
const DENSITY_LOW = 10;

// ─── ISO 639-1 language codes ─────────────────────────────────────────────────

const LANG_FR = "fr";
const LANG_AR = "ar";
const LANG_ES = "es";
const LANG_EN = "en";
const LANG_PT = "pt";
const LANG_RU = "ru";

// ─── ISO 3166-1 alpha-3 pivot country codes ───────────────────────────────────

const CODE_RUS = "RUS";
const CODE_CHN = "CHN";
const CODE_BRA = "BRA";
const CODE_TUR = "TUR";
const CODE_IND = "IND";

// ─── Constraints ──────────────────────────────────────────────────────────────

export const CONSTRAINTS: Constraint[] = [
  // ── Continent ──────────────────────────────────────────────────────────────
  {
    id: "continent_africa",
    labelKey: "constraint.continent_africa",
    category: "continent",
    difficulty: "easy",
    predicate: (c) => c.continent === "africa",
  },
  {
    id: "continent_asia",
    labelKey: "constraint.continent_asia",
    category: "continent",
    difficulty: "easy",
    predicate: (c) => c.continent === "asia",
  },
  {
    id: "continent_europe",
    labelKey: "constraint.continent_europe",
    category: "continent",
    difficulty: "easy",
    predicate: (c) => c.continent === "europe",
  },
  {
    id: "continent_north_america",
    labelKey: "constraint.continent_north_america",
    category: "continent",
    difficulty: "easy",
    predicate: (c) => c.continent === "north_america",
  },
  {
    id: "continent_south_america",
    labelKey: "constraint.continent_south_america",
    category: "continent",
    difficulty: "easy",
    predicate: (c) => c.continent === "south_america",
  },
  {
    id: "continent_oceania",
    labelKey: "constraint.continent_oceania",
    category: "continent",
    difficulty: "easy",
    predicate: (c) => c.continent === "oceania",
  },

  // ── Accès à l'eau ──────────────────────────────────────────────────────────
  {
    id: "water_island",
    labelKey: "constraint.water_island",
    category: "water_access",
    difficulty: "easy",
    predicate: (c) => c.waterAccess === "island",
  },
  {
    id: "water_landlocked",
    labelKey: "constraint.water_landlocked",
    category: "water_access",
    difficulty: "easy",
    predicate: (c) => c.waterAccess === "landlocked",
  },

  // ── Frontières — nombre ────────────────────────────────────────────────────
  {
    id: "borders_solo",
    labelKey: "constraint.borders_solo",
    category: "borders_count",
    difficulty: "medium",
    predicate: (c) => c.borders.length === BORDERS_SOLO,
  },
  {
    id: "borders_min_5",
    labelKey: "constraint.borders_min_5",
    category: "borders_count",
    difficulty: "medium",
    predicate: (c) => c.borders.length >= BORDERS_MIN_5,
  },
  {
    id: "borders_min_7",
    labelKey: "constraint.borders_min_7",
    category: "borders_count",
    difficulty: "hard",
    predicate: (c) => c.borders.length >= BORDERS_MIN_7,
  },

  // ── Frontières — pivot ─────────────────────────────────────────────────────
  {
    id: "borders_russia",
    labelKey: "constraint.borders_russia",
    category: "borders_pivot",
    difficulty: "medium",
    predicate: (c) => c.borders.includes(CODE_RUS),
  },
  {
    id: "borders_china",
    labelKey: "constraint.borders_china",
    category: "borders_pivot",
    difficulty: "medium",
    predicate: (c) => c.borders.includes(CODE_CHN),
  },
  {
    id: "borders_brazil",
    labelKey: "constraint.borders_brazil",
    category: "borders_pivot",
    difficulty: "medium",
    predicate: (c) => c.borders.includes(CODE_BRA),
  },
  {
    id: "borders_turkey",
    labelKey: "constraint.borders_turkey",
    category: "borders_pivot",
    difficulty: "medium",
    predicate: (c) => c.borders.includes(CODE_TUR),
  },
  {
    id: "borders_india",
    labelKey: "constraint.borders_india",
    category: "borders_pivot",
    difficulty: "medium",
    predicate: (c) => c.borders.includes(CODE_IND),
  },

  // ── Superficie ─────────────────────────────────────────────────────────────
  {
    id: "area_gt_2M",
    labelKey: "constraint.area_gt_2M",
    category: "area",
    difficulty: "medium",
    predicate: (c) => c.areaKm2 > AREA_GT_2M,
  },
  {
    id: "area_gt_500k",
    labelKey: "constraint.area_gt_500k",
    category: "area",
    difficulty: "medium",
    predicate: (c) => c.areaKm2 > AREA_GT_500K,
  },
  {
    id: "area_lt_1k",
    labelKey: "constraint.area_lt_1k",
    category: "area",
    difficulty: "medium",
    predicate: (c) => c.areaKm2 < AREA_LT_1K,
  },

  // ── Population ─────────────────────────────────────────────────────────────
  {
    id: "population_gt_100M",
    labelKey: "constraint.population_gt_100M",
    category: "population",
    difficulty: "hard",
    predicate: (c) => c.population > POP_GT_100M,
  },
  {
    id: "population_gt_30M",
    labelKey: "constraint.population_gt_30M",
    category: "population",
    difficulty: "easy",
    predicate: (c) => c.population > POP_GT_30M,
  },
  {
    id: "population_lt_2_5M",
    labelKey: "constraint.population_lt_2_5M",
    category: "population",
    difficulty: "easy",
    predicate: (c) => c.population < POP_LT_2_5M,
  },
  {
    id: "population_lt_1M",
    labelKey: "constraint.population_lt_1M",
    category: "population",
    difficulty: "medium",
    predicate: (c) => c.population < POP_LT_1M,
  },

  // ── Langue ─────────────────────────────────────────────────────────────────
  {
    id: "language_french",
    labelKey: "constraint.language_french",
    category: "language",
    difficulty: "medium",
    predicate: (c) => c.officialLanguages.includes(LANG_FR),
  },
  {
    id: "language_arabic",
    labelKey: "constraint.language_arabic",
    category: "language",
    difficulty: "medium",
    predicate: (c) => c.officialLanguages.includes(LANG_AR),
  },
  {
    id: "language_spanish",
    labelKey: "constraint.language_spanish",
    category: "language",
    difficulty: "medium",
    predicate: (c) => c.officialLanguages.includes(LANG_ES),
  },
  {
    id: "language_english",
    labelKey: "constraint.language_english",
    category: "language",
    difficulty: "easy",
    predicate: (c) => c.officialLanguages.includes(LANG_EN),
  },
  {
    id: "language_portuguese",
    labelKey: "constraint.language_portuguese",
    category: "language",
    difficulty: "medium",
    predicate: (c) => c.officialLanguages.includes(LANG_PT),
  },
  {
    id: "language_russian",
    labelKey: "constraint.language_russian",
    category: "language",
    difficulty: "medium",
    predicate: (c) => c.officialLanguages.includes(LANG_RU),
  },
  {
    id: "language_multilingual",
    labelKey: "constraint.language_multilingual",
    category: "language",
    difficulty: "easy",
    predicate: (c) => c.officialLanguages.length >= 2,
  },

  // ── Drapeau ────────────────────────────────────────────────────────────────
  {
    id: "flag_has_star",
    labelKey: "constraint.flag_has_star",
    category: "flag",
    difficulty: "medium",
    predicate: (c) => c.flagSymbols.includes("star"),
  },
  {
    id: "flag_has_crescent",
    labelKey: "constraint.flag_has_crescent",
    category: "flag",
    difficulty: "hard",
    predicate: (c) => c.flagSymbols.includes("crescent"),
  },
  {
    id: "flag_has_cross",
    labelKey: "constraint.flag_has_cross",
    category: "flag",
    difficulty: "medium",
    predicate: (c) => c.flagSymbols.includes("cross"),
  },

  // ── Latitude ───────────────────────────────────────────────────────────────
  {
    id: "latitude_south_hemisphere",
    labelKey: "constraint.latitude_south_hemisphere",
    category: "latitude",
    difficulty: "hard",
    predicate: (c) => c.latitude < 0,
  },
  {
    id: "latitude_polar",
    labelKey: "constraint.latitude_polar",
    category: "latitude",
    difficulty: "hard",
    predicate: (c) => Math.abs(c.latitude) > POLAR_ABS_LAT,
  },

  // ── Sous-région ────────────────────────────────────────────────────────────
  {
    id: "subregion_middle_east",
    labelKey: "constraint.subregion_middle_east",
    category: "subregion",
    difficulty: "medium",
    predicate: (c) => c.geoTags.includes("middle_east"),
  },
  {
    id: "subregion_caribbean",
    labelKey: "constraint.subregion_caribbean",
    category: "subregion",
    difficulty: "medium",
    predicate: (c) => c.subregion === "Caribbean",
  },
  {
    id: "subregion_southeast_asia",
    labelKey: "constraint.subregion_southeast_asia",
    category: "subregion",
    difficulty: "medium",
    predicate: (c) => c.subregion === "South-Eastern Asia",
  },

  // ── Événements ─────────────────────────────────────────────────────────────
  {
    id: "event_fifa_wc_host",
    labelKey: "constraint.event_fifa_wc_host",
    category: "event",
    difficulty: "hard",
    predicate: (c) => c.events.includes("fifa_wc_host"),
  },
  {
    id: "event_summer_olympics_host",
    labelKey: "constraint.event_summer_olympics_host",
    category: "event",
    difficulty: "hard",
    predicate: (c) => c.events.includes("summer_olympics_host"),
  },

  // ── Politique / groupes ────────────────────────────────────────────────────
  {
    id: "political_eu",
    labelKey: "constraint.political_eu",
    category: "political",
    difficulty: "medium",
    predicate: (c) => c.groups.includes("eu"),
  },
  {
    id: "political_g20",
    labelKey: "constraint.political_g20",
    category: "political",
    difficulty: "hard",
    predicate: (c) => c.groups.includes("g20"),
  },
  {
    id: "political_nato",
    labelKey: "constraint.political_nato",
    category: "political",
    difficulty: "medium",
    predicate: (c) => c.groups.includes("nato"),
  },
  {
    id: "political_commonwealth",
    labelKey: "constraint.political_commonwealth",
    category: "political",
    difficulty: "medium",
    predicate: (c) => c.groups.includes("commonwealth"),
  },

  // ── Régime ─────────────────────────────────────────────────────────────────
  {
    id: "regime_monarchy",
    labelKey: "constraint.regime_monarchy",
    category: "regime",
    difficulty: "medium",
    predicate: (c) => c.regime === "monarchy",
  },

  // ── Géographie physique ────────────────────────────────────────────────────
  {
    id: "physical_crosses_equator",
    labelKey: "constraint.physical_crosses_equator",
    category: "physical",
    difficulty: "hard",
    predicate: (c) => c.physicalFeatures.includes("equator_crosser"),
  },
  {
    id: "physical_mediterranean_coast",
    labelKey: "constraint.physical_mediterranean_coast",
    category: "physical",
    difficulty: "medium",
    predicate: (c) => c.physicalFeatures.includes("mediterranean_coast"),
  },
  {
    id: "physical_caribbean_coast",
    labelKey: "constraint.physical_caribbean_coast",
    category: "physical",
    difficulty: "medium",
    predicate: (c) => c.physicalFeatures.includes("caribbean_coast"),
  },
  {
    id: "physical_peak_over_5000m",
    labelKey: "constraint.physical_peak_over_5000m",
    category: "physical",
    difficulty: "medium",
    predicate: (c) => c.physicalFeatures.includes("peak_over_5000m"),
  },

  // ── Densité de population ──────────────────────────────────────────────────
  {
    id: "density_high",
    labelKey: "constraint.density_high",
    category: "density",
    difficulty: "medium",
    predicate: (c) => c.population / c.areaKm2 > DENSITY_HIGH,
  },
  {
    id: "density_low",
    labelKey: "constraint.density_low",
    category: "density",
    difficulty: "medium",
    predicate: (c) => c.population / c.areaKm2 < DENSITY_LOW,
  },
];
