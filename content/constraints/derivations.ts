/**
 * Dérivation des listes de réponses des contraintes **actives** à partir du
 * snapshot de faits (`content/countries/facts.ts`).
 *
 * Une fonction pure par contrainte, portée verbatim des prédicats runtime
 * historiques (`src/features/game/logic/constraints.ts`). `pnpm build:answers`
 * les applique aux 197 pays et écrit les `content/constraints/<id>/answers.ts` ;
 * `pnpm check:content` les rejoue pour détecter un `answers.ts` obsolète.
 *
 * `content/` est terminal : ce module n'importe que des types de `content/`.
 */
import type { CountryCode } from "../countries/countryCodes";
import type { CountryFacts } from "../countries/type";
import type { ActiveConstraintId } from "./index";

/**
 * Contexte de dérivation. `factsOf` lit le même snapshot que `facts` : une
 * comparaison à un pays-repère (`ctx.factsOf("FRA").areaKm2`) garde la sémantique
 * « valeur live du repère » des prédicats historiques (`ref("FRA")`).
 */
export type DerivationContext = Readonly<{
  factsOf: (code: CountryCode) => CountryFacts;
}>;

type Derivation = (facts: CountryFacts, ctx: DerivationContext) => boolean;

// ─── Seuils (migrés de constraints.ts) ───────────────────────────────────────

const BORDERS_SOLO = 1;
const BORDERS_MIN_5 = 5;
const BORDERS_MIN_7 = 7;

const TIME_ZONES_MULTIPLE = 2;
const TIME_ZONES_MIN_3 = 3;
const URBAN_CENTRES_MIN = 3;
/** « Majorité du territoire » : part strictement supérieure à la moitié. */
const MAJORITY_SHARE = 0.5;

/** |lat| > POLAR_ABS_LAT → au-delà du 55ᵉ parallèle (Scandinavie, Canada, Russie). */
const POLAR_ABS_LAT = 55;

// ISO 639-1 language codes.
const LANG_FR = "fr";
const LANG_AR = "ar";
const LANG_ES = "es";
const LANG_EN = "en";
const LANG_PT = "pt";
const LANG_RU = "ru";

// ISO 3166-1 alpha-3 pivot country codes.
const CODE_RUS = "RUS";
const CODE_CHN = "CHN";
const CODE_BRA = "BRA";
const CODE_IND = "IND";

function densityOf(facts: CountryFacts): number {
  return facts.population / facts.areaKm2;
}

/**
 * Prédicat de dérivation par contrainte active. `satisfies` verrouille la
 * bijection avec `ActiveConstraintId` : une clé manquante ou en trop ne compile
 * pas. L'ordre suit `CONSTRAINTS` côté runtime.
 */
export const DERIVATIONS = {
  // ── Continent ──────────────────────────────────────────────────────────────
  continent_africa: (f) => f.continent === "africa",
  continent_asia: (f) => f.continent === "asia",
  continent_europe: (f) => f.continent === "europe",
  continent_north_america: (f) => f.continent === "north_america",
  continent_south_america: (f) => f.continent === "south_america",
  continent_oceania: (f) => f.continent === "oceania",

  // ── Accès à l'eau ──────────────────────────────────────────────────────────
  water_island: (f) => f.waterAccess === "island",
  water_landlocked: (f) => f.waterAccess === "landlocked",

  // ── Frontières — nombre ────────────────────────────────────────────────────
  borders_solo: (f) => f.borders.length === BORDERS_SOLO,
  borders_min_5: (f) => f.borders.length >= BORDERS_MIN_5,
  borders_min_7: (f) => f.borders.length >= BORDERS_MIN_7,

  // ── Frontières — pivot ─────────────────────────────────────────────────────
  borders_russia: (f) => f.borders.includes(CODE_RUS),
  borders_china: (f) => f.borders.includes(CODE_CHN),
  borders_brazil: (f) => f.borders.includes(CODE_BRA),
  borders_india: (f) => f.borders.includes(CODE_IND),

  // ── Superficie — comparaison à un pays-repère ──────────────────────────────
  area_larger_india: (f, ctx) => f.areaKm2 > ctx.factsOf("IND").areaKm2,
  area_larger_mexico: (f, ctx) => f.areaKm2 > ctx.factsOf("MEX").areaKm2,
  area_larger_france: (f, ctx) => f.areaKm2 > ctx.factsOf("FRA").areaKm2,
  area_smaller_belgium: (f, ctx) => f.areaKm2 < ctx.factsOf("BEL").areaKm2,
  area_smaller_luxembourg: (f, ctx) => f.areaKm2 < ctx.factsOf("LUX").areaKm2,

  // ── Population — comparaison à un pays-repère ──────────────────────────────
  population_more_germany: (f, ctx) =>
    f.population > ctx.factsOf("DEU").population,
  population_more_canada: (f, ctx) =>
    f.population > ctx.factsOf("CAN").population,
  population_less_iceland: (f, ctx) =>
    f.population < ctx.factsOf("ISL").population,

  // ── Langue ─────────────────────────────────────────────────────────────────
  language_french: (f) => f.officialLanguages.includes(LANG_FR),
  language_arabic: (f) => f.officialLanguages.includes(LANG_AR),
  language_spanish: (f) => f.officialLanguages.includes(LANG_ES),
  language_english: (f) => f.officialLanguages.includes(LANG_EN),
  language_portuguese: (f) => f.officialLanguages.includes(LANG_PT),
  language_russian: (f) => f.officialLanguages.includes(LANG_RU),

  // ── Drapeau ────────────────────────────────────────────────────────────────
  flag_has_star: (f) => f.flagSymbols.includes("star"),
  flag_has_crescent: (f) => f.flagSymbols.includes("crescent"),
  flag_has_cross: (f) => f.flagSymbols.includes("cross"),
  flag_has_animal: (f) => f.flagSymbols.includes("animal"),

  // ── Latitude ───────────────────────────────────────────────────────────────
  latitude_south_hemisphere: (f) => f.latitude < 0,
  latitude_polar: (f) => Math.abs(f.latitude) > POLAR_ABS_LAT,

  // ── Sous-région ────────────────────────────────────────────────────────────
  subregion_middle_east: (f) => f.geoTags.includes("middle_east"),
  subregion_caribbean: (f) => f.subregion === "Caribbean",
  subregion_southeast_asia: (f) => f.subregion === "South-Eastern Asia",

  // ── Fuseaux horaires ──────────────────────────────────────────────────────
  time_zones_multiple: (f) => f.utcOffsetCount >= TIME_ZONES_MULTIPLE,
  time_zones_min_3: (f) => f.utcOffsetCount >= TIME_ZONES_MIN_3,

  // ── Événements ─────────────────────────────────────────────────────────────
  event_fifa_wc_host: (f) => f.events.includes("fifa_wc_host"),
  event_summer_olympics_host: (f) => f.events.includes("summer_olympics_host"),
  event_winter_olympics_host: (f) => f.events.includes("winter_olympics_host"),

  // ── Politique / memberships ────────────────────────────────────────────────
  political_eu: (f) => f.memberships.includes("eu"),
  political_g20: (f) => f.memberships.includes("g20"),
  political_nato: (f) => f.memberships.includes("nato"),
  political_commonwealth: (f) => f.memberships.includes("commonwealth"),
  political_arab_league: (f) => f.memberships.includes("arab_league"),
  political_asean: (f) => f.memberships.includes("asean"),
  political_brics: (f) => f.memberships.includes("brics"),
  political_eurozone: (f) => f.memberships.includes("eurozone"),
  political_g7: (f) => f.memberships.includes("g7"),
  political_opec: (f) => f.memberships.includes("opec"),
  political_schengen: (f) => f.memberships.includes("schengen"),

  // ── Régime ─────────────────────────────────────────────────────────────────
  regime_monarchy: (f) => f.regime === "monarchy",

  // ── Géographie physique ────────────────────────────────────────────────────
  physical_crosses_equator: (f) =>
    f.physicalFeatures.includes("equator_crosser"),
  physical_mediterranean_coast: (f) =>
    f.physicalFeatures.includes("mediterranean_coast"),
  physical_caribbean_coast: (f) =>
    f.physicalFeatures.includes("caribbean_coast"),
  physical_peak_over_5000m: (f) =>
    f.physicalFeatures.includes("peak_over_5000m"),

  // ── Densité de population — comparaison à un pays-repère ───────────────────
  density_more_netherlands: (f, ctx) =>
    densityOf(f) > densityOf(ctx.factsOf("NLD")),
  density_more_japan: (f, ctx) => densityOf(f) > densityOf(ctx.factsOf("JPN")),
  density_less_russia: (f, ctx) => densityOf(f) < densityOf(ctx.factsOf("RUS")),
  density_less_canada: (f, ctx) => densityOf(f) < densityOf(ctx.factsOf("CAN")),

  // ── Nature — biomes ────────────────────────────────────────────────────────
  nature_desert: (f) => f.physicalFeatures.includes("has_desert"),
  nature_rainforest: (f) => f.physicalFeatures.includes("rainforest"),
  nature_holocene_volcano: (f) => f.hasHoloceneVolcano,
  nature_mountain_area_majority: (f) =>
    f.mountainAreaShare !== null && f.mountainAreaShare > MAJORITY_SHARE,
  forest_cover_majority: (f) =>
    f.forestCoverShare !== null && f.forestCoverShare > MAJORITY_SHARE,

  // ── Océans — façade maritime ───────────────────────────────────────────────
  ocean_atlantic: (f) => f.physicalFeatures.includes("atlantic_coast"),
  ocean_pacific: (f) => f.physicalFeatures.includes("pacific_coast"),
  ocean_indian: (f) => f.physicalFeatures.includes("indian_ocean_coast"),
  ocean_multiple_basins: (f) => oceanBasinCount(f) >= 2,

  // ── Société ────────────────────────────────────────────────────────────────
  society_drives_on_left: (f) => f.geoTags.includes("drives_on_left"),
  society_capital_not_largest: (f) => f.geoTags.includes("capital_not_largest"),
  urban_centres_min_3_over_1m: (f) => f.urbanCentresOver1M >= URBAN_CENTRES_MIN,
} satisfies Record<ActiveConstraintId, Derivation>;

/**
 * Nombre de bassins océaniques distincts bordant le pays, convention Geodoku
 * (IHO S-23) : Méditerranée et mer des Caraïbes repliées sur l'Atlantique ;
 * façade arctique curée (`arcticCoast`). Sert à `ocean_multiple_basins`.
 */
function oceanBasinCount(facts: CountryFacts): number {
  const f = facts.physicalFeatures;
  let count = 0;
  if (
    f.includes("atlantic_coast") ||
    f.includes("mediterranean_coast") ||
    f.includes("caribbean_coast")
  ) {
    count += 1;
  }
  if (f.includes("pacific_coast")) count += 1;
  if (f.includes("indian_ocean_coast")) count += 1;
  if (f.includes("arctic_coast")) count += 1;
  return count;
}
