import { describe, expect, it } from "vitest";
import { computeCellMetric, concentrationIndex } from "../lib/cellMetrics";

describe("computeCellMetric", () => {
  it("returns zeros when no game has been played yet", () => {
    const metric = computeCellMetric({
      validForCell: ["FRA", "ESP", "ITA"],
      totalGuesses: 0,
      guessRows: [],
      gamesPlayed: 0,
      estimatedDifficulty: 42,
    });

    expect(metric.totalGuesses).toBe(0);
    expect(metric.distinctCountries).toBe(0);
    expect(metric.coverage).toBe(0);
    expect(metric.fillRate).toBeNull();
    expect(metric.observedDifficulty100).toBeNull();
    expect(metric.topAnswers).toEqual([]);
    expect(metric.missingCountries).toEqual(["FRA", "ESP", "ITA"]);
    expect(metric.estimatedDifficulty).toBe(42);
  });

  it("computes fillRate and observedDifficulty from gamesPlayed", () => {
    const metric = computeCellMetric({
      validForCell: ["FRA", "ESP"],
      totalGuesses: 8,
      guessRows: [
        { countryCode: "FRA", count: 6 },
        { countryCode: "ESP", count: 2 },
      ],
      gamesPlayed: 10,
      estimatedDifficulty: 30,
    });

    expect(metric.fillRate).toBeCloseTo(0.8, 5);
    expect(metric.observedDifficulty100).toBe(20);
  });

  it("clamps observedDifficulty when more guesses than games (defensive)", () => {
    const metric = computeCellMetric({
      validForCell: ["FRA"],
      totalGuesses: 12,
      guessRows: [{ countryCode: "FRA", count: 12 }],
      gamesPlayed: 10,
      estimatedDifficulty: null,
    });
    expect(metric.observedDifficulty100).toBe(0);
  });

  it("sorts topAnswers by descending count and computes shares", () => {
    const metric = computeCellMetric({
      validForCell: ["FRA", "ESP", "ITA"],
      totalGuesses: 10,
      guessRows: [
        { countryCode: "ESP", count: 2 },
        { countryCode: "FRA", count: 6 },
        { countryCode: "ITA", count: 2 },
      ],
      gamesPlayed: 12,
      estimatedDifficulty: null,
    });

    expect(metric.topAnswers.map((a) => a.countryCode)).toEqual([
      "FRA",
      "ESP",
      "ITA",
    ]);
    expect(metric.topAnswers[0].share).toBeCloseTo(0.6, 5);
  });

  it("limits topAnswers to 5 entries", () => {
    const metric = computeCellMetric({
      validForCell: [],
      totalGuesses: 7,
      guessRows: Array.from({ length: 7 }, (_, i) => ({
        countryCode: `C${i}`,
        count: 7 - i,
      })),
      gamesPlayed: 10,
      estimatedDifficulty: null,
    });
    expect(metric.topAnswers).toHaveLength(5);
  });

  it("identifies missing countries (valid pool minus chosen set)", () => {
    const metric = computeCellMetric({
      validForCell: ["FRA", "ESP", "ITA", "PRT"],
      totalGuesses: 5,
      guessRows: [
        { countryCode: "FRA", count: 3 },
        { countryCode: "ESP", count: 2 },
      ],
      gamesPlayed: 5,
      estimatedDifficulty: null,
    });
    expect(metric.missingCountries).toEqual(["ITA", "PRT"]);
    expect(metric.coverage).toBeCloseTo(0.5, 5);
  });
});

describe("concentrationIndex", () => {
  it("returns the share of the first (top) entry", () => {
    expect(concentrationIndex([{ share: 0.62 }, { share: 0.2 }])).toBe(0.62);
  });

  it("returns 0 on empty list", () => {
    expect(concentrationIndex([])).toBe(0);
  });
});
