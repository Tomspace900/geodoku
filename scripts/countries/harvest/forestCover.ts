/**
 * Récolte la couverture forestière de la Banque mondiale (WDI
 * `AG.LND.FRST.ZS`) et écrit `scripts/countries/data/forestCover.ts`. Réseau
 * requis ; le résultat est committé, `build-countries` ne fait que le
 * fusionner (hors-ligne). Imprime le millésime à reporter dans
 * `content/sources.ts`.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { COUNTRY_FACTS } from "../../../content/countries/facts.ts";
import {
  buildForestCover,
  FOREST_AREA_CODE,
  forestVintage,
  renderForestCoverModule,
} from "./forestCoverLib.ts";
import { fetchWdiJson } from "./wdiFetch.ts";
import {
  buildIndicatorUrl,
  harvestWindow,
  parseWdiResponse,
} from "./worldBankIndicatorsLib.ts";

const OUTPUT_PATH = resolve(import.meta.dirname, "../data/forestCover.ts");

async function main(): Promise<void> {
  const window = harvestWindow(new Date().toISOString().slice(0, 10));
  const page = parseWdiResponse(
    await fetchWdiJson(buildIndicatorUrl(FOREST_AREA_CODE, window)),
    FOREST_AREA_CODE,
  );
  const snapshot = buildForestCover(page, Object.keys(COUNTRY_FACTS));
  writeFileSync(OUTPUT_PATH, renderForestCoverModule(snapshot));

  const vintage = forestVintage(snapshot);
  console.log(
    `[forest] ${FOREST_AREA_CODE} : année ${snapshot.referenceYear}, WDI mise à jour le ${snapshot.sourceUpdatedAt}.`,
  );
  console.log(
    `[forest] millésime à reporter dans content/sources.ts (fao_forest_resources.vintage) :\n  vintage: { fr: ${JSON.stringify(vintage.fr)}, en: ${JSON.stringify(vintage.en)} },`,
  );
}

await main();
