import { describe, expect, it } from "vitest";
import type { ForestCoverSnapshot } from "../data/types";
import {
  buildForestCover,
  FOREST_AREA_CODE,
  validateForestVintage,
} from "./forestCoverLib";
import type { WdiRow } from "./worldBankIndicatorsLib";

function row(iso3: string, date: string, value: number | null): WdiRow {
  return {
    indicator: { id: FOREST_AREA_CODE },
    countryiso3code: iso3,
    date,
    value,
  };
}

const PAGE = {
  lastUpdated: "2026-10-08",
  rows: [
    row("FIN", "2024", 73.7),
    row("FRA", "2024", null),
    row("FIN", "2023", 73.6),
    row("FRA", "2023", 31.5),
    row("WLD", "2023", 31.1),
  ],
};

describe("buildForestCover", () => {
  it("retient l'année la plus récente à couverture complète, pas la dernière publiée", () => {
    const snapshot = buildForestCover(PAGE, ["FIN", "FRA"], {});
    expect(snapshot.referenceYear).toBe(2023);
    expect(snapshot.countries).toEqual({ FIN: 73.6, FRA: 31.5 });
  });

  it("complète un pays absent de la WDI par sa valeur motivée", () => {
    const snapshot = buildForestCover(PAGE, ["FIN", "TWN"], {
      TWN: { value: 60.71, reason: "test" },
    });
    expect(snapshot.countries.TWN).toBe(60.71);
  });

  it("échoue pour un pays sans valeur ni repli", () => {
    expect(() => buildForestCover(PAGE, ["FIN", "TWN"], {})).toThrow(/TWN/);
  });

  it("échoue quand un repli masque une valeur que la WDI publie", () => {
    expect(() =>
      buildForestCover(PAGE, ["FIN"], { FIN: { value: 1, reason: "test" } }),
    ).toThrow(/NON_WDI_FOREST_COVER/);
  });
});

describe("validateForestVintage", () => {
  const snapshot: ForestCoverSnapshot = {
    source: "x",
    referenceYear: 2023,
    sourceUpdatedAt: "2026-10-08",
    countries: {},
  };

  it("accepte le millésime égal à l'année du dataset", () => {
    expect(validateForestVintage({ fr: "2023", en: "2023" }, snapshot)).toEqual(
      [],
    );
  });

  it("signale un millésime désaccordé", () => {
    expect(
      validateForestVintage({ fr: "2022", en: "2022" }, snapshot),
    ).toHaveLength(1);
  });
});
