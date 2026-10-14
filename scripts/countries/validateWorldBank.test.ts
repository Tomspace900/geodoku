import { describe, expect, it } from "vitest";
import type { WorldBankIndicator } from "./data/types";
import { validateWorldBankIndicator } from "./validateDatasetFacts";

function indicator(
  overrides: Partial<WorldBankIndicator> = {},
): WorldBankIndicator {
  return {
    code: "NY.GDP.PCAP.CD",
    sourceUpdatedAt: "2026-10-08",
    window: { from: 2021, to: 2025 },
    values: { FRA: { value: 48986, year: 2025 } },
    missing: { TWN: "not_in_wdi" },
    ...overrides,
  };
}

describe("validateWorldBankIndicator", () => {
  it("accepte un partage complet valeurs / manquants", () => {
    expect(validateWorldBankIndicator(indicator(), ["FRA", "TWN"])).toEqual([]);
  });

  it("signale un pays ni valeur ni manquant", () => {
    expect(
      validateWorldBankIndicator(indicator(), ["FRA", "TWN", "DEU"]),
    ).toEqual([expect.stringContaining("DEU")]);
  });

  it("signale un pays à la fois valeur et manquant", () => {
    expect(
      validateWorldBankIndicator(
        indicator({ missing: { FRA: "no_value_in_window" } }),
        ["FRA"],
      ),
    ).toEqual([expect.stringContaining("à la fois")]);
  });

  it("signale une entrée hors catalogue", () => {
    expect(validateWorldBankIndicator(indicator(), ["FRA"])).toEqual([
      expect.stringContaining("TWN"),
    ]);
  });

  it("signale une année hors de la fenêtre demandée", () => {
    expect(
      validateWorldBankIndicator(
        indicator({ values: { FRA: { value: 1, year: 2019 } } }),
        ["FRA", "TWN"],
      ),
    ).toEqual([expect.stringContaining("hors de la fenêtre")]);
  });
});
