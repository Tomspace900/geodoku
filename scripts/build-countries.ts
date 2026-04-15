/**
 * Generates src/features/countries/data/countries.json
 *
 * Sources:
 * - world-countries npm (v5): name.common (EN), translations.fra.common (FR), cca2
 * - REST Countries v3.1 API: population (field=cca3,population)
 * - scripts/patches.json: overrides, additions, aliasOverrides
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
}

interface AliasOverride {
  fr?: string[];
  en?: string[];
}

interface Patches {
  overrides: Record<string, Partial<Omit<Country, "code">>>;
  aliasOverrides: Record<string, AliasOverride>;
  additions: Country[];
}

/** REST Countries v3.1 minimal row (fields=cca3,population) */
interface RcEntry {
  cca3?: string | string[];
  population: number;
}

const REST_COUNTRIES_URL =
  "https://restcountries.com/v3.1/all?fields=cca3,population";

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

function populationMapFromRc(rows: RcEntry[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const raw = row.cca3;
    if (raw == null) continue;
    const codes = Array.isArray(raw) ? raw : [raw];
    for (const code of codes) {
      if (typeof code === "string" && /^[A-Z]{3}$/.test(code)) {
        map.set(code, row.population);
      }
    }
  }
  return map;
}

async function fetchPopulationByCca3(): Promise<Map<string, number>> {
  const res = await fetch(REST_COUNTRIES_URL);
  if (!res.ok) {
    throw new Error(`REST Countries failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as RcEntry[];
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("REST Countries: expected non-empty array");
  }
  return populationMapFromRc(data);
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

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const root = process.cwd();

  const populationByCca3 = await fetchPopulationByCca3();

  // 1. Load patches
  const patches = JSON.parse(
    readFileSync(resolve(root, "scripts/patches.json"), "utf-8"),
  ) as Patches;

  // 2. Filter world-countries to UN members + explicit inclusions
  const wc = rawWorldCountries as unknown as WCEntry[];
  const filtered = wc.filter((c) => c.unMember || EXPLICIT_CODES.has(c.cca3));

  // 3. Transform to Country, merge population from REST Countries, then overrides
  const fromWC: Country[] = filtered.map((c) => {
    const pop = populationByCca3.get(c.cca3);

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
      population: pop ?? 0,
      officialLanguages: mapLanguages(c.languages),
    };

    const override = patches.overrides[c.cca3];
    if (override) {
      Object.assign(country, override);
    }

    return country;
  });

  // 4. Merge manual additions (e.g. Kosovo, absent from world-countries)
  const result: Country[] = [...fromWC, ...patches.additions];

  // 5. Validate
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
  }

  // 6. Sort alphabetically by code (stable output across runs)
  result.sort((a, b) => a.code.localeCompare(b.code));

  // 7. Write
  const outPath = resolve(root, "src/features/countries/data/countries.json");
  writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf-8");
  console.log(`✓ ${result.length} countries → ${outPath}`);

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
