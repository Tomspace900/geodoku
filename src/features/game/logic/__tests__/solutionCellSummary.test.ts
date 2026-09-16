import { describe, expect, it } from "vitest";
import type { Cell, CellGuessDistribution } from "../../types";
import { computeSolutionCellSummary } from "../solutionCellSummary";

const compareIso = (a: string, b: string) => a.localeCompare(b);
const FILLED = (iso: string): Cell => ({ status: "filled", countryCode: iso });
const EMPTY: Cell = { status: "empty" };
const BLOCKED: Cell = { status: "blocked" };

describe("computeSolutionCellSummary", () => {
  it("returns null userPick and rarestFound without a distribution", () => {
    const summary = computeSolutionCellSummary({
      codes: ["FRA", "DEU"],
      userCell: FILLED("FRA"),
      cellDist: undefined,
      cohortComplete: false,
      compareByName: compareIso,
    });
    expect(summary).toEqual({
      userPick: { iso: "FRA", tier: null, isRarestFound: false },
      rarestFound: null,
      answerCount: 2,
    });
  });

  it("returns a null userPick for an empty or blocked cell", () => {
    const cellDist: CellGuessDistribution = {
      totalGuesses: 5,
      rarityByCountry: { FRA: 0.4 },
    };
    for (const cell of [EMPTY, BLOCKED]) {
      const summary = computeSolutionCellSummary({
        codes: ["FRA"],
        userCell: cell,
        cellDist,
        cohortComplete: false,
        compareByName: compareIso,
      });
      expect(summary.userPick).toBeNull();
    }
  });

  it("finds the rarest answer with a strictly positive share, distinct from the user's pick", () => {
    const cellDist: CellGuessDistribution = {
      totalGuesses: 10,
      rarityByCountry: { FRA: 0.5, DEU: 0.05, ESP: 0 },
    };
    const summary = computeSolutionCellSummary({
      codes: ["FRA", "DEU", "ESP"],
      userCell: FILLED("FRA"),
      cellDist,
      cohortComplete: false,
      compareByName: compareIso,
    });
    expect(summary.userPick).toEqual({
      iso: "FRA",
      tier: "uncommon",
      isRarestFound: false,
    });
    expect(summary.rarestFound).toEqual({ iso: "DEU", tier: "ultra" });
  });

  it("excludes an answer with a share of exactly 0 from rarestFound", () => {
    const cellDist: CellGuessDistribution = {
      totalGuesses: 10,
      rarityByCountry: { ESP: 0 },
    };
    const summary = computeSolutionCellSummary({
      codes: ["ESP"],
      userCell: EMPTY,
      cellDist,
      cohortComplete: false,
      compareByName: compareIso,
    });
    expect(summary.rarestFound).toBeNull();
  });

  it("folds rarestFound into userPick instead of duplicating the line", () => {
    const cellDist: CellGuessDistribution = {
      totalGuesses: 10,
      rarityByCountry: { FRA: 0.5, DEU: 0.05 },
    };
    const summary = computeSolutionCellSummary({
      codes: ["FRA", "DEU"],
      userCell: FILLED("DEU"),
      cellDist,
      cohortComplete: false,
      compareByName: compareIso,
    });
    expect(summary.userPick).toEqual({
      iso: "DEU",
      tier: "ultra",
      isRarestFound: true,
    });
    expect(summary.rarestFound).toBeNull();
  });

  it("breaks ties on strictly equal shares alphabetically", () => {
    const cellDist: CellGuessDistribution = {
      totalGuesses: 10,
      rarityByCountry: { DEU: 0.05, ALB: 0.05 },
    };
    const summary = computeSolutionCellSummary({
      codes: ["DEU", "ALB"],
      userCell: EMPTY,
      cellDist,
      cohortComplete: false,
      compareByName: compareIso,
    });
    expect(summary.rarestFound).toEqual({ iso: "ALB", tier: "ultra" });
  });

  it("on a closed cohort, an answer absent from the distribution defaults to share 0 — excluded from rarestFound", () => {
    const cellDist: CellGuessDistribution = {
      totalGuesses: 3,
      rarityByCountry: {},
    };
    const summary = computeSolutionCellSummary({
      codes: ["DEU"],
      userCell: EMPTY,
      cellDist,
      cohortComplete: true,
      compareByName: compareIso,
    });
    // DEU absent du snapshot d'une cohorte close = personne ne l'a choisi = part 0, exclu de rarestFound (pas "strictement positif").
    expect(summary.rarestFound).toBeNull();
  });

  it("on an open cohort, an answer not yet picked (absent from the distribution) is never rarestFound", () => {
    const cellDist: CellGuessDistribution = {
      totalGuesses: 3,
      rarityByCountry: {},
    };
    const summary = computeSolutionCellSummary({
      codes: ["DEU"],
      userCell: EMPTY,
      cellDist,
      cohortComplete: false,
      compareByName: compareIso,
    });
    expect(summary.rarestFound).toBeNull();
  });

  it("always reports answerCount as the number of valid codes", () => {
    const summary = computeSolutionCellSummary({
      codes: ["FRA", "DEU", "ESP"],
      userCell: EMPTY,
      cellDist: undefined,
      cohortComplete: false,
      compareByName: compareIso,
    });
    expect(summary.answerCount).toBe(3);
  });
});
