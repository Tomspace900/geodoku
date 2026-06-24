/**
 * Pure helpers for build-countries (unit-tested). See build-countries.ts.
 */
import type {
  Country,
  CountryCapital,
  DrivingSide,
  FlagColor,
  FlagLayout,
  FlagSymbol,
  PhysicalFeature,
  PoliticalGroup,
  Regime,
  WaterAccess,
} from "../../src/features/countries/types.ts";

/** Explicit source fixes — only fields where world-countries / REST need gameplay correction. */
export type SourceCorrection = {
  borders?: string[];
  waterAccess?: WaterAccess;
};

/** Curated constraint tag lists (events, geo, physical features, regime). */
export type GameplayClassifications = {
  middleEast: string[];
  eventFifaWcHost: string[];
  eventSummerOlympicsHost: string[];
  monarchy: string[];
  equatorCrosser: string[];
  mediterraneanCoast: string[];
  caribbeanCoast: string[];
  peakOver5000m: string[];
  capitalNotLargest: string[];
  desert: string[];
  rainforest: string[];
  atlanticCoast: string[];
  pacificCoast: string[];
  indianOceanCoast: string[];
};

export type CountryPatchesConfig = {
  sourceCorrectionsByIso3: Record<string, SourceCorrection>;
  searchAliasesByIso3: Record<string, string[]>;
  wikipediaTitlesByIso3: Record<string, string>;
  gameplayClassifications: GameplayClassifications;
  manualCountryAdditions: Country[];
};

/**
 * Curated flag truth table (`scripts/prod/flagData.json`), keyed by ISO3 code.
 * Source of truth for `flagColors` / `flagSymbols` / `flagLayout` — replaces the old free-text
 * `flags.alt` heuristic. Hand-curated (interpretive, near-static reference data).
 */
export type FlagData = Record<
  string,
  {
    flagColors: FlagColor[];
    flagSymbols: FlagSymbol[];
    flagLayout: FlagLayout[];
  }
>;

/** REST Countries v5 row (subset consumed by build-countries). */
export interface RcEnrichRow {
  cca3?: string | string[];
  iso2?: string;
  population: number;
  officialName?: string;
  alternateNames?: string[];
  capitals?: CountryCapital[];
  drivingSide?: DrivingSide;
  memberships?: PoliticalGroup[];
  borders?: string[];
  landlocked?: boolean;
}

export type RcEnrichment = {
  iso2: string;
  population: number;
  officialName?: string;
  alternateNames: string[];
  capitals: CountryCapital[];
  drivingSide: DrivingSide;
  memberships: PoliticalGroup[];
  borders?: string[];
  landlocked?: boolean;
};

/**
 * ISO 639-3 → ISO 639-1 conversion table.
 * null = the language has no ISO 639-1 code; the 639-3 code is kept as fallback.
 */
const ISO639_3_TO_1: Readonly<Record<string, string | null>> = {
  afr: "af",
  aka: "ak",
  amh: "am",
  ara: "ar",
  aym: "ay",
  aze: "az",
  bel: "be",
  ben: "bn",
  bis: "bi",
  bos: "bs",
  bul: "bg",
  cat: "ca",
  ces: "cs",
  cha: "ch",
  cnr: null,
  dan: "da",
  deu: "de",
  div: "dv",
  dzo: "dz",
  ell: "el",
  eng: "en",
  est: "et",
  fij: "fj",
  fin: "fi",
  fra: "fr",
  gil: null,
  gle: "ga",
  glv: "gv",
  grn: "gn",
  gsw: null,
  hau: "ha",
  hbs: "sr",
  heb: "he",
  her: "hz",
  hin: "hi",
  hmo: null,
  hrv: "hr",
  hun: "hu",
  hye: "hy",
  ind: "id",
  isl: "is",
  ita: "it",
  jpn: "ja",
  kal: "kl",
  kat: "ka",
  kaz: "kk",
  khm: "km",
  kik: "ki",
  kin: "rw",
  kir: "ky",
  kon: "kg",
  kor: "ko",
  lao: "lo",
  lat: "la",
  lav: "lv",
  lin: "ln",
  lit: "lt",
  lub: "lu",
  lug: "lg",
  ltz: "lb",
  mfe: null,
  mkd: "mk",
  mlg: "mg",
  mlt: "mt",
  mon: "mn",
  mri: "mi",
  msa: "ms",
  mya: "my",
  nau: "na",
  nbl: "nr",
  nde: "nd",
  ndo: "ng",
  nep: "ne",
  nld: "nl",
  nno: "nn",
  nob: "nb",
  nor: "no",
  nya: "ny",
  orm: "om",
  pan: "pa",
  pol: "pl",
  por: "pt",
  pov: null,
  pus: "ps",
  que: "qu",
  roh: "rm",
  ron: "ro",
  run: "rn",
  rus: "ru",
  sag: "sg",
  sin: "si",
  slk: "sk",
  slv: "sl",
  smi: "se",
  smo: "sm",
  sna: "sn",
  som: "so",
  sot: "st",
  spa: "es",
  sqi: "sq",
  srp: "sr",
  ssw: "ss",
  swa: "sw",
  swe: "sv",
  tam: "ta",
  tet: null,
  tgk: "tg",
  tha: "th",
  tir: "ti",
  tkl: null,
  ton: "to",
  tpi: null,
  tsn: "tn",
  tso: "ts",
  tuk: "tk",
  tur: "tr",
  tvl: null,
  uig: "ug",
  ukr: "uk",
  urd: "ur",
  uzb: "uz",
  ven: "ve",
  vie: "vi",
  xho: "xh",
  zho: "zh",
  zul: "zu",
};

export function deriveContinent(
  region: string,
  subregion: string,
): Country["continent"] {
  switch (region) {
    case "Africa":
      return "africa";
    case "Asia":
      return "asia";
    case "Europe":
      return "europe";
    case "Oceania":
      return "oceania";
    case "Americas":
      return subregion === "South America" ? "south_america" : "north_america";
    default:
      throw new Error(
        `Unknown region: "${region}" (subregion: "${subregion}")`,
      );
  }
}

export function deriveWaterAccess(
  landlocked: boolean,
  borderCount: number,
): WaterAccess {
  if (landlocked) return "landlocked";
  if (borderCount === 0) return "island";
  return "coastal";
}

export function mapLanguages(raw: Record<string, string>): string[] {
  return Object.keys(raw).map((code) => {
    const iso1 = ISO639_3_TO_1[code];
    // null  → no 639-1 equivalent, keep 639-3
    // undefined → unknown code, keep as-is
    return iso1 ?? code;
  });
}

export function rcEnrichmentMapFromRows(
  rows: RcEnrichRow[],
): Map<string, RcEnrichment> {
  const map = new Map<string, RcEnrichment>();
  for (const row of rows) {
    const raw = row.cca3;
    if (raw == null) continue;
    const codes = Array.isArray(raw) ? raw : [raw];
    for (const code of codes) {
      if (
        typeof code === "string" &&
        /^[A-Z]{3}$/.test(code) &&
        row.iso2 &&
        /^[A-Z]{2}$/.test(row.iso2) &&
        row.drivingSide
      ) {
        map.set(code, {
          iso2: row.iso2,
          population: row.population,
          officialName: row.officialName,
          alternateNames: row.alternateNames ?? [],
          capitals: row.capitals ?? [],
          drivingSide: row.drivingSide,
          memberships: row.memberships ?? [],
          borders: row.borders,
          landlocked: row.landlocked,
        });
      }
    }
  }
  return map;
}

export function dedupe(arr: string[]): string[] {
  return [...new Set(arr)];
}

export function buildAliases(extra?: string[]): string[] {
  return dedupe(extra ?? []);
}

export function toWikipediaTitle(name: string): string {
  return name.replaceAll(" ", "_");
}

/**
 * Resolves curated flag fields for a country from the flag truth table.
 * Throws on a missing entry so an incomplete table can never ship silently.
 */
export function flagFieldsForCode(
  code: string,
  flagData: FlagData,
): Pick<Country, "flagColors" | "flagSymbols" | "flagLayout"> {
  const entry = flagData[code];
  if (!entry) {
    throw new Error(
      `${code}: missing flagData entry (add it to scripts/prod/flagData.json)`,
    );
  }
  return {
    flagColors: entry.flagColors,
    flagSymbols: entry.flagSymbols,
    flagLayout: entry.flagLayout,
  };
}

export function applySourceCorrections(
  country: Country,
  correction?: SourceCorrection,
): void {
  if (!correction) return;
  if (correction.borders !== undefined) country.borders = correction.borders;
  if (correction.waterAccess !== undefined) {
    country.waterAccess = correction.waterAccess;
  }
}

export function gameplayArraysForCode(
  code: string,
  classifications: GameplayClassifications,
  rc: RcEnrichment,
): Pick<Country, "events" | "geoTags"> {
  const events: Country["events"] = [];
  if (classifications.eventFifaWcHost.includes(code))
    events.push("fifa_wc_host");
  if (classifications.eventSummerOlympicsHost.includes(code))
    events.push("summer_olympics_host");
  const geoTags: string[] = [];
  if (classifications.middleEast.includes(code)) geoTags.push("middle_east");
  if (rc.drivingSide === "left") {
    geoTags.push("drives_on_left");
  }
  if (classifications.capitalNotLargest.includes(code))
    geoTags.push("capital_not_largest");
  return { events, geoTags };
}

export function regimeForCode(
  code: string,
  classifications: GameplayClassifications,
): Regime {
  return classifications.monarchy.includes(code) ? "monarchy" : "republic";
}

export function physicalFeaturesForCode(
  code: string,
  classifications: GameplayClassifications,
): PhysicalFeature[] {
  const features: PhysicalFeature[] = [];
  if (classifications.equatorCrosser.includes(code))
    features.push("equator_crosser");
  if (classifications.mediterraneanCoast.includes(code))
    features.push("mediterranean_coast");
  if (classifications.caribbeanCoast.includes(code))
    features.push("caribbean_coast");
  if (classifications.peakOver5000m.includes(code))
    features.push("peak_over_5000m");
  if (classifications.desert.includes(code)) features.push("has_desert");
  if (classifications.rainforest.includes(code)) features.push("rainforest");
  if (classifications.atlanticCoast.includes(code))
    features.push("atlantic_coast");
  if (classifications.pacificCoast.includes(code))
    features.push("pacific_coast");
  if (classifications.indianOceanCoast.includes(code))
    features.push("indian_ocean_coast");
  return features;
}

/** Fallback when Wikipedia pageviews are missing (`assignPopularity` only). Matches median in percentile ranking. */
const POPULARITY_MEDIAN_FALLBACK = 0.5;

/**
 * Computes `popularityIndex` as **percentile rank** (0–1 uniform over fetched pageviews).
 * Tie ranks use the average index. Countries without pageviews in the map receive the median fallback.
 */
export function assignPopularity(
  countries: Country[],
  pageviewsByCode: Map<string, number>,
): void {
  for (const country of countries) {
    const v = pageviewsByCode.get(country.iso3);
    if (typeof v === "number" && v > 0) {
      country.wikipediaMonthlyViews = v;
    }
  }

  const withViews = countries.filter(
    (c) =>
      typeof c.wikipediaMonthlyViews === "number" &&
      c.wikipediaMonthlyViews > 0,
  );
  const n = withViews.length;
  if (n === 0) return;

  withViews.sort((a, b) => a.wikipediaMonthlyViews! - b.wikipediaMonthlyViews!);

  if (n === 1) {
    withViews[0].popularityIndex = POPULARITY_MEDIAN_FALLBACK;
  } else {
    let i = 0;
    while (i < n) {
      const v = withViews[i].wikipediaMonthlyViews!;
      let j = i + 1;
      while (j < n && withViews[j].wikipediaMonthlyViews === v) j++;
      const avgIndex = (i + (j - 1)) / 2;
      const popularityIndex = avgIndex / (n - 1);
      for (let k = i; k < j; k++) {
        withViews[k].popularityIndex = popularityIndex;
      }
      i = j;
    }
  }

  for (const c of countries) {
    if (c.popularityIndex === undefined) {
      c.popularityIndex = POPULARITY_MEDIAN_FALLBACK;
    }
  }
}
