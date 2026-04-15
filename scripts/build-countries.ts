/**
 * Generates src/features/countries/data/countries.json
 *
 * Sources:
 * - world-countries npm (v5): name.common (EN), translations.fra.common (FR), cca2
 * - REST Countries v3.1 API: population + flags.alt (field=cca3,population,flags)
 * - scripts/patches.json: overrides, additions, aliasOverrides, geo/events/political lists, flagOverrides
 *
 * Name localisation strategy:
 * - EN: world-countries `name.common` (authoritative English name)
 * - FR: world-countries `translations.fra.common` (ISO 639-3 "fra" = French)
 *   Fallback: EN name when no FR translation is available.
 *
 * Alias generation: [localized name, cca2, cca3] deduplicated + aliasOverrides from patches.json.
 *
 * Run: pnpm build:countries (requires network for population fetch)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import rawWorldCountries from "world-countries";
import type {
  Continent,
  Country,
  FlagColor,
  FlagSymbol,
  WaterAccess,
} from "../src/features/countries/types.ts";

// ─── World-countries shape (fields we consume) ────────────────────────────────

interface WCEntry {
  cca2: string;
  cca3: string;
  name: { common: string };
  translations: Record<string, { common: string; official: string }>;
  flag: string;
  region: string;
  subregion: string;
  landlocked: boolean;
  borders: string[];
  languages: Record<string, string>;
  area: number;
  unMember: boolean;
  latlng?: [number, number];
}

interface AliasOverride {
  fr?: string[];
  en?: string[];
}

interface Patches {
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
interface RcEnrichRow {
  cca3?: string | string[];
  population: number;
  flags?: { alt?: string };
}

const REST_COUNTRIES_URL =
  "https://restcountries.com/v3.1/all?fields=cca3,population,flags";
const WIKIPEDIA_PAGEVIEWS_API =
  "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user";

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Countries present in world-countries but not flagged as UN members
 * that we include for gameplay interest.
 * Kosovo (XKX) is absent from world-countries entirely → handled as an addition.
 */
const EXPLICIT_CODES = new Set<string>(["PSE", "TWN"]);

const EXPECTED_COUNT = 197;

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deriveContinent(region: string, subregion: string): Continent {
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

function deriveWaterAccess(
  landlocked: boolean,
  borderCount: number,
): WaterAccess {
  if (landlocked) return "landlocked";
  if (borderCount === 0) return "island";
  return "coastal";
}

function mapLanguages(raw: Record<string, string>): string[] {
  return Object.keys(raw).map((code) => {
    const iso1 = ISO639_3_TO_1[code];
    // null  → no 639-1 equivalent, keep 639-3
    // undefined → unknown code, keep as-is
    return iso1 ?? code;
  });
}

type RcEnrichment = { population: number; flagAlt?: string };

function rcEnrichmentMapFromRows(
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
 * Curated overrides live in patches.json → `flagOverrides`.
 */
function parseFlagFromAlt(alt: string | undefined): {
  flagColors: FlagColor[];
  flagSymbols: FlagSymbol[];
} {
  if (!alt || alt.trim() === "") {
    return { flagColors: [], flagSymbols: [] };
  }
  const t = alt.toLowerCase();
  const colorSet = new Set<FlagColor>();
  if (/\b(red|crimson|scarlet)\b/.test(t)) colorSet.add("red");
  if (/\b(blue|navy)\b/.test(t)) colorSet.add("blue");
  if (/\bgreen\b/.test(t)) colorSet.add("green");
  if (/\b(yellow|gold|golden)\b/.test(t)) colorSet.add("yellow");
  if (/\bwhite\b/.test(t)) colorSet.add("white");
  if (/\bblack\b/.test(t)) colorSet.add("black");
  if (/\borange\b/.test(t)) colorSet.add("orange");

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

async function fetchRcEnrichment(): Promise<Map<string, RcEnrichment>> {
  const res = await fetch(REST_COUNTRIES_URL);
  if (!res.ok) {
    throw new Error(`REST Countries failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as RcEnrichRow[];
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("REST Countries: expected non-empty array");
  }
  return rcEnrichmentMapFromRows(data);
}

/** Deduplicates an array while preserving order. */
function dedupe(arr: string[]): string[] {
  return [...new Set(arr)];
}

/**
 * Builds localized aliases for a country.
 * Baseline: [localized name, cca2, cca3] — deduplicated.
 * Extras from aliasOverrides are appended (also deduplicated).
 */
function buildAliases(
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

function toWikipediaTitle(name: string): string {
  return name.replaceAll(" ", "_");
}

function getWikipediaRange(): { start: string; end: string } {
  const endDate = new Date();
  // Use previous complete month to avoid partial-month noise.
  endDate.setUTCDate(1);
  endDate.setUTCHours(0, 0, 0, 0);
  endDate.setUTCMonth(endDate.getUTCMonth() - 1);

  const startDate = new Date(endDate);
  startDate.setUTCMonth(startDate.getUTCMonth() - 11);

  function toApiMonth(d: Date): string {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    return `${y}${m}0100`;
  }

  return { start: toApiMonth(startDate), end: toApiMonth(endDate) };
}

async function fetchCountryPageviews(
  title: string,
  range: { start: string; end: string },
): Promise<number | null> {
  const article = encodeURIComponent(title);
  const url = `${WIKIPEDIA_PAGEVIEWS_API}/${article}/monthly/${range.start}/${range.end}`;
  const maxRetries = 4;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Geodoku/0.1 (country popularity calibration)",
      },
    });

    if (response.status === 404) return null;
    if (response.status === 429) {
      if (attempt === maxRetries) {
        return null;
      }
      const waitMs = 250 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      continue;
    }
    if (!response.ok) {
      if (attempt === maxRetries) return null;
      const waitMs = 250 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      continue;
    }

    const payload = (await response.json()) as {
      items?: Array<{ views: number }>;
    };
    if (!payload.items || payload.items.length === 0) return null;
    const total = payload.items.reduce((sum, item) => sum + item.views, 0);
    return Math.round(total / payload.items.length);
  }
  return null;
}

async function fetchPageviewsByCountryCode(
  countries: Country[],
  wikiTitles: Record<string, string>,
): Promise<Map<string, number>> {
  const range = getWikipediaRange();
  const result = new Map<string, number>();
  const concurrency = 3;
  const queue = [...countries];

  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length > 0) {
      const country = queue.shift();
      if (!country) continue;
      const customTitle = wikiTitles[country.code];
      const canonical = country.names?.en ?? country.names?.fr ?? country.code;
      const title = customTitle ?? toWikipediaTitle(canonical);
      const views = await fetchCountryPageviews(title, range);
      if (views != null) {
        result.set(country.code, views);
      }
    }
  });

  await Promise.all(workers);
  return result;
}

function assignPopularity(
  countries: Country[],
  pageviewsByCode: Map<string, number>,
) {
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

// ─── Main ─────────────────────────────────────────────────────────────────────

function latitudeFromWc(c: WCEntry): number {
  const lat = c.latlng?.[0];
  if (typeof lat !== "number" || !Number.isFinite(lat)) {
    throw new Error(`${c.cca3}: missing or invalid latlng`);
  }
  return lat;
}

function mergeFlagFields(
  code: string,
  parsed: { flagColors: FlagColor[]; flagSymbols: FlagSymbol[] },
  patches: Patches,
): Pick<Country, "flagColors" | "flagSymbols"> {
  const o = patches.flagOverrides?.[code];
  if (o?.flagColors != null || o?.flagSymbols != null) {
    return {
      flagColors: o.flagColors ?? parsed.flagColors,
      flagSymbols: o.flagSymbols ?? parsed.flagSymbols,
    };
  }
  return parsed;
}

function gameplayArraysForCode(
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

async function main(): Promise<void> {
  const root = process.cwd();

  const rcByCca3 = await fetchRcEnrichment();

  // 1. Load patches
  const patches = JSON.parse(
    readFileSync(resolve(root, "scripts/patches.json"), "utf-8"),
  ) as Patches;
  const wikiTitles = patches.wikiTitles ?? {};

  // 2. Filter world-countries to UN members + explicit inclusions
  const wc = rawWorldCountries as unknown as WCEntry[];
  const filtered = wc.filter((c) => c.unMember || EXPLICIT_CODES.has(c.cca3));

  // 3. Transform to Country, merge REST Countries + gameplay fields, then overrides
  const fromWC: Country[] = filtered.map((c) => {
    const rc = rcByCca3.get(c.cca3);
    const pop = rc?.population ?? 0;
    const parsed = parseFlagFromAlt(rc?.flagAlt);
    const { flagColors, flagSymbols } = mergeFlagFields(
      c.cca3,
      parsed,
      patches,
    );
    const gameplay = gameplayArraysForCode(c.cca3, patches);

    const nameEn = c.name.common;
    const nameFr = c.translations.fra?.common ?? nameEn;

    const aliasOverride = patches.aliasOverrides?.[c.cca3];
    const aliases = buildAliases(nameFr, nameEn, c.cca2, c.cca3, aliasOverride);

    const country: Country = {
      code: c.cca3,
      names: { fr: nameFr, en: nameEn },
      aliases,
      flagEmoji: c.flag,
      continent: deriveContinent(c.region, c.subregion),
      waterAccess: deriveWaterAccess(c.landlocked, c.borders.length),
      borders: c.borders,
      areaKm2: c.area,
      population: pop,
      officialLanguages: mapLanguages(c.languages),
      latitude: latitudeFromWc(c),
      subregion: c.subregion ?? "",
      flagColors,
      flagSymbols,
      events: gameplay.events,
      groups: gameplay.groups,
      geoTags: gameplay.geoTags,
    };

    const override = patches.overrides[c.cca3];
    if (override) {
      Object.assign(country, override);
    }

    return country;
  });

  // 4. Merge manual additions (e.g. Kosovo, absent from world-countries)
  const additions: Country[] = patches.additions.map((add) => {
    const merged: Country = { ...add };
    const rc = rcByCca3.get(merged.code);
    if (rc && merged.population <= 0) merged.population = rc.population;
    const parsed = parseFlagFromAlt(rc?.flagAlt);
    if (merged.flagColors.length === 0 || merged.flagSymbols.length === 0) {
      const m = mergeFlagFields(merged.code, parsed, patches);
      if (merged.flagColors.length === 0) merged.flagColors = m.flagColors;
      if (merged.flagSymbols.length === 0) merged.flagSymbols = m.flagSymbols;
    }
    const g = gameplayArraysForCode(merged.code, patches);
    merged.events = g.events;
    merged.groups = g.groups;
    merged.geoTags = g.geoTags;
    return merged;
  });

  const result: Country[] = [...fromWC, ...additions];

  // 5. Enrich with Wikipedia pageviews-based popularity index
  const pageviewsByCode = await fetchPageviewsByCountryCode(result, wikiTitles);
  assignPopularity(result, pageviewsByCode);

  // 6. Validate
  if (result.length !== EXPECTED_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_COUNT} countries, got ${result.length}`,
    );
  }

  const seenCodes = new Set<string>();
  for (const c of result) {
    if (!/^[A-Z]{2,3}$/.test(c.code)) {
      throw new Error(`Invalid code: "${c.code}"`);
    }
    if (seenCodes.has(c.code)) {
      throw new Error(`Duplicate code: "${c.code}"`);
    }
    seenCodes.add(c.code);
    if (!c.flagEmoji) {
      throw new Error(`${c.code}: missing flagEmoji`);
    }
    if (!c.names?.fr || !c.names?.en) {
      throw new Error(`${c.code}: missing names.fr or names.en`);
    }
    if (c.areaKm2 <= 0) {
      throw new Error(`${c.code}: areaKm2 must be > 0 (got ${c.areaKm2})`);
    }
    if (!Number.isFinite(c.population) || c.population <= 0) {
      throw new Error(
        `${c.code}: population must be a finite number > 0 (got ${c.population})`,
      );
    }
    if (c.officialLanguages.length === 0) {
      throw new Error(`${c.code}: no officialLanguages`);
    }
    for (const border of c.borders) {
      if (!/^[A-Z]{2,3}$/.test(border)) {
        throw new Error(`${c.code}: invalid border code "${border}"`);
      }
    }
    if (!Number.isFinite(c.latitude) || c.latitude < -90 || c.latitude > 90) {
      throw new Error(`${c.code}: invalid latitude ${c.latitude}`);
    }
    if (typeof c.subregion !== "string") {
      throw new Error(`${c.code}: subregion must be a string`);
    }
    if (!Array.isArray(c.flagColors) || c.flagColors.length === 0) {
      throw new Error(
        `${c.code}: flagColors must be non-empty (add flagOverrides in patches.json if needed)`,
      );
    }
    if (!Array.isArray(c.flagSymbols)) {
      throw new Error(`${c.code}: flagSymbols must be an array`);
    }
    if (!Array.isArray(c.events)) {
      throw new Error(`${c.code}: events must be an array`);
    }
    if (!Array.isArray(c.groups)) {
      throw new Error(`${c.code}: groups must be an array`);
    }
    if (!Array.isArray(c.geoTags)) {
      throw new Error(`${c.code}: geoTags must be an array`);
    }
  }

  // 7. Sort alphabetically by code (stable output across runs)
  result.sort((a, b) => a.code.localeCompare(b.code));

  // 8. Write
  const outPath = resolve(root, "src/features/countries/data/countries.json");
  writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf-8");
  console.log(`✓ ${result.length} countries → ${outPath}`);
  console.log(
    `✓ Wikipedia popularity enriched for ${pageviewsByCode.size} countries`,
  );

  // Sample: a few varied + ambiguous countries
  const SAMPLE_CODES = ["FRA", "BRA", "AUS", "CYP", "XKX", "TWN", "USA", "GBR"];
  console.log("\nSample:");
  for (const code of SAMPLE_CODES) {
    const c = result.find((x) => x.code === code);
    if (c) console.log(JSON.stringify(c));
  }
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
