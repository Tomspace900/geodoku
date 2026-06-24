/**
 * Generates src/features/countries/data/countries.json
 *
 * Sources:
 * - world-countries npm (v5): name.common (EN), translations.fra.common (FR), cca2
 * - REST Countries v5 API: population + factual enrichments
 * - scripts/prod/flagData.json: curated flagColors / flagSymbols / flagLayout (truth table)
 * - scripts/prod/countryPatches.ts: source corrections, search aliases, gameplay classifications, additions
 *
 * Name localisation strategy:
 * - EN: world-countries `name.common` (authoritative English name)
 * - FR: world-countries `translations.fra.common` (ISO 639-3 "fra" = French)
 *   Fallback: EN name when no FR translation is available.
 *
 * Alias generation: REST official/alternate names + searchAliasesByIso3 from countryPatches.ts.
 *
 * Run: pnpm build:countries (requires network for population fetch)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import rawWorldCountries from "world-countries";
import type {
  CapitalRole,
  Country,
  CountryCapital,
  DrivingSide,
  PoliticalGroup,
} from "../../src/features/countries/types.ts";
import {
  type FlagData,
  type RcEnrichRow,
  type RcEnrichment,
  applySourceCorrections,
  assignPopularity,
  buildAliases,
  deriveContinent,
  deriveWaterAccess,
  flagFieldsForCode,
  gameplayArraysForCode,
  mapLanguages,
  physicalFeaturesForCode,
  rcEnrichmentMapFromRows,
  regimeForCode,
  toWikipediaTitle,
} from "./buildCountriesLib.ts";
import { countryPatches } from "./countryPatches.ts";

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

const REST_COUNTRIES_BASE_URL = "https://api.restcountries.com/countries/v5";
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

/** If more than this many countries fail the pageviews API, abort (incomplete JSON leak). */
const MAX_MISSING_PAGEVIEWS = 2;

/** Throttle between Wikimedia pageview requests (avoids burst 429 rate limits). */
const PAGEVIEW_REQUEST_GAP_MS = 250;

// ─── Network ──────────────────────────────────────────────────────────────────

type RestCountriesV5Object = Record<string, unknown>;

type RestCountriesV5Response = {
  data?: {
    objects?: RestCountriesV5Object[];
    meta?: {
      more?: boolean;
      offset?: number;
      limit?: number;
      total?: number;
    };
  };
  errors?: Array<{ message?: string }>;
};

const REST_COUNTRIES_FIELDS = [
  "codes.alpha_2",
  "codes.alpha_3",
  "names.official",
  "names.alternates",
  "capitals",
  "cars.driving_side",
  "memberships.eu",
  "memberships.eurozone",
  "memberships.schengen",
  "memberships.g20",
  "memberships.g7",
  "memberships.nato",
  "memberships.commonwealth",
  "memberships.oecd",
  "memberships.brics",
  "memberships.opec",
  "memberships.asean",
  "memberships.african_union",
  "memberships.arab_league",
  "borders",
  "landlocked",
  "population",
];

const MEMBERSHIP_FIELD_TO_GROUP: Array<{
  field: string;
  group: PoliticalGroup;
}> = [
  { field: "arab_league", group: "arab_league" },
  { field: "asean", group: "asean" },
  { field: "brics", group: "brics" },
  { field: "commonwealth", group: "commonwealth" },
  { field: "eu", group: "eu" },
  { field: "eurozone", group: "eurozone" },
  { field: "g20", group: "g20" },
  { field: "g7", group: "g7" },
  { field: "nato", group: "nato" },
  { field: "oecd", group: "oecd" },
  { field: "opec", group: "opec" },
  { field: "schengen", group: "schengen" },
  { field: "african_union", group: "african_union" },
];

const CAPITAL_ROLE_KEYS: CapitalRole[] = [
  "administrative",
  "constitutional",
  "executive",
  "judicial",
  "legislative",
  "primary",
];

function readStringField(
  obj: RestCountriesV5Object,
  dottedKey: string,
  nestedKey: string,
): string | undefined {
  const direct = obj[dottedKey];
  if (typeof direct === "string") return direct;

  const [parent, child] = nestedKey.split(".");
  if (!parent || !child) return undefined;
  const parentValue = obj[parent];
  if (parentValue && typeof parentValue === "object" && child in parentValue) {
    const nested = (parentValue as Record<string, unknown>)[child];
    return typeof nested === "string" ? nested : undefined;
  }

  return undefined;
}

function readBooleanField(
  obj: RestCountriesV5Object,
  dottedKey: string,
  nestedKey: string,
): boolean | undefined {
  const direct = obj[dottedKey];
  if (typeof direct === "boolean") return direct;

  const [parent, child] = nestedKey.split(".");
  if (!parent || !child) return undefined;
  const parentValue = obj[parent];
  if (parentValue && typeof parentValue === "object" && child in parentValue) {
    const nested = (parentValue as Record<string, unknown>)[child];
    return typeof nested === "boolean" ? nested : undefined;
  }

  return undefined;
}

function readStringArrayField(
  obj: RestCountriesV5Object,
  dottedKey: string,
  nestedKey: string,
): string[] {
  const direct = obj[dottedKey];
  if (Array.isArray(direct)) {
    return direct.filter((item): item is string => typeof item === "string");
  }

  const [parent, child] = nestedKey.split(".");
  if (!parent || !child) return [];
  const parentValue = obj[parent];
  if (parentValue && typeof parentValue === "object" && child in parentValue) {
    const nested = (parentValue as Record<string, unknown>)[child];
    if (Array.isArray(nested)) {
      return nested.filter((item): item is string => typeof item === "string");
    }
  }

  return [];
}

function readNumberField(
  obj: RestCountriesV5Object,
  dottedKey: string,
  nestedKey: string,
): number | undefined {
  const direct = obj[dottedKey];
  if (typeof direct === "number") return direct;

  const [parent, child] = nestedKey.split(".");
  if (!parent || !child) return undefined;
  const parentValue = obj[parent];
  if (parentValue && typeof parentValue === "object" && child in parentValue) {
    const nested = (parentValue as Record<string, unknown>)[child];
    return typeof nested === "number" ? nested : undefined;
  }

  return undefined;
}

function readObjectArrayField(
  obj: RestCountriesV5Object,
  field: string,
): RestCountriesV5Object[] {
  const direct = obj[field];
  if (!Array.isArray(direct)) return [];
  return direct.filter(
    (item): item is RestCountriesV5Object =>
      item !== null && typeof item === "object",
  );
}

function capitalFromV5Object(
  rawCapital: RestCountriesV5Object,
): CountryCapital | null {
  const name = rawCapital.name;
  const coordinates = rawCapital.coordinates;
  const attributes = rawCapital.attributes;
  if (
    typeof name !== "string" ||
    !coordinates ||
    typeof coordinates !== "object"
  ) {
    return null;
  }

  const coordinateMap = coordinates as Record<string, unknown>;
  const latitude = coordinateMap.lat;
  const longitude = coordinateMap.lng;
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return null;
  }

  const attributeMap =
    attributes && typeof attributes === "object"
      ? (attributes as Record<string, unknown>)
      : {};
  const roles = CAPITAL_ROLE_KEYS.filter((role) => attributeMap[role] === true);

  return { name, latitude, longitude, roles };
}

function drivingSideFromString(
  value: string | undefined,
): DrivingSide | undefined {
  return value === "left" || value === "right" ? value : undefined;
}

function rcRowFromV5Object(obj: RestCountriesV5Object): RcEnrichRow | null {
  const cca3 = readStringField(obj, "codes.alpha_3", "codes.alpha_3");
  const iso2 = readStringField(obj, "codes.alpha_2", "codes.alpha_2");
  const population = readNumberField(obj, "population", "population");
  if (!cca3 || typeof population !== "number") return null;
  const officialName = readStringField(obj, "names.official", "names.official");
  const alternateNames = readStringArrayField(
    obj,
    "names.alternates",
    "names.alternates",
  );
  const capitals = readObjectArrayField(obj, "capitals")
    .map(capitalFromV5Object)
    .filter((capital): capital is CountryCapital => capital !== null);
  const drivingSide = drivingSideFromString(
    readStringField(obj, "cars.driving_side", "cars.driving_side"),
  );
  const memberships = MEMBERSHIP_FIELD_TO_GROUP.flatMap(({ field, group }) =>
    readBooleanField(obj, `memberships.${field}`, `memberships.${field}`)
      ? [group]
      : [],
  );
  const borders = readStringArrayField(obj, "borders", "borders");
  const landlocked = readBooleanField(obj, "landlocked", "landlocked");

  return {
    cca3,
    iso2,
    population,
    officialName,
    alternateNames,
    capitals,
    drivingSide,
    memberships,
    borders,
    landlocked,
  };
}

function restCountriesAuthHeader(): string {
  const apiKey = process.env.REST_COUNTRIES_API_KEY;
  if (!apiKey) {
    throw new Error(
      "REST_COUNTRIES_API_KEY is required. Add it to .env.local or the shell environment.",
    );
  }
  return `Bearer ${apiKey}`;
}

async function fetchRcEnrichment(): Promise<Map<string, RcEnrichment>> {
  const authHeader = restCountriesAuthHeader();
  const rows: RcEnrichRow[] = [];
  const limit = 100;
  let offset = 0;

  while (true) {
    const url = new URL(REST_COUNTRIES_BASE_URL);
    url.searchParams.set("response_fields", REST_COUNTRIES_FIELDS.join(","));
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));

    const res = await fetch(url, {
      headers: { Authorization: authHeader },
    });
    const payload = (await res.json()) as RestCountriesV5Response;

    if (!res.ok) {
      const message =
        payload.errors?.map((error) => error.message).join("; ") ??
        res.statusText;
      throw new Error(`REST Countries failed: ${res.status} ${message}`);
    }

    const objects = payload.data?.objects ?? [];
    for (const obj of objects) {
      const row = rcRowFromV5Object(obj);
      if (row) rows.push(row);
    }

    if (objects.length === 0 || payload.data?.meta?.more !== true) break;
    offset += payload.data.meta.limit ?? limit;
  }

  if (rows.length === 0) {
    throw new Error("REST Countries: expected non-empty data.objects");
  }
  return rcEnrichmentMapFromRows(rows);
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

type CountryPageviewFailure = {
  iso3: string;
  title: string;
  reason: string;
};

async function fetchCountryPageviews(
  title: string,
  range: { start: string; end: string },
): Promise<
  | { kind: "ok"; views: number }
  | { kind: "not_found" }
  | { kind: "exhausted"; detail: string }
> {
  const article = encodeURIComponent(title);
  const url = `${WIKIPEDIA_PAGEVIEWS_API}/${article}/monthly/${range.start}/${range.end}`;
  const maxRetries = 8;
  let lastNonOkDetail = "";

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Geodoku/0.1 (country popularity calibration)",
      },
    });

    if (response.status === 404) {
      return { kind: "not_found" };
    }

    const backoffMs = 250 * 2 ** attempt;

    if (response.status === 429) {
      if (attempt === maxRetries) {
        return { kind: "exhausted", detail: "HTTP 429 after retries" };
      }
      const retryAfter = response.headers.get("retry-after");
      const fromHeaderSec = retryAfter
        ? Number.parseFloat(retryAfter)
        : Number.NaN;
      const fromHeaderMs =
        Number.isFinite(fromHeaderSec) && fromHeaderSec > 0
          ? fromHeaderSec * 1000
          : 0;
      const waitMs = Math.min(
        120_000,
        Math.max(fromHeaderMs, 1000 * 2 ** attempt),
      );
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      continue;
    }

    const waitMs = backoffMs;

    if (!response.ok) {
      lastNonOkDetail = `HTTP ${response.status} ${response.statusText}`;
      if (attempt === maxRetries) {
        return {
          kind: "exhausted",
          detail: `${lastNonOkDetail} after retries`,
        };
      }
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      continue;
    }

    let text: string;
    try {
      text = await response.text();
    } catch (e) {
      lastNonOkDetail = `read body: ${e instanceof Error ? e.message : String(e)}`;
      if (attempt === maxRetries) {
        return { kind: "exhausted", detail: lastNonOkDetail };
      }
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      if (attempt === maxRetries) {
        return {
          kind: "exhausted",
          detail: "JSON parse failure after retries",
        };
      }
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      continue;
    }

    const payload = parsed as {
      items?: Array<{ views: number }>;
    };

    if (!payload.items || payload.items.length === 0) {
      if (attempt === maxRetries) {
        return {
          kind: "exhausted",
          detail: "empty items payload after retries",
        };
      }
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      continue;
    }

    const total = payload.items.reduce((sum, item) => sum + item.views, 0);
    return {
      kind: "ok",
      views: Math.round(total / payload.items.length),
    };
  }

  return { kind: "exhausted", detail: "unexpected loop exit" };
}

async function fetchPageviewsByCountryCode(
  countries: Country[],
  wikiTitles: Record<string, string>,
): Promise<{
  pageviews: Map<string, number>;
  failures: CountryPageviewFailure[];
}> {
  const range = getWikipediaRange();
  const pageviews = new Map<string, number>();
  const failures: CountryPageviewFailure[] = [];

  for (let i = 0; i < countries.length; i++) {
    const country = countries[i];
    const customTitle = wikiTitles[country.iso3];
    const canonical = country.names?.en ?? country.names?.fr ?? country.iso3;
    const title = customTitle ?? toWikipediaTitle(canonical);
    const outcome = await fetchCountryPageviews(title, range);

    if (outcome.kind === "ok") {
      pageviews.set(country.iso3, outcome.views);
    } else if (outcome.kind === "not_found") {
      failures.push({
        iso3: country.iso3,
        title,
        reason: "404 (article not found or no metrics)",
      });
    } else {
      failures.push({
        iso3: country.iso3,
        title,
        reason: outcome.detail,
      });
    }

    if (i + 1 < countries.length) {
      await new Promise((resolve) =>
        setTimeout(resolve, PAGEVIEW_REQUEST_GAP_MS),
      );
    }
  }

  return { pageviews, failures };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function latitudeFromWc(c: WCEntry): number {
  const lat = c.latlng?.[0];
  if (typeof lat !== "number" || !Number.isFinite(lat)) {
    throw new Error(`${c.cca3}: missing or invalid latlng`);
  }
  return lat;
}

function formatCodes(codes: string[]): string {
  return codes.length > 0 ? codes.join(", ") : "none";
}

function sameCodeSet(a: string[], b: string[]): boolean {
  const left = [...a].sort((x, y) => x.localeCompare(y));
  const right = [...b].sort((x, y) => x.localeCompare(y));
  return (
    left.length === right.length &&
    left.every((code, index) => code === right[index])
  );
}

function auditSourceCorrectionDifferences(
  rcByCca3: Map<string, RcEnrichment>,
  playableCodes: Set<string>,
): string[] {
  const differences: string[] = [];
  for (const [code, correction] of Object.entries(
    countryPatches.sourceCorrectionsByIso3,
  )) {
    if (!playableCodes.has(code) || !correction.borders) continue;
    const apiBorders = rcByCca3.get(code)?.borders;
    if (!apiBorders) {
      differences.push(`${code} borders correction: no REST Countries borders`);
      continue;
    }
    if (!sameCodeSet(correction.borders, apiBorders)) {
      differences.push(
        `${code} borders correction differs: curated [${formatCodes([...correction.borders].sort())}], api [${formatCodes([...apiBorders].sort())}]`,
      );
    }
  }

  return differences;
}

function requireRestEnrichment(
  code: string,
  rcByCca3: Map<string, RcEnrichment>,
): RcEnrichment {
  const rc = rcByCca3.get(code);
  if (!rc) {
    throw new Error(
      `${code}: missing complete REST Countries enrichment (iso2, population, drivingSide, memberships)`,
    );
  }
  return rc;
}

async function main(): Promise<void> {
  const root = process.cwd();

  const rcByCca3 = await fetchRcEnrichment();

  const { gameplayClassifications } = countryPatches;
  const wikiTitles = countryPatches.wikipediaTitlesByIso3;

  // 1. Load curated flag truth table
  const flagData = JSON.parse(
    readFileSync(resolve(root, "scripts/prod/flagData.json"), "utf-8"),
  ) as FlagData;

  // 2. Filter world-countries to UN members + explicit inclusions
  const wc = rawWorldCountries as unknown as WCEntry[];
  const filtered = wc.filter((c) => c.unMember || EXPLICIT_CODES.has(c.cca3));
  const playableCodes = new Set([
    ...filtered.map((c) => c.cca3),
    ...countryPatches.manualCountryAdditions.map((add) => add.iso3),
  ]);

  const sourceCorrectionDiffs = auditSourceCorrectionDifferences(
    rcByCca3,
    playableCodes,
  );
  if (sourceCorrectionDiffs.length > 0) {
    console.warn("REST Countries differs from curated source corrections:");
    for (const diff of sourceCorrectionDiffs) {
      console.warn(`  ${diff}`);
    }
  } else {
    console.log("✓ REST Countries source correction audit: no differences");
  }

  // 3. Transform to Country, merge REST Countries + gameplay fields, then corrections
  const fromWC: Country[] = filtered.map((c) => {
    const rc = requireRestEnrichment(c.cca3, rcByCca3);
    const pop = rc.population;
    const { flagColors, flagSymbols, flagLayout } = flagFieldsForCode(
      c.cca3,
      flagData,
    );
    const gameplay = gameplayArraysForCode(c.cca3, gameplayClassifications, rc);

    const nameEn = c.name.common;
    const nameFr = c.translations.fra?.common ?? nameEn;

    const searchAliases = countryPatches.searchAliasesByIso3[c.cca3];
    const aliases = buildAliases([
      ...(rc.officialName ? [rc.officialName] : []),
      ...(rc.alternateNames ?? []),
      ...(searchAliases ?? []),
    ]);

    const country: Country = {
      iso3: c.cca3,
      iso2: rc.iso2,
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
      flagLayout,
      events: gameplay.events,
      memberships: rc.memberships,
      capitals: rc.capitals,
      drivingSide: rc.drivingSide,
      geoTags: gameplay.geoTags,
      regime: regimeForCode(c.cca3, gameplayClassifications),
      physicalFeatures: physicalFeaturesForCode(
        c.cca3,
        gameplayClassifications,
      ),
    };

    applySourceCorrections(
      country,
      countryPatches.sourceCorrectionsByIso3[c.cca3],
    );

    return country;
  });

  // 4. Merge manual additions (e.g. Kosovo, absent from world-countries).
  const additions: Country[] = countryPatches.manualCountryAdditions.map(
    (add) => {
      const merged: Country = { ...add };
      const rc = rcByCca3.get(merged.iso3);
      if (rc) {
        if (merged.population <= 0) merged.population = rc.population;
        merged.iso2 = rc.iso2;
        merged.capitals = rc.capitals;
        merged.drivingSide = rc.drivingSide;
        merged.memberships = rc.memberships;
      }
      const g = gameplayArraysForCode(merged.iso3, gameplayClassifications, {
        iso2: merged.iso2,
        population: merged.population,
        alternateNames: [],
        capitals: merged.capitals,
        drivingSide: merged.drivingSide,
        memberships: merged.memberships,
      });
      merged.events = g.events;
      merged.geoTags = g.geoTags;
      merged.regime = regimeForCode(merged.iso3, gameplayClassifications);
      merged.physicalFeatures = physicalFeaturesForCode(
        merged.iso3,
        gameplayClassifications,
      );
      return merged;
    },
  );

  const result: Country[] = [...fromWC, ...additions];

  // 5. Enrich with Wikipedia pageviews-based popularity index
  const { pageviews: pageviewsByCode, failures: pageviewFailures } =
    await fetchPageviewsByCountryCode(result, wikiTitles);

  if (pageviewFailures.length > 0) {
    console.warn("Wikipedia pageviews missing or failed:");
    for (const f of pageviewFailures) {
      console.warn(`  ${f.iso3} (${f.title}): ${f.reason}`);
    }
  }

  if (pageviewFailures.length > MAX_MISSING_PAGEVIEWS) {
    throw new Error(
      `Too many countries without Wikipedia pageviews: ${pageviewFailures.length} (max ${MAX_MISSING_PAGEVIEWS}). Fix network or wikiTitles, then retry.`,
    );
  }

  assignPopularity(result, pageviewsByCode);

  // 6. Validate
  if (result.length !== EXPECTED_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_COUNT} countries, got ${result.length}`,
    );
  }

  const seenCodes = new Set<string>();
  for (const c of result) {
    if (!/^[A-Z]{3}$/.test(c.iso3)) {
      throw new Error(`Invalid iso3: "${c.iso3}"`);
    }
    if (!/^[A-Z]{2}$/.test(c.iso2)) {
      throw new Error(`${c.iso3}: invalid iso2 "${c.iso2}"`);
    }
    if (seenCodes.has(c.iso3)) {
      throw new Error(`Duplicate iso3: "${c.iso3}"`);
    }
    seenCodes.add(c.iso3);
    if (!c.flagEmoji) {
      throw new Error(`${c.iso3}: missing flagEmoji`);
    }
    if (!c.names?.fr || !c.names?.en) {
      throw new Error(`${c.iso3}: missing names.fr or names.en`);
    }
    if (c.areaKm2 <= 0) {
      throw new Error(`${c.iso3}: areaKm2 must be > 0 (got ${c.areaKm2})`);
    }
    if (!Number.isFinite(c.population) || c.population <= 0) {
      throw new Error(
        `${c.iso3}: population must be a finite number > 0 (got ${c.population})`,
      );
    }
    if (c.officialLanguages.length === 0) {
      throw new Error(`${c.iso3}: no officialLanguages`);
    }
    for (const border of c.borders) {
      if (!/^[A-Z]{2,3}$/.test(border)) {
        throw new Error(`${c.iso3}: invalid border code "${border}"`);
      }
    }
    if (!Number.isFinite(c.latitude) || c.latitude < -90 || c.latitude > 90) {
      throw new Error(`${c.iso3}: invalid latitude ${c.latitude}`);
    }
    if (typeof c.subregion !== "string") {
      throw new Error(`${c.iso3}: subregion must be a string`);
    }
    if (!Array.isArray(c.flagColors) || c.flagColors.length === 0) {
      throw new Error(
        `${c.iso3}: flagColors must be non-empty (fix scripts/prod/flagData.json)`,
      );
    }
    if (!Array.isArray(c.flagSymbols)) {
      throw new Error(`${c.iso3}: flagSymbols must be an array`);
    }
    if (!Array.isArray(c.flagLayout)) {
      throw new Error(`${c.iso3}: flagLayout must be an array`);
    }
    if (!Array.isArray(c.events)) {
      throw new Error(`${c.iso3}: events must be an array`);
    }
    if (!Array.isArray(c.memberships)) {
      throw new Error(`${c.iso3}: memberships must be an array`);
    }
    if (!Array.isArray(c.capitals)) {
      throw new Error(`${c.iso3}: capitals must be an array`);
    }
    for (const capital of c.capitals) {
      if (!capital.name) {
        throw new Error(`${c.iso3}: capital missing name`);
      }
      if (
        !Number.isFinite(capital.latitude) ||
        capital.latitude < -90 ||
        capital.latitude > 90
      ) {
        throw new Error(`${c.iso3}: invalid capital latitude`);
      }
      if (
        !Number.isFinite(capital.longitude) ||
        capital.longitude < -180 ||
        capital.longitude > 180
      ) {
        throw new Error(`${c.iso3}: invalid capital longitude`);
      }
      if (!Array.isArray(capital.roles)) {
        throw new Error(`${c.iso3}: capital roles must be an array`);
      }
    }
    if (c.drivingSide !== "left" && c.drivingSide !== "right") {
      throw new Error(`${c.iso3}: invalid drivingSide "${c.drivingSide}"`);
    }
    if (!Array.isArray(c.geoTags)) {
      throw new Error(`${c.iso3}: geoTags must be an array`);
    }
    if (c.regime !== "monarchy" && c.regime !== "republic") {
      throw new Error(
        `${c.iso3}: regime must be "monarchy" or "republic" (got "${String(c.regime)}")`,
      );
    }
    if (!Array.isArray(c.physicalFeatures)) {
      throw new Error(`${c.iso3}: physicalFeatures must be an array`);
    }
  }

  // 7. Sort alphabetically by code (stable output across runs)
  result.sort((a, b) => a.iso3.localeCompare(b.iso3));

  // 8. Write
  const outPath = resolve(root, "src/features/countries/data/countries.json");
  writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf-8");
  console.log(`✓ ${result.length} countries → ${outPath}`);
  console.log(
    `✓ Wikipedia popularity: ${pageviewsByCode.size} fetched, ${pageviewFailures.length} median fallback`,
  );
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
