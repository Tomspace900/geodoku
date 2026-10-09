import { describe, expect, it } from "vitest";
import type { HumanDevelopmentIndexSnapshot } from "./data/types";
import { validateHumanDevelopmentIndex } from "./validateDatasetFacts";

function dataset(
  overrides: Partial<HumanDevelopmentIndexSnapshot> = {},
): HumanDevelopmentIndexSnapshot {
  return {
    edition: 2025,
    dataYear: 2023,
    sourceUrl: "https://example.test/hdr.csv",
    harvestedAt: "2026-10-09",
    values: { FRA: { value: 0.92, category: "very_high" } },
    missing: { TWN: "not_in_report" },
    ...overrides,
  };
}

describe("validateHumanDevelopmentIndex", () => {
  it("accepte un partage complet valeurs / manquants", () => {
    expect(validateHumanDevelopmentIndex(dataset(), ["FRA", "TWN"])).toEqual(
      [],
    );
  });

  it("signale un pays ni valeur ni manquant", () => {
    expect(
      validateHumanDevelopmentIndex(dataset(), ["FRA", "TWN", "DEU"]),
    ).toEqual([expect.stringContaining("DEU")]);
  });

  it("signale un pays à la fois valeur et manquant", () => {
    expect(
      validateHumanDevelopmentIndex(
        dataset({ missing: { FRA: "not_in_report" } }),
        ["FRA"],
      ),
    ).toEqual([expect.stringContaining("FRA")]);
  });

  it("signale une entrée hors catalogue", () => {
    expect(validateHumanDevelopmentIndex(dataset(), ["FRA"])).toEqual([
      expect.stringContaining("TWN"),
    ]);
  });

  it("signale un IDH hors de ]0, 1]", () => {
    expect(
      validateHumanDevelopmentIndex(
        dataset({ values: { FRA: { value: 1.2, category: "very_high" } } }),
        ["FRA", "TWN"],
      ),
    ).toEqual([expect.stringContaining("FRA")]);
  });
});
