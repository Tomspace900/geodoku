import { describe, expect, it } from "vitest";
import type { CountryFacts } from "../../content/countries/type";
import type { HighestPointsSnapshot, SovereigntySnapshot } from "./data/types";
import {
  validateHighestPoints,
  validatePeakCoherence,
} from "./validateDatasetFacts";

const SOVEREIGNTY: SovereigntySnapshot = { sourceCommit: "abc", countries: {} };

function dataset(
  overrides: HighestPointsSnapshot["overrides"] = {},
): HighestPointsSnapshot {
  return {
    factbookCommit: "abc",
    harvestedAt: "2026-10-09",
    points: {
      FRA: {
        sourceName: "Mont Blanc",
        elevationM: 4810,
        label: { fr: "Mont Blanc", en: "Mont Blanc" },
        wikidata: "Q583",
      },
    },
    overrides,
  };
}

function facts(elevationM: number, flagged: boolean): CountryFacts {
  return {
    highestPoint: { elevationM, names: null },
    physicalFeatures: flagged ? ["peak_over_5000m"] : [],
  } as unknown as CountryFacts;
}

describe("validateHighestPoints", () => {
  it("accepte un dataset complet, au même commit que la souveraineté", () => {
    expect(validateHighestPoints(dataset(), SOVEREIGNTY, ["FRA"])).toEqual([]);
  });

  it("échoue quand le commit Factbook diverge de celui de la souveraineté", () => {
    const [error] = validateHighestPoints(
      { ...dataset(), factbookCommit: "def" },
      SOVEREIGNTY,
      ["FRA"],
    );
    expect(error).toContain("même miroir");
  });

  it("signale un pays sans point culminant", () => {
    expect(
      validateHighestPoints(dataset(), SOVEREIGNTY, ["FRA", "ITA"]),
    ).toEqual([expect.stringContaining("ITA: sans point culminant")]);
  });

  it("signale un override orphelin et un override sans motif", () => {
    const errors = validateHighestPoints(
      dataset({
        ZZZ: { label: null, reason: "x" },
        FRA: { label: null, reason: " " },
      }),
      SOVEREIGNTY,
      ["FRA"],
    );
    expect(errors).toHaveLength(2);
  });
});

describe("validatePeakCoherence", () => {
  it("accepte un sommet ≥ 5 000 m marqué, et un sommet plus bas non marqué", () => {
    expect(
      validatePeakCoherence(
        { NPL: facts(8849, true), FRA: facts(4810, false) },
        {},
        ["NPL", "FRA"],
      ),
    ).toEqual([]);
  });

  it("arrête sur un sommet ≥ 5 000 m non marqué", () => {
    expect(
      validatePeakCoherence({ COL: facts(5730, false) }, {}, ["COL"]),
    ).toEqual([
      expect.stringContaining("COL: point culminant 5730 m ≥ 5 000 m"),
    ]);
  });

  it("arrête sur un marquage sans sommet ≥ 5 000 m", () => {
    expect(
      validatePeakCoherence({ FRA: facts(4810, true) }, {}, ["FRA"]),
    ).toEqual([expect.stringContaining("peak_over_5000m présent")]);
  });

  it("tolère un écart inscrit avec son motif, et signale une entrée sans objet", () => {
    expect(
      validatePeakCoherence({ FRA: facts(4810, true) }, { FRA: "motif" }, [
        "FRA",
      ]),
    ).toEqual([]);
    expect(
      validatePeakCoherence({ FRA: facts(4810, false) }, { FRA: "motif" }, [
        "FRA",
      ]),
    ).toEqual([expect.stringContaining("sans objet")]);
  });
});
