/**
 * Sérialise un tableau de `CountryRecord` (forme complète, en mémoire) vers les
 * quatre modules `content/countries/` : identité (`catalog`), codes
 * (`countryCodes`), faits gameplay (`facts`) et snapshot de popularité
 * (`popularity`).
 *
 * Partagé par la régénération réseau (`scripts/countries/build-countries.ts`) et
 * le seed hors-ligne. Aucun appel réseau ici.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { CountryRecord } from "../../content/countries/type";
import { serializeTypeScriptSnapshot } from "./typescriptSnapshot";

export type PopularityMeta = Readonly<{
  snapshotId: string;
  measurementPeriod: Readonly<{ startMonth: string; endMonth: string }>;
  collectedAt: string;
  algorithmVersion: string;
}>;

export type EmitOptions = Readonly<{
  /** Racine du dépôt : les fichiers sont écrits sous `<root>/content/countries/`. */
  root: string;
  /** `FACTS_SNAPSHOT.date` (YYYY-MM-DD). */
  snapshotDate: string;
  /** `FACTS_SNAPSHOT.note`. */
  snapshotNote: string;
  popularity: PopularityMeta;
  /** Ligne d'en-tête `// @generated par <…>`. */
  generatedBy: string;
}>;

const FACT_KEYS = [
  "continent",
  "waterAccess",
  "borders",
  "areaKm2",
  "population",
  "officialLanguages",
  "latitude",
  "subregion",
  "flagColors",
  "flagSymbols",
  "flagLayout",
  "events",
  "memberships",
  "capitals",
  "drivingSide",
  "geoTags",
  "regime",
  "physicalFeatures",
] as const;

function sortByIso3(records: readonly CountryRecord[]): CountryRecord[] {
  return [...records].sort((a, b) => a.iso3.localeCompare(b.iso3));
}

function header(generatedBy: string): string {
  return `// @generated par ${generatedBy} — ne pas éditer à la main.\n`;
}

export function writeCountrySnapshot(
  records: readonly CountryRecord[],
  options: EmitOptions,
): void {
  const sorted = sortByIso3(records);
  const dir = resolve(options.root, "content", "countries");
  const head = header(options.generatedBy);

  // countryCodes.ts
  writeFileSync(
    resolve(dir, "countryCodes.ts"),
    [
      head,
      "export const COUNTRY_CODES = [",
      ...sorted.map((c) => `  "${c.iso3}",`),
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
    ].join("\n"),
  );

  // catalog.ts — identité seule
  const identities = sorted.map((c) => ({
    iso2: c.iso2,
    iso3: c.iso3,
    names: c.names,
    aliases: c.aliases,
    flagEmoji: c.flagEmoji,
  }));
  writeFileSync(
    resolve(dir, "catalog.ts"),
    head +
      serializeTypeScriptSnapshot(identities, {
        typeName: "CountryCatalog",
        typeImportPath: "./type",
        exportName: "COUNTRY_CATALOG",
      }),
  );

  // facts.ts — faits gameplay
  const facts: Record<string, unknown> = {};
  for (const c of sorted) {
    const record = c as unknown as Record<string, unknown>;
    facts[c.iso3] = Object.fromEntries(
      FACT_KEYS.map((key) => [key, record[key]]),
    );
  }
  writeFileSync(
    resolve(dir, "facts.ts"),
    [
      head,
      'import type { CountryCode } from "./countryCodes";',
      'import type { CountryFacts, CountryFactsSnapshot } from "./type";',
      "",
      `export const FACTS_SNAPSHOT: CountryFactsSnapshot = ${JSON.stringify(
        { date: options.snapshotDate, note: options.snapshotNote },
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
    ].join("\n"),
  );

  // popularity.ts — snapshot Wikipédia. `percentile` = `popularityIndex` (0..1),
  // médiane (0,5) si absent ; `rawPageviews` = vues mensuelles quand connues.
  const entries: Record<string, unknown> = {};
  for (const c of sorted) {
    const rawPageviews = c.wikipediaMonthlyViews ?? null;
    entries[c.iso3] = {
      wikipediaTitle: c.names.en.replace(/ /g, "_"),
      rawPageviews,
      percentile: c.popularityIndex ?? 0.5,
      fallback:
        rawPageviews === null ? "legacy_raw_metric_not_persisted" : null,
    };
  }
  writeFileSync(
    resolve(dir, "popularity.ts"),
    head +
      serializeTypeScriptSnapshot(
        {
          schemaVersion: 1,
          snapshotId: options.popularity.snapshotId,
          measurementPeriod: options.popularity.measurementPeriod,
          collectedAt: options.popularity.collectedAt,
          metric: "average_monthly_pageviews_all_access_user",
          algorithmVersion: options.popularity.algorithmVersion,
          fallbackPercentile: 0.5,
          entries,
        },
        {
          typeName: "CountryPopularitySnapshot",
          typeImportPath: "./type",
          exportName: "COUNTRY_POPULARITY",
        },
      ),
  );
}
