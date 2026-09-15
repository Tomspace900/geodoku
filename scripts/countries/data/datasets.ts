/**
 * Point de montage unique des datasets quantitatifs curés.
 *
 * Deux consommateurs, volontairement branchés sur la **même** constante :
 * `build-countries` (qui les fusionne dans `content/countries/facts.ts` via
 * `quantitativeFactsForCode`) et la garde de fraîcheur `validateDatasetFacts`
 * (`pnpm check:content`). Deux assemblages séparés dériveraient : la garde
 * finirait par valider un snapshot que le build ne produit plus.
 */
import type { QuantitativeDatasets } from "../buildCountriesLib";
import { AGRICULTURAL_PRODUCTION } from "./agriculturalProduction";
import { CIVIL_TIME_OFFSETS } from "./civilTimeOffsets";
import { COAL_ELECTRICITY } from "./coalElectricity";
import { ENERGY_PRODUCTION } from "./energyProduction";
import { FOREST_COVER } from "./forestCover";
import { HOLOCENE_VOLCANOES } from "./holoceneVolcanoes";
import { MOUNTAIN_AREAS } from "./mountainArea";
import { SOVEREIGNTY } from "./sovereignty";
import { URBAN_CENTRES } from "./urbanCentres";

export const QUANTITATIVE_DATASETS: QuantitativeDatasets = {
  civilTimeOffsets: CIVIL_TIME_OFFSETS,
  holoceneVolcanoes: HOLOCENE_VOLCANOES,
  mountainArea: MOUNTAIN_AREAS,
  forestCover: FOREST_COVER,
  urbanCentres: URBAN_CENTRES,
  agriculturalProduction: AGRICULTURAL_PRODUCTION,
  energyProduction: ENERGY_PRODUCTION,
  coalElectricity: COAL_ELECTRICITY,
  sovereignty: SOVEREIGNTY,
};
