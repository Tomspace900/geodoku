import type { TKey } from "../../../i18n/types.ts";
import countriesData from "../../countries/data/countries.json";
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
  | "density"
  | "nature"
  | "society"
  | "ocean";

/** Identifiant stable d'une contrainte (clé i18n sans le préfixe `constraint.`). */
export type ConstraintId =
  | "area_larger_india"
  | "area_larger_mexico"
  | "area_larger_france"
  | "area_smaller_belgium"
  | "area_smaller_luxembourg"
  | "borders_brazil"
  | "borders_china"
  | "borders_india"
  | "borders_min_5"
  | "borders_min_7"
  | "borders_russia"
  | "borders_solo"
  | "continent_africa"
  | "continent_asia"
  | "continent_europe"
  | "continent_north_america"
  | "continent_oceania"
  | "continent_south_america"
  | "density_more_netherlands"
  | "density_more_japan"
  | "density_less_russia"
  | "density_less_canada"
  | "event_fifa_wc_host"
  | "event_summer_olympics_host"
  | "flag_has_animal"
  | "flag_has_crescent"
  | "flag_has_cross"
  | "flag_has_star"
  | "language_arabic"
  | "language_english"
  | "language_french"
  | "language_portuguese"
  | "language_russian"
  | "language_spanish"
  | "latitude_polar"
  | "latitude_south_hemisphere"
  | "nature_desert"
  | "nature_rainforest"
  | "ocean_atlantic"
  | "ocean_indian"
  | "ocean_pacific"
  | "physical_caribbean_coast"
  | "physical_crosses_equator"
  | "physical_mediterranean_coast"
  | "physical_peak_over_5000m"
  | "political_commonwealth"
  | "political_eu"
  | "political_g20"
  | "political_nato"
  | "population_more_germany"
  | "population_more_canada"
  | "population_less_iceland"
  | "regime_monarchy"
  | "society_capital_not_largest"
  | "society_drives_on_left"
  | "subregion_caribbean"
  | "subregion_middle_east"
  | "subregion_southeast_asia"
  | "water_island"
  | "water_landlocked"
  // Archivées : hors génération, conservées pour rejouer d'anciennes grilles (cf. ARCHIVED_CONSTRAINTS).
  | "flag_two_colors"
  | "area_gt_2M"
  | "area_gt_500k"
  | "area_lt_1k"
  | "density_high"
  | "density_low"
  | "language_multilingual"
  | "population_gt_100M"
  | "population_gt_30M"
  | "population_lt_1M"
  | "population_lt_2_5M";

export type Constraint = {
  id: ConstraintId;
  labelKey: TKey;
  category: ConstraintCategory;
  predicate: (country: Country) => boolean;
};

// ─── Comparaisons à un pays-repère (superficie / population / densité) ────────
// Plutôt qu'un seuil brut (« > 2 M km² »), on compare à un pays connu (« plus grand
// que la France »). Le seuil = la valeur LIVE du pays-repère (auto-cohérent même si
// countries.json est régénéré) ; le chiffre affiché vit dans le label i18n.

const ALL_COUNTRIES = countriesData as unknown as Country[];

/** Pays-repère par code ISO3 (lève si absent du dataset). */
function ref(code: string): Country {
  const country = ALL_COUNTRIES.find((c) => c.iso3 === code);
  if (!country) throw new Error(`Constraint ref country not found: ${code}`);
  return country;
}

function densityOf(c: Country): number {
  return c.population / c.areaKm2;
}

// ─── Border count thresholds ──────────────────────────────────────────────────

const BORDERS_SOLO = 1;
const BORDERS_MIN_5 = 5;
const BORDERS_MIN_7 = 7;

// ─── Latitude thresholds (degrés décimaux) ────────────────────────────────────

/** |lat| > POLAR_ABS_LAT → pays au-delà du 55ᵉ parallèle nord (Scandinavie, Canada, Russie). */
const POLAR_ABS_LAT = 55;

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
const CODE_IND = "IND";

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
    id: "borders_india",
    labelKey: "constraint.borders_india",
    category: "borders_pivot",
    predicate: (c) => c.borders.includes(CODE_IND),
  },

  // ── Superficie — comparaison à un pays-repère ──────────────────────────────
  {
    id: "area_larger_india",
    labelKey: "constraint.area_larger_india",
    category: "area",
    predicate: (c) => c.areaKm2 > ref("IND").areaKm2,
  },
  {
    id: "area_larger_mexico",
    labelKey: "constraint.area_larger_mexico",
    category: "area",
    predicate: (c) => c.areaKm2 > ref("MEX").areaKm2,
  },
  {
    id: "area_larger_france",
    labelKey: "constraint.area_larger_france",
    category: "area",
    predicate: (c) => c.areaKm2 > ref("FRA").areaKm2,
  },
  {
    id: "area_smaller_belgium",
    labelKey: "constraint.area_smaller_belgium",
    category: "area",
    predicate: (c) => c.areaKm2 < ref("BEL").areaKm2,
  },
  {
    id: "area_smaller_luxembourg",
    labelKey: "constraint.area_smaller_luxembourg",
    category: "area",
    predicate: (c) => c.areaKm2 < ref("LUX").areaKm2,
  },

  // ── Population — comparaison à un pays-repère ──────────────────────────────
  {
    id: "population_more_germany",
    labelKey: "constraint.population_more_germany",
    category: "population",
    predicate: (c) => c.population > ref("DEU").population,
  },
  {
    id: "population_more_canada",
    labelKey: "constraint.population_more_canada",
    category: "population",
    predicate: (c) => c.population > ref("CAN").population,
  },
  {
    id: "population_less_iceland",
    labelKey: "constraint.population_less_iceland",
    category: "population",
    predicate: (c) => c.population < ref("ISL").population,
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

  // ── Drapeau ────────────────────────────────────────────────────────────────
  {
    id: "flag_has_star",
    labelKey: "constraint.flag_has_star",
    category: "flag",
    predicate: (c) => c.flagSymbols.includes("star"),
  },
  {
    id: "flag_has_crescent",
    labelKey: "constraint.flag_has_crescent",
    category: "flag",
    predicate: (c) => c.flagSymbols.includes("crescent"),
  },
  {
    id: "flag_has_cross",
    labelKey: "constraint.flag_has_cross",
    category: "flag",
    predicate: (c) => c.flagSymbols.includes("cross"),
  },
  {
    id: "flag_has_animal",
    labelKey: "constraint.flag_has_animal",
    category: "flag",
    predicate: (c) => c.flagSymbols.includes("animal"),
  },

  // ── Latitude ───────────────────────────────────────────────────────────────
  {
    id: "latitude_south_hemisphere",
    labelKey: "constraint.latitude_south_hemisphere",
    category: "latitude",
    predicate: (c) => c.latitude < 0,
  },
  {
    id: "latitude_polar",
    labelKey: "constraint.latitude_polar",
    category: "latitude",
    predicate: (c) => Math.abs(c.latitude) > POLAR_ABS_LAT,
  },

  // ── Sous-région ────────────────────────────────────────────────────────────
  {
    id: "subregion_middle_east",
    labelKey: "constraint.subregion_middle_east",
    category: "subregion",
    predicate: (c) => c.geoTags.includes("middle_east"),
  },
  {
    id: "subregion_caribbean",
    labelKey: "constraint.subregion_caribbean",
    category: "subregion",
    predicate: (c) => c.subregion === "Caribbean",
  },
  {
    id: "subregion_southeast_asia",
    labelKey: "constraint.subregion_southeast_asia",
    category: "subregion",
    predicate: (c) => c.subregion === "South-Eastern Asia",
  },

  // ── Événements ─────────────────────────────────────────────────────────────
  {
    id: "event_fifa_wc_host",
    labelKey: "constraint.event_fifa_wc_host",
    category: "event",
    predicate: (c) => c.events.includes("fifa_wc_host"),
  },
  {
    id: "event_summer_olympics_host",
    labelKey: "constraint.event_summer_olympics_host",
    category: "event",
    predicate: (c) => c.events.includes("summer_olympics_host"),
  },

  // ── Politique / memberships ────────────────────────────────────────────────
  {
    id: "political_eu",
    labelKey: "constraint.political_eu",
    category: "political",
    predicate: (c) => c.memberships.includes("eu"),
  },
  {
    id: "political_g20",
    labelKey: "constraint.political_g20",
    category: "political",
    predicate: (c) => c.memberships.includes("g20"),
  },
  {
    id: "political_nato",
    labelKey: "constraint.political_nato",
    category: "political",
    predicate: (c) => c.memberships.includes("nato"),
  },
  {
    id: "political_commonwealth",
    labelKey: "constraint.political_commonwealth",
    category: "political",
    predicate: (c) => c.memberships.includes("commonwealth"),
  },

  // ── Régime ─────────────────────────────────────────────────────────────────
  {
    id: "regime_monarchy",
    labelKey: "constraint.regime_monarchy",
    category: "regime",
    predicate: (c) => c.regime === "monarchy",
  },

  // ── Géographie physique ────────────────────────────────────────────────────
  {
    id: "physical_crosses_equator",
    labelKey: "constraint.physical_crosses_equator",
    category: "physical",
    predicate: (c) => c.physicalFeatures.includes("equator_crosser"),
  },
  {
    id: "physical_mediterranean_coast",
    labelKey: "constraint.physical_mediterranean_coast",
    category: "physical",
    predicate: (c) => c.physicalFeatures.includes("mediterranean_coast"),
  },
  {
    id: "physical_caribbean_coast",
    labelKey: "constraint.physical_caribbean_coast",
    category: "physical",
    predicate: (c) => c.physicalFeatures.includes("caribbean_coast"),
  },
  {
    id: "physical_peak_over_5000m",
    labelKey: "constraint.physical_peak_over_5000m",
    category: "physical",
    predicate: (c) => c.physicalFeatures.includes("peak_over_5000m"),
  },

  // ── Densité de population — comparaison à un pays-repère ───────────────────
  {
    id: "density_more_netherlands",
    labelKey: "constraint.density_more_netherlands",
    category: "density",
    predicate: (c) => densityOf(c) > densityOf(ref("NLD")),
  },
  {
    id: "density_more_japan",
    labelKey: "constraint.density_more_japan",
    category: "density",
    predicate: (c) => densityOf(c) > densityOf(ref("JPN")),
  },
  {
    id: "density_less_russia",
    labelKey: "constraint.density_less_russia",
    category: "density",
    predicate: (c) => densityOf(c) < densityOf(ref("RUS")),
  },
  {
    id: "density_less_canada",
    labelKey: "constraint.density_less_canada",
    category: "density",
    predicate: (c) => densityOf(c) < densityOf(ref("CAN")),
  },

  // ── Nature — biomes ────────────────────────────────────────────────────────
  {
    id: "nature_desert",
    labelKey: "constraint.nature_desert",
    category: "nature",
    predicate: (c) => c.physicalFeatures.includes("has_desert"),
  },
  {
    id: "nature_rainforest",
    labelKey: "constraint.nature_rainforest",
    category: "nature",
    predicate: (c) => c.physicalFeatures.includes("rainforest"),
  },

  // ── Océans — façade maritime ───────────────────────────────────────────────
  {
    id: "ocean_atlantic",
    labelKey: "constraint.ocean_atlantic",
    category: "ocean",
    predicate: (c) => c.physicalFeatures.includes("atlantic_coast"),
  },
  {
    id: "ocean_pacific",
    labelKey: "constraint.ocean_pacific",
    category: "ocean",
    predicate: (c) => c.physicalFeatures.includes("pacific_coast"),
  },
  {
    id: "ocean_indian",
    labelKey: "constraint.ocean_indian",
    category: "ocean",
    predicate: (c) => c.physicalFeatures.includes("indian_ocean_coast"),
  },

  // ── Société ────────────────────────────────────────────────────────────────
  {
    id: "society_drives_on_left",
    labelKey: "constraint.society_drives_on_left",
    category: "society",
    predicate: (c) => c.geoTags.includes("drives_on_left"),
  },
  {
    id: "society_capital_not_largest",
    labelKey: "constraint.society_capital_not_largest",
    category: "society",
    predicate: (c) => c.geoTags.includes("capital_not_largest"),
  },
];

// ─── Contraintes archivées ──────────────────────────────────────────────────────
// Seuils quantitatifs (« > 500 000 km² », « densité > 300 ») retirés au profit des
// comparaisons à un pays-repère. `flag_two_colors` retirée : le décompte binaire
// `flagColors.length === 2` ne reflète pas fidèlement les drapeaux réels.
// On les conserve **intégralement** car d'anciennes grilles publiées les référencent
// grilles publiées les référencent encore : rejouer une grille a besoin du label ET
// du prédicat (`validateGuess` évalue le prédicat live). Elles ne sont JAMAIS dans
// `CONSTRAINTS`, donc jamais générées ; seul `CONSTRAINT_BY_ID` les expose.

const AREA_GT_2M = 2_000_000;
const AREA_GT_500K = 500_000;
const AREA_LT_1K = 1_000;
const DENSITY_HIGH = 300;
const DENSITY_LOW = 10;
const POP_GT_100M = 100_000_000;
const POP_GT_30M = 30_000_000;
const POP_LT_1M = 1_000_000;
const POP_LT_2_5M = 2_500_000;

export const ARCHIVED_CONSTRAINTS: Constraint[] = [
  {
    id: "flag_two_colors",
    labelKey: "constraint.flag_two_colors",
    category: "flag",
    predicate: (c) => c.flagColors.length === 2,
  },
  {
    id: "area_gt_2M",
    labelKey: "constraint.area_gt_2M",
    category: "area",
    predicate: (c) => c.areaKm2 > AREA_GT_2M,
  },
  {
    id: "area_gt_500k",
    labelKey: "constraint.area_gt_500k",
    category: "area",
    predicate: (c) => c.areaKm2 > AREA_GT_500K,
  },
  {
    id: "area_lt_1k",
    labelKey: "constraint.area_lt_1k",
    category: "area",
    predicate: (c) => c.areaKm2 < AREA_LT_1K,
  },
  {
    id: "density_high",
    labelKey: "constraint.density_high",
    category: "density",
    predicate: (c) => densityOf(c) > DENSITY_HIGH,
  },
  {
    id: "density_low",
    labelKey: "constraint.density_low",
    category: "density",
    predicate: (c) => densityOf(c) < DENSITY_LOW,
  },
  {
    id: "language_multilingual",
    labelKey: "constraint.language_multilingual",
    category: "language",
    predicate: (c) => c.officialLanguages.length >= 2,
  },
  {
    id: "population_gt_100M",
    labelKey: "constraint.population_gt_100M",
    category: "population",
    predicate: (c) => c.population > POP_GT_100M,
  },
  {
    id: "population_gt_30M",
    labelKey: "constraint.population_gt_30M",
    category: "population",
    predicate: (c) => c.population > POP_GT_30M,
  },
  {
    id: "population_lt_1M",
    labelKey: "constraint.population_lt_1M",
    category: "population",
    predicate: (c) => c.population < POP_LT_1M,
  },
  {
    id: "population_lt_2_5M",
    labelKey: "constraint.population_lt_2_5M",
    category: "population",
    predicate: (c) => c.population < POP_LT_2_5M,
  },
];

/**
 * Lookup id → contrainte couvrant l'actif **et** l'archivé. Sert à résoudre le label
 * ou le prédicat d'une grille quelconque, y compris une ancienne grille rejouée.
 * `CONSTRAINTS` reste l'unique source de la génération (aucune archivée dedans).
 */
export const CONSTRAINT_BY_ID: ReadonlyMap<ConstraintId, Constraint> = new Map(
  [...CONSTRAINTS, ...ARCHIVED_CONSTRAINTS].map((c) => [c.id, c]),
);
