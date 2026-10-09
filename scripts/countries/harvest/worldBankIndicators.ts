/**
 * Récolte le PIB par habitant et l'espérance de vie de la Banque mondiale (API
 * WDI) et écrit `scripts/countries/data/worldBankIndicators.ts`. Réseau requis ;
 * le résultat est committé, `build-countries` ne fait que le fusionner
 * (hors-ligne).
 *
 * Une page suffit (`per_page=20000`) mais l'API met 35 à 40 s par indicateur :
 * les deux requêtes partent en parallèle, avec un délai large et quelques
 * reprises. Le script imprime les `null` par indicateur (avec leur cause) et
 * les plages d'années à reporter dans `content/sources.ts`.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { COUNTRY_FACTS } from "../../../content/countries/facts.ts";
import type { WorldBankIndicatorsSnapshot } from "../data/types.ts";
import {
  buildIndicator,
  buildIndicatorUrl,
  GDP_PER_CAPITA_CODE,
  harvestWindow,
  LIFE_EXPECTANCY_CODE,
  parseWdiResponse,
  renderWorldBankModule,
  yearRangeLabel,
} from "./worldBankIndicatorsLib.ts";

const OUTPUT_PATH = resolve(
  import.meta.dirname,
  "../data/worldBankIndicators.ts",
);
const REQUEST_TIMEOUT_MS = 180_000;
const MAX_ATTEMPTS = 3;

async function fetchJson(url: string): Promise<unknown> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      if (attempt >= MAX_ATTEMPTS) throw new Error(`${url}: ${error}`);
      console.error(
        `[worldBank] tentative ${attempt} échouée (${error}), reprise…`,
      );
    }
  }
}

async function main(): Promise<void> {
  const codes = Object.keys(COUNTRY_FACTS);
  const harvestedAt = new Date().toISOString().slice(0, 10);
  const window = harvestWindow(harvestedAt);

  const [gdpJson, lifeJson] = await Promise.all(
    [GDP_PER_CAPITA_CODE, LIFE_EXPECTANCY_CODE].map((code) =>
      fetchJson(buildIndicatorUrl(code, window)),
    ),
  );
  const snapshot: WorldBankIndicatorsSnapshot = {
    harvestedAt,
    gdpPerCapita: buildIndicator(
      GDP_PER_CAPITA_CODE,
      parseWdiResponse(gdpJson, GDP_PER_CAPITA_CODE),
      codes,
      window,
    ),
    lifeExpectancy: buildIndicator(
      LIFE_EXPECTANCY_CODE,
      parseWdiResponse(lifeJson, LIFE_EXPECTANCY_CODE),
      codes,
      window,
    ),
  };
  writeFileSync(OUTPUT_PATH, renderWorldBankModule(snapshot));

  const entries = [
    ["world_bank_gdp_per_capita", snapshot.gdpPerCapita],
    ["world_bank_life_expectancy", snapshot.lifeExpectancy],
  ] as const;
  entries.forEach(([sourceId, indicator]) => {
    const missing = Object.entries(indicator.missing);
    console.log(
      `[worldBank] ${indicator.code} : ${Object.keys(indicator.values).length}/${codes.length} pays (WDI mise à jour le ${indicator.sourceUpdatedAt}), ${missing.length} null :`,
    );
    missing.forEach(([iso3, cause]) => {
      console.log(`  ${iso3} — ${cause}`);
    });
    const range = yearRangeLabel(indicator);
    console.log(
      `[worldBank] plage à reporter dans content/sources.ts (${sourceId}.vintage) :\n  vintage: { fr: ${JSON.stringify(range.fr)}, en: ${JSON.stringify(range.en)} },`,
    );
  });
}

await main();
