import { describe, expect, it } from "vitest";
import { type GridContextInput, computeGridContext } from "./gridContext";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const gridA: GridContextInput = {
  rows: ["continent_asia", "water_landlocked", "language_english"],
  cols: ["population_gt_30M", "area_gt_500k", "borders_min_5"],
  validAnswers: {
    "0,0": ["CHN", "IND"],
    "0,1": ["CHN", "IND", "KAZ"],
    "0,2": ["CHN", "IND", "MNG"],
    "1,0": [],
    "1,1": ["KAZ"],
    "1,2": ["KAZ"],
    "2,0": ["USA"],
    "2,1": ["CAN", "USA"],
    "2,2": ["USA"],
  },
};

const gridB: GridContextInput = {
  rows: ["continent_africa", "water_island", "language_french"],
  cols: ["population_lt_2_5M", "area_lt_1k", "borders_solo"],
  validAnswers: {
    "0,0": ["GNQ"],
    "0,1": ["STP"],
    "0,2": ["MDG"],
    "1,0": ["CPV"],
    "1,1": ["SYC"],
    "1,2": ["MDG"],
    "2,0": ["DJI"],
    "2,1": ["COM"],
    "2,2": ["MDG"],
  },
};

// Identical signature to gridA (to test pair reuse + structure sim = 1)
const gridAClone: GridContextInput = {
  rows: ["continent_asia", "water_landlocked", "language_english"],
  cols: ["population_gt_30M", "area_gt_500k", "borders_min_5"],
  validAnswers: gridA.validAnswers,
};

// ─── Empty history ────────────────────────────────────────────────────────────

describe("computeGridContext — empty history", () => {
  it("rewards maximally and returns zeroed reuse metrics", () => {
    const metrics = computeGridContext(gridA, []);
    expect(metrics.countryReuseRate).toBe(0);
    expect(metrics.criteriaReuseRate).toBe(0);
    expect(metrics.criteriaPairReuseRate).toBe(0);
    expect(metrics.structureSimilarity).toBe(0);
    expect(metrics.contextScore).toBeGreaterThanOrEqual(85);
    expect(metrics.contextScore).toBeLessThanOrEqual(100);
  });
});

// ─── Non-empty history ────────────────────────────────────────────────────────

describe("computeGridContext — with history", () => {
  it("penalizes a candidate identical to a history entry", () => {
    const identical = computeGridContext(gridA, [gridAClone]);
    expect(identical.criteriaPairReuseRate).toBe(1);
    expect(identical.criteriaReuseRate).toBe(1);
    expect(identical.structureSimilarity).toBe(1);
    expect(identical.contextScore).toBeLessThan(30);
  });

  it("rewards a candidate fully distinct from history", () => {
    const distinct = computeGridContext(gridA, [gridB]);
    expect(distinct.criteriaPairReuseRate).toBe(0);
    expect(distinct.criteriaReuseRate).toBe(0);
    // Category signatures may still overlap if both use e.g. continent/language
    expect(distinct.contextScore).toBeGreaterThan(60);
  });

  it("detects partial constraint reuse", () => {
    const partial: GridContextInput = {
      rows: ["continent_asia", "water_landlocked", "language_spanish"],
      cols: ["pop_gt_100M", "area_gt_2M", "borders_min_7"],
      validAnswers: {
        "0,0": ["CHN"],
        "0,1": ["CHN"],
        "0,2": ["CHN"],
        "1,0": [],
        "1,1": ["KAZ"],
        "1,2": ["KAZ"],
        "2,0": [],
        "2,1": [],
        "2,2": [],
      },
    };
    const metrics = computeGridContext(partial, [gridA]);
    // 2 of 6 constraints are shared (continent_asia, water_landlocked)
    expect(metrics.criteriaReuseRate).toBeCloseTo(2 / 6, 5);
    // No (row, col) pair is shared
    expect(metrics.criteriaPairReuseRate).toBe(0);
  });

  it("country reuse rate reflects overlap in validAnswers", () => {
    const candidate: GridContextInput = {
      rows: ["r1", "r2", "r3"],
      cols: ["c1", "c2", "c3"],
      validAnswers: {
        "0,0": ["FRA", "DEU"],
        "0,1": [],
        "0,2": [],
        "1,0": [],
        "1,1": ["ITA"],
        "1,2": [],
        "2,0": [],
        "2,1": [],
        "2,2": ["ESP"],
      },
    };
    const history: GridContextInput = {
      rows: ["h1", "h2", "h3"],
      cols: ["h4", "h5", "h6"],
      validAnswers: {
        "0,0": ["FRA"], // reused
        "0,1": [],
        "0,2": [],
        "1,0": [],
        "1,1": ["ITA"], // reused
        "1,2": [],
        "2,0": [],
        "2,1": [],
        "2,2": ["BRA"], // not reused
      },
    };
    const metrics = computeGridContext(candidate, [history]);
    // Candidate has 4 countries {FRA, DEU, ITA, ESP}, 2 reused → 0.5
    expect(metrics.countryReuseRate).toBeCloseTo(0.5, 5);
  });

  it("contextScore is in [0, 100] and integer", () => {
    const metrics = computeGridContext(gridA, [gridA, gridB]);
    expect(metrics.contextScore).toBeGreaterThanOrEqual(0);
    expect(metrics.contextScore).toBeLessThanOrEqual(100);
    expect(Number.isInteger(metrics.contextScore)).toBe(true);
  });

  it("averages country reuse across multiple history entries", () => {
    const metrics = computeGridContext(gridA, [gridA, gridB]);
    // gridA shares 100% of countries with itself, ~0% with gridB → avg ≈ 0.5
    expect(metrics.countryReuseRate).toBeGreaterThan(0.3);
    expect(metrics.countryReuseRate).toBeLessThan(0.7);
  });
});
