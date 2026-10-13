import type { TKey } from "@/i18n/types";
import type { ConstraintId } from "../../../../content/constraints";
import { isCountryCode } from "../../../../content/countries/countryCodes";
import type { CountryFacts } from "../../../../content/countries/type";
import type { LocalizedString } from "../../../../content/type";
import type { PhysicalFeature, ProductionRankKey } from "../types";
import {
  PHYSICAL_FEATURE_LABELS,
  PRODUCTION_LABELS,
  SOVEREIGNTY_KIND_LABELS,
} from "./countrySheetLabels";

/**
 * Valeur d'un pays pour une contrainte : ce que le fait dit **en plus** du
 * libellé. Modèle pur et locale-agnostique — le rendu texte vit dans
 * `constraintValueFormat.ts`.
 *
 * Une contrainte dont la valeur ne ferait que répéter son libellé (« Pays
 * d'Asie » → « Asie », « Enclavé » → « enclavé ») n'a pas de valeur : `null`.
 * Le drawer de la grille solution n'affiche alors rien plutôt qu'un doublon.
 */
export type ConstraintValue =
  | { kind: "population"; value: number }
  | { kind: "area"; km2: number }
  | { kind: "density"; value: number }
  | { kind: "borderCount"; count: number }
  | { kind: "utcOffsets"; count: number }
  /** Valeur absolue en degrés ; `north` porte l'hémisphère. */
  | { kind: "latitude"; degrees: number; north: boolean }
  | { kind: "share"; share: "forest" | "mountain" | "coal"; fraction: number }
  | { kind: "rank"; rank: number; productLabelKey: TKey }
  | { kind: "lastEruption"; year: number }
  /** `null` : point sans nom, rendu par un libellé i18n unique. */
  | { kind: "highestPoint"; names: LocalizedString | null; elevationM: number }
  /** ISO3 des voisins jouables ; une seule valeur pour `borders_solo`. */
  | { kind: "neighbors"; iso3: readonly string[] }
  | {
      kind: "sovereignty";
      kindLabelKey: TKey;
      year: number;
      /** `YYYY-MM-DD` ; `null` quand la source ne donne que l'année. */
      date: string | null;
    }
  | { kind: "enumList"; labelKeys: readonly TKey[] }
  | { kind: "languages"; codes: readonly string[] }
  | { kind: "capitals"; names: readonly LocalizedString[] };

type ConstraintValueExtractor = (facts: CountryFacts) => ConstraintValue | null;

/** Contrainte booléenne ou catégorielle : sa valeur répéterait son libellé. */
const NO_VALUE: ConstraintValueExtractor = () => null;

const OCEAN_FEATURES: readonly PhysicalFeature[] = [
  "atlantic_coast",
  "pacific_coast",
  "indian_ocean_coast",
  "arctic_coast",
];

const population: ConstraintValueExtractor = (facts) => ({
  kind: "population",
  value: facts.population,
});

const area: ConstraintValueExtractor = (facts) => ({
  kind: "area",
  km2: facts.areaKm2,
});

const density: ConstraintValueExtractor = (facts) => ({
  kind: "density",
  value: facts.areaKm2 > 0 ? facts.population / facts.areaKm2 : 0,
});

/** Voisins **jouables** — même décompte que `borders_min_*` (cf. `derivations.ts`). */
const borderCount: ConstraintValueExtractor = (facts) => ({
  kind: "borderCount",
  count: facts.borders.filter(isCountryCode).length,
});

const latitude: ConstraintValueExtractor = (facts) => ({
  kind: "latitude",
  degrees: Math.abs(facts.latitude),
  north: facts.latitude >= 0,
});

function share(
  which: "forest" | "mountain" | "coal",
  pick: (facts: CountryFacts) => number | null,
): ConstraintValueExtractor {
  return (facts) => {
    const fraction = pick(facts);
    return fraction === null ? null : { kind: "share", share: which, fraction };
  };
}

function rank(product: ProductionRankKey): ConstraintValueExtractor {
  return (facts) => {
    const value = facts.productionRanks[product];
    return value === undefined
      ? null
      : {
          kind: "rank",
          rank: value,
          productLabelKey: PRODUCTION_LABELS[product],
        };
  };
}

const lastEruption: ConstraintValueExtractor = (facts) =>
  facts.lastVolcanicEruptionYear === null
    ? null
    : { kind: "lastEruption", year: facts.lastVolcanicEruptionYear };

/**
 * Une liste n'apporte rien tant qu'elle se réduit à l'élément que la
 * contrainte nomme déjà (« Langue officielle : français » → « français ») :
 * elle n'est montrée qu'à partir de deux éléments.
 */
function listWhenSeveral(labelKeys: readonly TKey[]): ConstraintValue | null {
  return labelKeys.length > 1 ? { kind: "enumList", labelKeys } : null;
}

/** La langue elle-même, même unique : « France — français » dit au joueur ce qui a été retenu. */
const officialLanguages: ConstraintValueExtractor = (facts) =>
  facts.officialLanguages.length > 0
    ? { kind: "languages", codes: facts.officialLanguages }
    : null;

const oceanBasins: ConstraintValueExtractor = (facts) =>
  listWhenSeveral(
    OCEAN_FEATURES.filter((feature) =>
      facts.physicalFeatures.includes(feature),
    ).map((feature) => PHYSICAL_FEATURE_LABELS[feature]),
  );

/**
 * Événement de souveraineté du pays (nature + date). Masqué là où le dataset
 * le masque (`sovereigntySheetHidden`) : sa nature serait fausse une fois
 * affichée. Pour `history_from_*`, c'est l'événement d'où sort l'ancienne
 * puissance — la date de l'indépendance.
 */
const sovereigntyEvent: ConstraintValueExtractor = (facts) =>
  facts.sovereigntyKind === null ||
  facts.sovereigntyYear === null ||
  facts.sovereigntySheetHidden
    ? null
    : {
        kind: "sovereignty",
        kindLabelKey: SOVEREIGNTY_KIND_LABELS[facts.sovereigntyKind],
        year: facts.sovereigntyYear,
        date: facts.sovereigntyDate,
      };

/**
 * Natures d'événement qui ne sont pas un départ de l'ancienne puissance : une
 * unification (Yémen, 22 mai 1990 — l'indépendance du Sud date de 1967) ou une
 * fondation datée d'après la tutelle. L'afficher en face de « sous domination
 * britannique » donnerait la mauvaise date.
 */
const NOT_A_DEPARTURE: ReadonlySet<string> = new Set([
  "unification",
  "foundation",
  "continuation",
]);

const departureFromFormerSovereign: ConstraintValueExtractor = (facts) =>
  facts.sovereigntyKind !== null && NOT_A_DEPARTURE.has(facts.sovereigntyKind)
    ? null
    : sovereigntyEvent(facts);

/** Le voisin unique n'est pas dans le libellé (« Un seul voisin terrestre ») : c'est l'information. */
const soleNeighbor: ConstraintValueExtractor = (facts) => {
  const iso3 = facts.borders.filter(isCountryCode);
  return iso3.length === 1 ? { kind: "neighbors", iso3 } : null;
};

/** Le sommet nommé en plus de son altitude — le libellé ne dit que « plus de 5 000 m ». */
const highestPoint: ConstraintValueExtractor = (facts) => ({
  kind: "highestPoint",
  names: facts.highestPoint.names,
  elevationM: facts.highestPoint.elevationM,
});

/** Exception à la règle « pas de doublon » : le nom de la capitale est une vraie information. */
const capitals: ConstraintValueExtractor = (facts) =>
  facts.capitals.length === 0
    ? null
    : { kind: "capitals", names: facts.capitals.map((c) => c.names) };

/**
 * Extracteur par contrainte. Une contrainte **archivée** n'a jamais de valeur :
 * sa liste est figée à la main alors que les faits sont régénérés (le Salvador à
 * 287 hab./km² dans « > 300 », l'Ukraine à 28,7 M dans « > 30 M ») — lire la
 * valeur courante à côté d'une liste du passé la ferait contredire son libellé.
 *
 * `satisfies` verrouille la bijection avec
 * `ConstraintId` (actives **et** archivées, rejouables en entraînement) : une
 * contrainte ajoutée sans décision sur sa valeur ne compile pas.
 */
const EXTRACTORS = {
  // ── Continent ──────────────────────────────────────────────────────────────
  continent_africa: NO_VALUE,
  continent_asia: NO_VALUE,
  continent_europe: NO_VALUE,
  continent_north_america: NO_VALUE,
  continent_south_america: NO_VALUE,
  continent_oceania: NO_VALUE,

  // ── Accès à l'eau ──────────────────────────────────────────────────────────
  water_island: NO_VALUE,
  water_landlocked: NO_VALUE,

  // ── Frontières ─────────────────────────────────────────────────────────────
  borders_solo: soleNeighbor,
  borders_min_5: borderCount,
  borders_min_7: borderCount,
  borders_russia: NO_VALUE,
  borders_china: NO_VALUE,
  borders_brazil: NO_VALUE,
  borders_india: NO_VALUE,

  // ── Superficie ─────────────────────────────────────────────────────────────
  area_larger_india: area,
  area_larger_mexico: area,
  area_larger_france: area,
  area_smaller_belgium: area,
  area_smaller_luxembourg: area,
  area_gt_2M: NO_VALUE,
  area_gt_500k: NO_VALUE,
  area_lt_1k: NO_VALUE,

  // ── Population ─────────────────────────────────────────────────────────────
  population_more_germany: population,
  population_more_canada: population,
  population_less_iceland: population,
  population_gt_100M: NO_VALUE,
  population_gt_30M: NO_VALUE,
  population_lt_1M: NO_VALUE,
  population_lt_2_5M: NO_VALUE,

  // ── Langue ─────────────────────────────────────────────────────────────────
  language_french: officialLanguages,
  language_arabic: officialLanguages,
  language_spanish: officialLanguages,
  language_english: officialLanguages,
  language_portuguese: officialLanguages,
  language_russian: officialLanguages,
  language_multilingual: NO_VALUE,

  // ── Drapeau ────────────────────────────────────────────────────────────────
  flag_has_star: NO_VALUE,
  flag_has_crescent: NO_VALUE,
  flag_has_cross: NO_VALUE,
  flag_has_animal: NO_VALUE,
  flag_two_colors: NO_VALUE,

  // ── Latitude, sous-région, fuseaux ─────────────────────────────────────────
  latitude_south_hemisphere: latitude,
  latitude_polar: latitude,
  subregion_middle_east: NO_VALUE,
  subregion_caribbean: NO_VALUE,
  subregion_southeast_asia: NO_VALUE,
  time_zones_multiple: (facts) => ({
    kind: "utcOffsets",
    count: facts.utcOffsetCount,
  }),

  // ── Événements, politique, régime ──────────────────────────────────────────
  event_fifa_wc_host: NO_VALUE,
  event_summer_olympics_host: NO_VALUE,
  event_winter_olympics_host: NO_VALUE,
  political_eu: NO_VALUE,
  political_g20: NO_VALUE,
  political_nato: NO_VALUE,
  political_commonwealth: NO_VALUE,
  political_opec: NO_VALUE,
  regime_monarchy: NO_VALUE,

  // ── Géographie physique ────────────────────────────────────────────────────
  physical_crosses_equator: NO_VALUE,
  physical_mediterranean_coast: NO_VALUE,
  physical_caribbean_coast: NO_VALUE,
  physical_peak_over_5000m: highestPoint,

  // ── Densité ────────────────────────────────────────────────────────────────
  density_more_netherlands: density,
  density_more_japan: density,
  density_less_russia: density,
  density_less_canada: density,
  density_high: NO_VALUE,
  density_low: NO_VALUE,

  // ── Nature ─────────────────────────────────────────────────────────────────
  nature_desert: NO_VALUE,
  nature_rainforest: NO_VALUE,
  nature_active_volcano: lastEruption,
  nature_holocene_volcano: NO_VALUE,
  nature_mountain_area_majority: share(
    "mountain",
    (facts) => facts.mountainAreaShare,
  ),
  forest_cover_majority: share("forest", (facts) => facts.forestCoverShare),

  // ── Océans ─────────────────────────────────────────────────────────────────
  ocean_atlantic: NO_VALUE,
  ocean_pacific: NO_VALUE,
  ocean_indian: NO_VALUE,
  ocean_multiple_basins: oceanBasins,

  // ── Société ────────────────────────────────────────────────────────────────
  society_drives_on_left: NO_VALUE,
  society_capital_not_largest: capitals,

  // ── Production et énergie ──────────────────────────────────────────────────
  production_cocoa_top10: rank("cocoa"),
  production_coffee_top10: rank("coffee"),
  production_rice_top10: rank("rice"),
  production_wheat_top10: rank("wheat"),
  production_crude_oil_top15: rank("crude_oil"),
  production_natural_gas_top15: rank("natural_gas"),
  energy_coal_electricity_majority: share(
    "coal",
    (facts) => facts.coalElectricityShare,
  ),

  // ── Histoire ───────────────────────────────────────────────────────────────
  history_sovereignty_since_1990: sovereigntyEvent,
  history_from_france: departureFromFormerSovereign,
  history_from_united_kingdom: departureFromFormerSovereign,
} satisfies Record<ConstraintId, ConstraintValueExtractor>;

/**
 * Valeur d'un pays pour une contrainte, ou `null` quand elle répéterait le
 * libellé (ou que la donnée manque). `facts` vient du chunk lazy des faits
 * (`countrySheetData.ts`) : ce module n'importe jamais
 * `content/countries/facts`.
 */
export function constraintValueFor(
  constraintId: ConstraintId,
  facts: CountryFacts,
): ConstraintValue | null {
  return EXTRACTORS[constraintId](facts);
}
