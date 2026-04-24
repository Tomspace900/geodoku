/**
 * Generates src/features/countries/data/countries.json
 *
 * Sources:
 * - world-countries npm (v5): name.common (EN), translations.fra.common (FR), cca2
 * - REST Countries v3.1 API: population + flags.alt (field=cca3,population,flags)
 * - scripts/prod/patches.json: overrides, additions, aliasOverrides, geo/events/political lists, flagOverrides
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
import type { Country } from "../../src/features/countries/types.ts";
import {
  type Patches,
  type RcEnrichRow,
  type RcEnrichment,
  assignPopularity,
  buildAliases,
  deriveContinent,
  deriveWaterAccess,
  gameplayArraysForCode,
  mapLanguages,
  mergeFlagFields,
  parseFlagFromAlt,
  physicalFeaturesForCode,
  rcEnrichmentMapFromRows,
  regimeForCode,
  toWikipediaTitle,
} from "./buildCountriesLib.ts";

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

// ─── Network ──────────────────────────────────────────────────────────────────

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

// ─── Main ─────────────────────────────────────────────────────────────────────

function latitudeFromWc(c: WCEntry): number {
  const lat = c.latlng?.[0];
  if (typeof lat !== "number" || !Number.isFinite(lat)) {
    throw new Error(`${c.cca3}: missing or invalid latlng`);
  }
  return lat;
}

async function main(): Promise<void> {
  const root = process.cwd();

  const rcByCca3 = await fetchRcEnrichment();

  // 1. Load patches
  const patches = JSON.parse(
    readFileSync(resolve(root, "scripts/prod/patches.json"), "utf-8"),
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
      regime: regimeForCode(c.cca3, patches),
      physicalFeatures: physicalFeaturesForCode(c.cca3, patches),
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
    merged.regime = regimeForCode(merged.code, patches);
    merged.physicalFeatures = physicalFeaturesForCode(merged.code, patches);
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
    if (c.regime !== "monarchy" && c.regime !== "republic") {
      throw new Error(
        `${c.code}: regime must be "monarchy" or "republic" (got "${String(c.regime)}")`,
      );
    }
    if (!Array.isArray(c.physicalFeatures)) {
      throw new Error(`${c.code}: physicalFeatures must be an array`);
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
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
