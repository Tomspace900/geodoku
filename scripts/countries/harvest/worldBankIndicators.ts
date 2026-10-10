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
import { fetchWdiJson } from "./wdiFetch.ts";
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

async function main(): Promise<void> {
  const codes = Object.keys(COUNTRY_FACTS);
  const harvestedAt = new Date().toISOString().slice(0, 10);
  const window = harvestWindow(harvestedAt);

  const [gdpJson, lifeJson] = await Promise.all(
    [GDP_PER_CAPITA_CODE, LIFE_EXPECTANCY_CODE].map((code) =>
      fetchWdiJson(buildIndicatorUrl(code, window)),
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
