/**
 * Pure helpers for build-countries (unit-tested). See build-countries.ts.
 */
import type {
  Country,
  FlagColor,
  FlagSymbol,
  WaterAccess,
} from "../../src/features/countries/types.ts";

export type ContinentName = Country["continent"];

export interface AliasOverride {
  fr?: string[];
  en?: string[];
}

export interface Patches {
  overrides: Record<string, Partial<Omit<Country, "code">>>;
  aliasOverrides: Record<string, AliasOverride>;
  additions: Country[];
  wikiTitles?: Record<string, string>;
  middleEastCodes?: string[];
  eventFifaWcHost?: string[];
  eventSummerOlympicsHost?: string[];
  euMemberCodes?: string[];
  g20MemberCodes?: string[];
  flagOverrides?: Record<
    string,
    { flagColors?: FlagColor[]; flagSymbols?: FlagSymbol[] }
  >;
}

/** REST Countries v3.1 row (fields=cca3,population,flags) */
export interface RcEnrichRow {
  cca3?: string | string[];
  population: number;
  flags?: { alt?: string };
}

export type RcEnrichment = { population: number; flagAlt?: string };

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
      if (typeof code === "string" && /^[A-Z]{3}$/.test(code)) {
        map.set(code, {
          population: row.population,
          flagAlt: row.flags?.alt,
        });
      }
    }
  }
  return map;
}

/**
 * Heuristic parser for REST Countries `flags.alt` (English prose).
 *
 * **Important — there is no guarantee of completeness or correctness:**
 * - The API does not expose structured color data; `flags.alt` is free-text that can
 *   change anytime. We only match a growing list of English colour words and aliases.
 * - Output is coerced to the small `FlagColor` union (gameplay), so many real-world
 *   shades (e.g. violet, bicolour phrasing) are not represented literally.
 * - Wording that omits a colour, uses unusual vocabulary, or describes only an emblem
 *   can miss colours; some cases are fixed in `patches.json` (`overrides` / `flagOverrides`)
 *   for politics, heraldry, or intentional game balance.
 * - `scripts/prod/audit-flag-color-gaps.ts` (see `pnpm audit:flag-colors`) compares this
 *   output to the built `countries.json` to spot drift; that does not prove 100% API coverage.
 */
export function parseFlagFromAlt(alt: string | undefined): {
  flagColors: FlagColor[];
  flagSymbols: FlagSymbol[];
} {
  if (!alt || alt.trim() === "") {
    return { flagColors: [], flagSymbols: [] };
  }
  const t = alt.toLowerCase();
  const colorSet = new Set<FlagColor>();
  // Heuristic colour words in REST `flags.alt` (English) → normalized `FlagColor`.
  if (
    /\b(red|crimson|scarlet|maroon|burgundy|vermilion|carmine|ruby|gules)\b/.test(
      t,
    )
  ) {
    colorSet.add("red");
  }
  if (
    /\b(blue|navy|ultramarine|azure|sapphire|indigo|cerulean|cobalt|denim|periwinkle|admiralty|columbia[ -]?blue|royal[ -]blue|midnight[ -]blue|light[ -]blue|dark[ -]blue|sky[ -]blue|turquoise|aqua|aquamarine|teal)\b/.test(
      t,
    )
  ) {
    colorSet.add("blue");
  }
  if (
    /\b(green|emerald|jade|olive|lime|sage|viridian|spring[ -]green|forest[ -]green|sea[ -]green|hunter[ -]green|kelly[ -]green|malachite)\b/.test(
      t,
    )
  ) {
    colorSet.add("green");
  }
  if (
    /\b(yellow|gold|golden|amber|saffron|lemon|canary|ochre|ocre|buff|blonde|straw)\b/.test(
      t,
    )
  ) {
    colorSet.add("yellow");
  }
  if (/\b(white|silver|platinum|cream|pearl|ivory|snow|argent)\b/.test(t)) {
    colorSet.add("white");
  }
  if (/\b(black|sable|charcoal|ebony|onyx)\b/.test(t)) colorSet.add("black");
  if (/\b(orange|tangerine|apricot|peach|copper)\b/.test(t)) {
    colorSet.add("orange");
  }

  const symbolSet = new Set<FlagSymbol>();
  if (/\bstars?\b/.test(t)) symbolSet.add("star");
  if (/\bcrescent\b/.test(t)) symbolSet.add("crescent");
  if (/\bcross\b/.test(t)) symbolSet.add("cross");
  if (/\bsun\b/.test(t)) symbolSet.add("sun");
  if (/\b(circle|disc|disk)\b/.test(t)) symbolSet.add("circle");
  if (/\btriangle\b/.test(t)) symbolSet.add("triangle");
  if (/\b(dragon|eagle|lion|leopard|bear|animal)\b/.test(t))
    symbolSet.add("animal");

  return {
    flagColors: [...colorSet],
    flagSymbols: [...symbolSet],
  };
}

export function dedupe(arr: string[]): string[] {
  return [...new Set(arr)];
}

export function buildAliases(
  nameFr: string,
  nameEn: string,
  cca2: string,
  cca3: string,
  overrides?: AliasOverride,
): { fr: string[]; en: string[] } {
  const fr = dedupe([nameFr, cca2, cca3, ...(overrides?.fr ?? [])]);
  const en = dedupe([nameEn, cca2, cca3, ...(overrides?.en ?? [])]);
  return { fr, en };
}

export function toWikipediaTitle(name: string): string {
  return name.replaceAll(" ", "_");
}

export function mergeFlagFields(
  _code: string,
  parsed: { flagColors: FlagColor[]; flagSymbols: FlagSymbol[] },
  patches: Patches,
): Pick<Country, "flagColors" | "flagSymbols"> {
  const o = patches.flagOverrides?.[_code];
  if (o?.flagColors != null || o?.flagSymbols != null) {
    return {
      flagColors: o.flagColors ?? parsed.flagColors,
      flagSymbols: o.flagSymbols ?? parsed.flagSymbols,
    };
  }
  return parsed;
}

export function gameplayArraysForCode(
  code: string,
  patches: Patches,
): Pick<Country, "events" | "groups" | "geoTags"> {
  const events: Country["events"] = [];
  if (patches.eventFifaWcHost?.includes(code)) events.push("fifa_wc_host");
  if (patches.eventSummerOlympicsHost?.includes(code))
    events.push("summer_olympics_host");
  const groups: Country["groups"] = [];
  if (patches.euMemberCodes?.includes(code)) groups.push("eu");
  if (patches.g20MemberCodes?.includes(code)) groups.push("g20");
  const geoTags: string[] = [];
  if (patches.middleEastCodes?.includes(code)) geoTags.push("middle_east");
  return { events, groups, geoTags };
}

export function assignPopularity(
  countries: Country[],
  pageviewsByCode: Map<string, number>,
): void {
  const viewValues = countries
    .map((country) => pageviewsByCode.get(country.code))
    .filter((value): value is number => value !== undefined && value > 0);

  if (viewValues.length === 0) return;

  const minLog = Math.log10(Math.min(...viewValues));
  const maxLog = Math.log10(Math.max(...viewValues));
  const span = Math.max(1e-6, maxLog - minLog);

  for (const country of countries) {
    const views = pageviewsByCode.get(country.code);
    if (!views || views <= 0) continue;
    const logViews = Math.log10(views);
    country.wikipediaMonthlyViews = views;
    country.popularityIndex = Math.min(
      1,
      Math.max(0, (logViews - minLog) / span),
    );
  }
}
