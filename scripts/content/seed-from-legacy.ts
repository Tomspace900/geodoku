/**
 * SEED ONE-SHOT — pivote `src/features/countries/data/countries.json` (source
 * historique) vers le snapshot `content/countries/`. Hors-ligne, aucun réseau.
 *
 * Supprimé à la fin de P1 (cf. docs/content-refactor-p1.md, étape 7) : la vraie
 * régénération vit dans `scripts/countries/build-countries.ts`.
 *
 *   pnpm exec tsx scripts/content/seed-from-legacy.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { serializeTypeScriptSnapshot } from "./typescriptSnapshot";

type LegacyCapital = {
  name: string;
  latitude: number;
  longitude: number;
  roles: string[];
};

type LegacyCountry = {
  iso3: string;
  iso2: string;
  names: { fr: string; en: string };
  aliases: string[];
  flagEmoji: string;
  continent: string;
  waterAccess: string;
  borders: string[];
  areaKm2: number;
  population: number;
  officialLanguages: string[];
  latitude: number;
  subregion: string;
  flagColors: string[];
  flagSymbols: string[];
  flagLayout: string[];
  events: string[];
  memberships: string[];
  capitals: LegacyCapital[];
  drivingSide: string;
  geoTags: string[];
  regime: string;
  physicalFeatures: string[];
  wikipediaMonthlyViews?: number;
  popularityIndex?: number;
};

const ROOT = resolve(import.meta.dirname, "..", "..");
const SEED_DATE = "2026-08-28";
const GENERATED_BY = "scripts/content/seed-from-legacy.ts";

function readLegacy(): LegacyCountry[] {
  const raw = readFileSync(
    resolve(ROOT, "src/features/countries/data/countries.json"),
    "utf8",
  );
  const countries = JSON.parse(raw) as LegacyCountry[];
  return [...countries].sort((a, b) => a.iso3.localeCompare(b.iso3));
}

function generatedHeader(): string {
  return `// @generated par ${GENERATED_BY} — ne pas éditer à la main.\n`;
}

function writeCountryCodes(countries: LegacyCountry[]): void {
  const codes = countries.map((c) => c.iso3);
  const body = [
    generatedHeader(),
    "export const COUNTRY_CODES = [",
    ...codes.map((code) => `  "${code}",`),
    "] as const;",
    "",
    "export type CountryCode = (typeof COUNTRY_CODES)[number];",
    "",
    "const COUNTRY_CODE_SET: ReadonlySet<string> = new Set(COUNTRY_CODES);",
    "",
    "export function isCountryCode(value: string): value is CountryCode {",
    "  return COUNTRY_CODE_SET.has(value);",
    "}",
    "",
  ].join("\n");
  writeFileSync(resolve(ROOT, "content/countries/countryCodes.ts"), body);
}

function writeCatalog(countries: LegacyCountry[]): void {
  const identities = countries.map((c) => ({
    iso2: c.iso2,
    iso3: c.iso3,
    names: c.names,
    aliases: c.aliases,
    flagEmoji: c.flagEmoji,
  }));
  const body =
    generatedHeader() +
    serializeTypeScriptSnapshot(identities, {
      typeName: "CountryCatalog",
      typeImportPath: "./type",
      exportName: "COUNTRY_CATALOG",
    });
  writeFileSync(resolve(ROOT, "content/countries/catalog.ts"), body);
}

function writeFacts(countries: LegacyCountry[]): void {
  const facts: Record<string, unknown> = {};
  for (const c of countries) {
    facts[c.iso3] = {
      continent: c.continent,
      waterAccess: c.waterAccess,
      borders: c.borders,
      areaKm2: c.areaKm2,
      population: c.population,
      officialLanguages: c.officialLanguages,
      latitude: c.latitude,
      subregion: c.subregion,
      flagColors: c.flagColors,
      flagSymbols: c.flagSymbols,
      flagLayout: c.flagLayout,
      events: c.events,
      memberships: c.memberships,
      capitals: c.capitals,
      drivingSide: c.drivingSide,
      geoTags: c.geoTags,
      regime: c.regime,
      physicalFeatures: c.physicalFeatures,
    };
  }
  const snapshot = {
    date: SEED_DATE,
    note: "seed initial pivoté du countries.json historique",
  };
  const body = [
    generatedHeader(),
    'import type { CountryFacts, CountryFactsSnapshot } from "./type";',
    'import type { CountryCode } from "./countryCodes";',
    "",
    `export const FACTS_SNAPSHOT: CountryFactsSnapshot = ${JSON.stringify(
      snapshot,
      null,
      2,
    )};`,
    "",
    `export const COUNTRY_FACTS: Record<CountryCode, CountryFacts> = ${JSON.stringify(
      facts,
      null,
      2,
    )};`,
    "",
  ].join("\n");
  writeFileSync(resolve(ROOT, "content/countries/facts.ts"), body);
}

function writePopularity(countries: LegacyCountry[]): void {
  const entries: Record<string, unknown> = {};
  for (const c of countries) {
    const rawPageviews = c.wikipediaMonthlyViews ?? null;
    entries[c.iso3] = {
      wikipediaTitle: c.names.en.replace(/ /g, "_"),
      rawPageviews,
      percentile: c.popularityIndex ?? 0.5,
      fallback:
        rawPageviews === null ? "legacy_raw_metric_not_persisted" : null,
    };
  }
  const snapshot = {
    schemaVersion: 1,
    snapshotId: "legacy-countries-json-pivot-2026-08-28",
    measurementPeriod: { startMonth: "2026-08", endMonth: "2026-08" },
    collectedAt: SEED_DATE,
    metric: "average_monthly_pageviews_all_access_user",
    algorithmVersion: "assignPopularity@legacy-countries-json",
    fallbackPercentile: 0.5,
    entries,
  };
  const body =
    generatedHeader() +
    serializeTypeScriptSnapshot(snapshot, {
      typeName: "CountryPopularitySnapshot",
      typeImportPath: "./type",
      exportName: "COUNTRY_POPULARITY",
    });
  writeFileSync(resolve(ROOT, "content/countries/popularity.ts"), body);
}

function main(): void {
  const countries = readLegacy();
  writeCountryCodes(countries);
  writeCatalog(countries);
  writeFacts(countries);
  writePopularity(countries);
  console.log(
    `Seed écrit : ${countries.length} pays → content/countries/{countryCodes,catalog,facts,popularity}.ts`,
  );
}

main();
