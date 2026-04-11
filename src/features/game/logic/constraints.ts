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
  label: string;
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
    label: "Est en Afrique",
    category: "continent",
    predicate: (c) => c.continent === "africa",
  },
  {
    id: "continent_asia",
    label: "Est en Asie",
    category: "continent",
    predicate: (c) => c.continent === "asia",
  },
  {
    id: "continent_europe",
    label: "Est en Europe",
    category: "continent",
    predicate: (c) => c.continent === "europe",
  },
  {
    id: "continent_north_america",
    label: "Est en Amérique du Nord",
    category: "continent",
    predicate: (c) => c.continent === "north_america",
  },
  {
    id: "continent_south_america",
    label: "Est en Amérique du Sud",
    category: "continent",
    predicate: (c) => c.continent === "south_america",
  },
  {
    id: "continent_oceania",
    label: "Est en Océanie",
    category: "continent",
    predicate: (c) => c.continent === "oceania",
  },

  // ── Accès à l'eau ──────────────────────────────────────────────────────────
  {
    id: "water_island",
    label: "Est une île ou un archipel",
    category: "water_access",
    predicate: (c) => c.waterAccess === "island",
  },
  {
    id: "water_landlocked",
    label: "Est enclavé (sans accès à la mer)",
    category: "water_access",
    predicate: (c) => c.waterAccess === "landlocked",
  },

  // ── Frontières — nombre ────────────────────────────────────────────────────
  {
    id: "borders_solo",
    label: "N'a qu'un seul voisin terrestre",
    category: "borders_count",
    predicate: (c) => c.borders.length === BORDERS_SOLO,
  },
  {
    id: "borders_min_5",
    label: "A au moins 5 voisins terrestres",
    category: "borders_count",
    predicate: (c) => c.borders.length >= BORDERS_MIN_5,
  },
  {
    id: "borders_min_7",
    label: "A au moins 7 voisins terrestres",
    category: "borders_count",
    predicate: (c) => c.borders.length >= BORDERS_MIN_7,
  },

  // ── Frontières — pivot ─────────────────────────────────────────────────────
  {
    id: "borders_france",
    label: "Frontalier de la France",
    category: "borders_pivot",
    predicate: (c) => c.borders.includes(CODE_FRA),
  },
  {
    id: "borders_germany",
    label: "Frontalier de l'Allemagne",
    category: "borders_pivot",
    predicate: (c) => c.borders.includes(CODE_DEU),
  },
  {
    id: "borders_russia",
    label: "Frontalier de la Russie",
    category: "borders_pivot",
    predicate: (c) => c.borders.includes(CODE_RUS),
  },
  {
    id: "borders_china",
    label: "Frontalier de la Chine",
    category: "borders_pivot",
    predicate: (c) => c.borders.includes(CODE_CHN),
  },
  {
    id: "borders_brazil",
    label: "Frontalier du Brésil",
    category: "borders_pivot",
    predicate: (c) => c.borders.includes(CODE_BRA),
  },
  {
    id: "borders_drc",
    label: "Frontalier de la RDC",
    category: "borders_pivot",
    predicate: (c) => c.borders.includes(CODE_COD),
  },
  {
    id: "borders_turkey",
    label: "Frontalier de la Turquie",
    category: "borders_pivot",
    predicate: (c) => c.borders.includes(CODE_TUR),
  },
  {
    id: "borders_tanzania",
    label: "Frontalier de la Tanzanie",
    category: "borders_pivot",
    predicate: (c) => c.borders.includes(CODE_TZA),
  },
  {
    id: "borders_india",
    label: "Frontalier de l'Inde",
    category: "borders_pivot",
    predicate: (c) => c.borders.includes(CODE_IND),
  },
  {
    id: "borders_niger",
    label: "Frontalier du Niger",
    category: "borders_pivot",
    predicate: (c) => c.borders.includes(CODE_NER),
  },

  // ── Superficie ─────────────────────────────────────────────────────────────
  {
    id: "area_gt_2M",
    label: "Pays gigantesques (> 2 M km²)",
    category: "area",
    predicate: (c) => c.areaKm2 > AREA_GT_2M,
  },
  {
    id: "area_gt_1M",
    label: "Très grand pays (> 1 M km²)",
    category: "area",
    predicate: (c) => c.areaKm2 > AREA_GT_1M,
  },
  {
    id: "area_gt_500k",
    label: "Grand pays (> 500 000 km²)",
    category: "area",
    predicate: (c) => c.areaKm2 > AREA_GT_500K,
  },
  {
    id: "area_lt_10k",
    label: "Petit pays (< 10 000 km²)",
    category: "area",
    predicate: (c) => c.areaKm2 < AREA_LT_10K,
  },
  {
    id: "area_lt_1k",
    label: "Micro-État (< 1 000 km²)",
    category: "area",
    predicate: (c) => c.areaKm2 < AREA_LT_1K,
  },

  // ── Population ─────────────────────────────────────────────────────────────
  {
    id: "population_gt_100M",
    label: "Population supérieure à 100 millions",
    category: "population",
    predicate: (c) => c.population > POP_GT_100M,
  },
  {
    id: "population_gt_50M",
    label: "Population supérieure à 50 millions",
    category: "population",
    predicate: (c) => c.population > POP_GT_50M,
  },
  {
    id: "population_gt_30M",
    label: "Population supérieure à 30 millions",
    category: "population",
    predicate: (c) => c.population > POP_GT_30M,
  },
  {
    id: "population_lt_2_5M",
    label: "Population inférieure à 2,5 millions",
    category: "population",
    predicate: (c) => c.population < POP_LT_2_5M,
  },
  {
    id: "population_lt_1M",
    label: "Population inférieure à 1 million",
    category: "population",
    predicate: (c) => c.population < POP_LT_1M,
  },

  // ── Langue ─────────────────────────────────────────────────────────────────
  {
    id: "language_french",
    label: "Langue officielle : français",
    category: "language",
    predicate: (c) => c.officialLanguages.includes(LANG_FR),
  },
  {
    id: "language_arabic",
    label: "Langue officielle : arabe",
    category: "language",
    predicate: (c) => c.officialLanguages.includes(LANG_AR),
  },
  {
    id: "language_spanish",
    label: "Langue officielle : espagnol",
    category: "language",
    predicate: (c) => c.officialLanguages.includes(LANG_ES),
  },
  {
    id: "language_english",
    label: "Langue officielle : anglais",
    category: "language",
    predicate: (c) => c.officialLanguages.includes(LANG_EN),
  },
  {
    id: "language_portuguese",
    label: "Langue officielle : portugais",
    category: "language",
    predicate: (c) => c.officialLanguages.includes(LANG_PT),
  },
  {
    id: "language_russian",
    label: "Langue officielle : russe",
    category: "language",
    predicate: (c) => c.officialLanguages.includes(LANG_RU),
  },
];
