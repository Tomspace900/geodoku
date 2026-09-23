import { describe, expect, it } from "vitest";
import { COUNTRY_CODES } from "../../content/countries/countryCodes";
import { COUNTRY_FACTS } from "../../content/countries/facts";
import type { CapitalLabelsSnapshot } from "./data/types";
import { validateCapitalLabels } from "./validateDatasetFacts";

const ZAF_NAMES = COUNTRY_FACTS.ZAF.capitals.map((capital) => capital.name);

function snapshotFrom(facts: typeof COUNTRY_FACTS): CapitalLabelsSnapshot {
  return {
    harvestedAt: "2026-01-01",
    labels: Object.fromEntries(
      Object.entries(facts).map(([iso3, country]) => [
        iso3,
        Object.fromEntries(
          country.capitals.map((capital) => [capital.name, capital.names]),
        ),
      ]),
    ),
    overrides: {},
  };
}

describe("libellés des capitales", () => {
  it("un snapshot cohérent avec ses libellés ne signale rien", () => {
    expect(
      validateCapitalLabels(
        COUNTRY_FACTS,
        snapshotFrom(COUNTRY_FACTS),
        COUNTRY_CODES,
      ),
    ).toEqual([]);
  });

  it("signale une capitale du snapshot absente du dataset", () => {
    const dataset = snapshotFrom(COUNTRY_FACTS);
    delete dataset.labels.ZAF?.[ZAF_NAMES[0]];
    expect(validateCapitalLabels(COUNTRY_FACTS, dataset, ["ZAF"])).toHaveLength(
      1,
    );
  });

  it("signale une entrée orpheline : capitale que REST Countries ne porte pas", () => {
    const dataset = snapshotFrom(COUNTRY_FACTS);
    dataset.labels.ZAF = {
      ...dataset.labels.ZAF,
      Johannesburg: { fr: "Johannesburg", en: "Johannesburg" },
    };
    expect(validateCapitalLabels(COUNTRY_FACTS, dataset, ["ZAF"])).toEqual([
      "ZAF: le dataset des capitales porte « Johannesburg », absente des capitales sources",
    ]);
  });

  it("signale un libellé de facts.ts obsolète face à l'override", () => {
    const dataset = snapshotFrom(COUNTRY_FACTS);
    const [first] = ZAF_NAMES;
    dataset.overrides.ZAF = {
      [first]: { fr: "Autre", en: "Other", reason: "test" },
    };
    expect(validateCapitalLabels(COUNTRY_FACTS, dataset, ["ZAF"])[0]).toContain(
      "obsolètes",
    );
  });
});
