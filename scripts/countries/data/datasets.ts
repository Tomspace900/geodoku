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
import { EVENT_EDITIONS } from "./eventEditions";
import { FOREST_COVER } from "./forestCover";
import { HIGHEST_POINTS } from "./highestPoints";
import { HISTORICAL_DOMINATIONS } from "./historicalDominations";
import { HOLOCENE_VOLCANOES } from "./holoceneVolcanoes";
import { HUMAN_DEVELOPMENT_INDEX } from "./humanDevelopmentIndex";
import { MOUNTAIN_AREAS } from "./mountainArea";
import { SOVEREIGNTY } from "./sovereignty";
import { URBAN_CENTRES } from "./urbanCentres";
import { WORLD_BANK_INDICATORS } from "./worldBankIndicators";

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
  highestPoints: HIGHEST_POINTS,
  worldBank: WORLD_BANK_INDICATORS,
  humanDevelopment: HUMAN_DEVELOPMENT_INDEX,
  eventEditions: EVENT_EDITIONS,
  historicalDominations: HISTORICAL_DOMINATIONS,
};
