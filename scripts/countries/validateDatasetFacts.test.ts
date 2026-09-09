import { describe, expect, it } from "vitest";
import { COUNTRY_CODES } from "../../content/countries/countryCodes";
import { COUNTRY_FACTS } from "../../content/countries/facts";
import type { QuantitativeDatasets } from "./buildCountriesLib";
import { QUANTITATIVE_DATASETS } from "./data/datasets";
import { validateDatasetFacts } from "./validateDatasetFacts";

describe("fraîcheur des faits dérivés de datasets", () => {
  it("garde facts.ts aligné sur les datasets curés", () => {
    expect(
      validateDatasetFacts(COUNTRY_FACTS, QUANTITATIVE_DATASETS, COUNTRY_CODES),
    ).toEqual([]);
  });

  // Sens 1 : un dataset révisé sans `pnpm build:countries`.
  it("signale un dataset modifié sans regen", () => {
    const patched: QuantitativeDatasets = {
      ...QUANTITATIVE_DATASETS,
      forestCover: {
        ...QUANTITATIVE_DATASETS.forestCover,
        countries: {
          ...QUANTITATIVE_DATASETS.forestCover.countries,
          FIN: 12.5,
        },
      },
    };

    expect(validateDatasetFacts(COUNTRY_FACTS, patched, COUNTRY_CODES)).toEqual(
      [
        `FIN: faits dérivés obsolètes (forestCoverShare attendu 0.125, trouvé ${JSON.stringify(COUNTRY_FACTS.FIN.forestCoverShare)}) — lancer pnpm build:countries`,
      ],
    );
  });

  // Sens 2 : `facts.ts` édité à la main malgré son en-tête `@generated`.
  it("signale un fait édité à la main", () => {
    const handEdited = {
      ...COUNTRY_FACTS,
      USA: { ...COUNTRY_FACTS.USA, formerSovereigns: [] },
    };

    expect(
      validateDatasetFacts(handEdited, QUANTITATIVE_DATASETS, COUNTRY_CODES),
    ).toEqual([
      'USA: faits dérivés obsolètes (formerSovereigns attendu ["united_kingdom"], trouvé []) — lancer pnpm build:countries',
    ]);
  });
});
