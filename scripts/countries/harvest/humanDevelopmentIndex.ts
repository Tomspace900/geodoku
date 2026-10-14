/**
 * Récolte l'indice de développement humain du PNUD (fichier CSV du data center,
 * édition et URL épinglées dans `humanDevelopmentIndexLib.ts`) et écrit
 * `scripts/countries/data/humanDevelopmentIndex.ts`. Réseau requis ; le
 * résultat est committé, `build-countries` ne fait que le fusionner
 * (hors-ligne).
 *
 * Le script imprime les `null` avec leur cause et le millésime à reporter dans
 * `content/sources.ts`.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { COUNTRY_FACTS } from "../../../content/countries/facts.ts";
import {
  buildSnapshot,
  decodeHdrCsv,
  editionVintageLabel,
  HDR_CSV_URL,
  HDR_DATA_YEAR,
  parseCsv,
  readHdrRows,
  renderHumanDevelopmentModule,
  validateCategoryAgainstPublished,
} from "./humanDevelopmentIndexLib.ts";

const OUTPUT_PATH = resolve(
  import.meta.dirname,
  "../data/humanDevelopmentIndex.ts",
);
const REQUEST_TIMEOUT_MS = 120_000;

async function main(): Promise<void> {
  const codes = Object.keys(COUNTRY_FACTS);
  const response = await fetch(HDR_CSV_URL, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`${HDR_CSV_URL}: HTTP ${response.status}`);

  const rows = readHdrRows(
    parseCsv(decodeHdrCsv(await response.arrayBuffer())),
    HDR_DATA_YEAR,
  );
  const harvestedAt = new Date().toISOString().slice(0, 10);
  const snapshot = buildSnapshot(rows, codes, harvestedAt);
  const categoryErrors = validateCategoryAgainstPublished(snapshot);
  if (categoryErrors.length > 0) throw new Error(categoryErrors.join("\n"));
  writeFileSync(OUTPUT_PATH, renderHumanDevelopmentModule(snapshot));

  const missing = Object.entries(snapshot.missing);
  console.log(
    `[hdi] ${Object.keys(snapshot.values).length}/${codes.length} pays (rapport ${snapshot.edition}, données ${snapshot.dataYear}), ${missing.length} null :`,
  );
  missing.forEach(([iso3, cause]) => {
    console.log(`  ${iso3} — ${cause}`);
  });
  const vintage = editionVintageLabel(snapshot);
  console.log(
    `[hdi] millésime à reporter dans content/sources.ts (undp_hdr.vintage) :\n  vintage: { fr: ${JSON.stringify(vintage.fr)}, en: ${JSON.stringify(vintage.en)} },`,
  );
}

await main();
