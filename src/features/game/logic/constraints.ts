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
  | "language";

export type Constraint = {
  id: string;
  labelKey: TKey;
  category: ConstraintCategory;
  predicate: (country: Country) => boolean;
};

// ─── Area thresholds (km²) ────────────────────────────────────────────────────

const AREA_GT_2M = 2_000_000;
const AREA_GT_1M = 1_000_000;
const AREA_GT_500K = 500_000;
const AREA_LT_10K = 10_000;
const AREA_LT_1K = 1_000;

// ─── Population thresholds (hab.) — calibrés sur countries.json (197 pays) ─────
// Effectifs cibles ~ sweet-spot [8, 60] : >100M:16, >50M:30, >30M:50, <2,5M:57, <1M:38

const POP_GT_100M = 100_000_000;
const POP_GT_50M = 50_000_000;
const POP_GT_30M = 30_000_000;
const POP_LT_2_5M = 2_500_000;
const POP_LT_1M = 1_000_000;

// ─── Border count thresholds ──────────────────────────────────────────────────

const BORDERS_SOLO = 1;
const BORDERS_MIN_5 = 5;
const BORDERS_MIN_7 = 7;

// ─── ISO 639-1 language codes ─────────────────────────────────────────────────

const LANG_FR = "fr";
const LANG_AR = "ar";
const LANG_ES = "es";
const LANG_EN = "en";
const LANG_PT = "pt";
const LANG_RU = "ru";

// ─── ISO 3166-1 alpha-3 pivot country codes ───────────────────────────────────

const CODE_FRA = "FRA";
const CODE_DEU = "DEU";
const CODE_RUS = "RUS";
const CODE_CHN = "CHN";
const CODE_BRA = "BRA";
const CODE_COD = "COD";
const CODE_TUR = "TUR";
const CODE_TZA = "TZA";
const CODE_IND = "IND";
const CODE_NER = "NER";

// ─── Constraints ──────────────────────────────────────────────────────────────

export const CONSTRAINTS: Constraint[] = [
  // ── Continent ──────────────────────────────────────────────────────────────
  {
    id: "continent_africa",
    labelKey: "constraint.continent_africa",
    category: "continent",
    predicate: (c) => c.continent === "africa",
  },
  {
    id: "continent_asia",
    labelKey: "constraint.continent_asia",
    category: "continent",
    predicate: (c) => c.continent === "asia",
  },
  {
    id: "continent_europe",
    labelKey: "constraint.continent_europe",
    category: "continent",
    predicate: (c) => c.continent === "europe",
  },
  {
    id: "continent_north_america",
    labelKey: "constraint.continent_north_america",
    category: "continent",
    predicate: (c) => c.continent === "north_america",
  },
  {
    id: "continent_south_america",
    labelKey: "constraint.continent_south_america",
    category: "continent",
    predicate: (c) => c.continent === "south_america",
  },
  {
    id: "continent_oceania",
    labelKey: "constraint.continent_oceania",
    category: "continent",
    predicate: (c) => c.continent === "oceania",
  },

  // ── Accès à l'eau ──────────────────────────────────────────────────────────
  {
    id: "water_island",
    labelKey: "constraint.water_island",
    category: "water_access",
    predicate: (c) => c.waterAccess === "island",
  },
  {
    id: "water_landlocked",
    labelKey: "constraint.water_landlocked",
    category: "water_access",
    predicate: (c) => c.waterAccess === "landlocked",
  },

  // ── Frontières — nombre ────────────────────────────────────────────────────
  {
    id: "borders_solo",
    labelKey: "constraint.borders_solo",
    category: "borders_count",
    predicate: (c) => c.borders.length === BORDERS_SOLO,
  },
  {
    id: "borders_min_5",
    labelKey: "constraint.borders_min_5",
    category: "borders_count",
    predicate: (c) => c.borders.length >= BORDERS_MIN_5,
  },
  {
    id: "borders_min_7",
    labelKey: "constraint.borders_min_7",
    category: "borders_count",
    predicate: (c) => c.borders.length >= BORDERS_MIN_7,
  },

  // ── Frontières — pivot ─────────────────────────────────────────────────────
  {
    id: "borders_france",
    labelKey: "constraint.borders_france",
    category: "borders_pivot",
    predicate: (c) => c.borders.includes(CODE_FRA),
  },
  {
    id: "borders_germany",
    labelKey: "constraint.borders_germany",
    category: "borders_pivot",
    predicate: (c) => c.borders.includes(CODE_DEU),
  },
  {
    id: "borders_russia",
    labelKey: "constraint.borders_russia",
    category: "borders_pivot",
    predicate: (c) => c.borders.includes(CODE_RUS),
  },
  {
    id: "borders_china",
    labelKey: "constraint.borders_china",
    category: "borders_pivot",
    predicate: (c) => c.borders.includes(CODE_CHN),
  },
  {
    id: "borders_brazil",
    labelKey: "constraint.borders_brazil",
    category: "borders_pivot",
    predicate: (c) => c.borders.includes(CODE_BRA),
  },
  {
    id: "borders_drc",
    labelKey: "constraint.borders_drc",
    category: "borders_pivot",
    predicate: (c) => c.borders.includes(CODE_COD),
  },
  {
    id: "borders_turkey",
    labelKey: "constraint.borders_turkey",
    category: "borders_pivot",
    predicate: (c) => c.borders.includes(CODE_TUR),
  },
  {
    id: "borders_tanzania",
    labelKey: "constraint.borders_tanzania",
    category: "borders_pivot",
    predicate: (c) => c.borders.includes(CODE_TZA),
  },
  {
    id: "borders_india",
    labelKey: "constraint.borders_india",
    category: "borders_pivot",
    predicate: (c) => c.borders.includes(CODE_IND),
  },
  {
    id: "borders_niger",
    labelKey: "constraint.borders_niger",
    category: "borders_pivot",
    predicate: (c) => c.borders.includes(CODE_NER),
  },

  // ── Superficie ─────────────────────────────────────────────────────────────
  {
    id: "area_gt_2M",
    labelKey: "constraint.area_gt_2M",
    category: "area",
    predicate: (c) => c.areaKm2 > AREA_GT_2M,
  },
  {
    id: "area_gt_1M",
    labelKey: "constraint.area_gt_1M",
    category: "area",
    predicate: (c) => c.areaKm2 > AREA_GT_1M,
  },
  {
    id: "area_gt_500k",
    labelKey: "constraint.area_gt_500k",
    category: "area",
    predicate: (c) => c.areaKm2 > AREA_GT_500K,
  },
  {
    id: "area_lt_10k",
    labelKey: "constraint.area_lt_10k",
    category: "area",
    predicate: (c) => c.areaKm2 < AREA_LT_10K,
  },
  {
    id: "area_lt_1k",
    labelKey: "constraint.area_lt_1k",
    category: "area",
    predicate: (c) => c.areaKm2 < AREA_LT_1K,
  },

  // ── Population ─────────────────────────────────────────────────────────────
  {
    id: "population_gt_100M",
    labelKey: "constraint.population_gt_100M",
    category: "population",
    predicate: (c) => c.population > POP_GT_100M,
  },
  {
    id: "population_gt_50M",
    labelKey: "constraint.population_gt_50M",
    category: "population",
    predicate: (c) => c.population > POP_GT_50M,
  },
  {
    id: "population_gt_30M",
    labelKey: "constraint.population_gt_30M",
    category: "population",
    predicate: (c) => c.population > POP_GT_30M,
  },
  {
    id: "population_lt_2_5M",
    labelKey: "constraint.population_lt_2_5M",
    category: "population",
    predicate: (c) => c.population < POP_LT_2_5M,
  },
  {
    id: "population_lt_1M",
    labelKey: "constraint.population_lt_1M",
    category: "population",
    predicate: (c) => c.population < POP_LT_1M,
  },

  // ── Langue ─────────────────────────────────────────────────────────────────
  {
    id: "language_french",
    labelKey: "constraint.language_french",
    category: "language",
    predicate: (c) => c.officialLanguages.includes(LANG_FR),
  },
  {
    id: "language_arabic",
    labelKey: "constraint.language_arabic",
    category: "language",
    predicate: (c) => c.officialLanguages.includes(LANG_AR),
  },
  {
    id: "language_spanish",
    labelKey: "constraint.language_spanish",
    category: "language",
    predicate: (c) => c.officialLanguages.includes(LANG_ES),
  },
  {
    id: "language_english",
    labelKey: "constraint.language_english",
    category: "language",
    predicate: (c) => c.officialLanguages.includes(LANG_EN),
  },
  {
    id: "language_portuguese",
    labelKey: "constraint.language_portuguese",
    category: "language",
    predicate: (c) => c.officialLanguages.includes(LANG_PT),
  },
  {
    id: "language_russian",
    labelKey: "constraint.language_russian",
    category: "language",
    predicate: (c) => c.officialLanguages.includes(LANG_RU),
  },
];
