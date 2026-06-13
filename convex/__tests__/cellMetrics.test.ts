import { describe, expect, it } from "vitest";
import {
  computeCellMetric,
  computePlayersEngaged,
  concentrationIndex,
} from "../lib/cellMetrics";

describe("computeCellMetric", () => {
  it("returns zeros when no game has been played yet", () => {
    const metric = computeCellMetric({
      validForCell: ["FRA", "ESP", "ITA"],
      totalGuesses: 0,
      guessRows: [],
      playersEngaged: 0,
    });

    expect(metric.totalGuesses).toBe(0);
    expect(metric.distinctCountries).toBe(0);
    expect(metric.coverage).toBe(0);
    expect(metric.fillRate).toBeNull();
    expect(metric.observedDifficulty100).toBeNull();
    expect(metric.topAnswers).toEqual([]);
    expect(metric.missingCountries).toEqual(["FRA", "ESP", "ITA"]);
  });

  it("computes fillRate and observedDifficulty from playersEngaged", () => {
    const metric = computeCellMetric({
      validForCell: ["FRA", "ESP"],
      totalGuesses: 8,
      guessRows: [
        { countryCode: "FRA", count: 6 },
        { countryCode: "ESP", count: 2 },
      ],
      playersEngaged: 10,
    });

    expect(metric.fillRate).toBeCloseTo(0.8, 5);
    expect(metric.observedDifficulty100).toBe(20);
  });

  it("clamps observedDifficulty when fillRate exceeds 1 (defensive)", () => {
    const metric = computeCellMetric({
      validForCell: ["FRA"],
      totalGuesses: 12,
      guessRows: [{ countryCode: "FRA", count: 12 }],
      playersEngaged: 10,
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
      playersEngaged: 12,
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
      playersEngaged: 10,
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
      playersEngaged: 5,
    });
    expect(metric.missingCountries).toEqual(["ITA", "PRT"]);
    expect(metric.coverage).toBeCloseTo(0.5, 5);
  });
});

describe("computePlayersEngaged", () => {
  it("returns the max totalGuesses across cells", () => {
    expect(computePlayersEngaged([3, 7, 2, 7, 1])).toBe(7);
  });

  it("returns 0 when all cells are empty", () => {
    expect(computePlayersEngaged([0, 0, 0])).toBe(0);
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
