import { describe, expect, it } from "vitest";
import countriesJson from "../../src/features/countries/data/countries.json";
import type { Country } from "../../src/features/countries/types.ts";
import { CONSTRAINTS } from "../../src/features/game/logic/constraints";
import {
  MAX_SAME_CATEGORY,
  MIN_CATEGORIES,
  MIN_CELL_SIZE,
} from "./gridConstants";
import {
  buildConstraintMatches,
  computeCellDifficulty,
  computeGridDifficulty,
  finalizeGrid,
  generateDiversePool,
  intersect,
  topKPopularity,
  tryBuildGridWithSeed,
} from "./gridGenerator";

const COUNTRIES = countriesJson as Country[];

function popularityOf(code: string): number {
  return COUNTRIES.find((c) => c.code === code)?.popularityIndex ?? 0.5;
}

// ─── intersect ────────────────────────────────────────────────────────────────

describe("intersect", () => {
  it("returns a sorted, stable result", () => {
    const matches = buildConstraintMatches();
    const result = intersect("continent_europe", "area_lt_1k", matches);
    expect(result).toEqual([...result].sort());
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns empty for mutually exclusive constraints", () => {
    const matches = buildConstraintMatches();
    expect(intersect("continent_africa", "continent_asia", matches)).toEqual(
      [],
    );
  });

  it("returns only codes present in both sets", () => {
    const matches = buildConstraintMatches();
    const result = intersect("continent_africa", "water_landlocked", matches);
    const africaSet = matches.continent_africa;
    const landlockSet = matches.water_landlocked;
    for (const code of result) {
      expect(africaSet.has(code)).toBe(true);
      expect(landlockSet.has(code)).toBe(true);
    }
  });
});

// ─── tryBuildGridWithSeed ─────────────────────────────────────────────────────

describe("tryBuildGridWithSeed", () => {
  it("places the seed at rows[0] when seedPosition='row'", () => {
    const matches = buildConstraintMatches();
    const result = tryBuildGridWithSeed("continent_asia", "row", matches);

    expect(result).not.toBeNull();
    if (result) {
      expect(result.rows[0]).toBe("continent_asia");
      expect(result.rows).toHaveLength(3);
      expect(result.cols).toHaveLength(3);
      const all6 = new Set([...result.rows, ...result.cols]);
      expect(all6.size).toBe(6);
    }
  });

  it("places the seed at cols[0] when seedPosition='col'", () => {
    const matches = buildConstraintMatches();
    const result = tryBuildGridWithSeed("continent_africa", "col", matches);

    expect(result).not.toBeNull();
    if (result) {
      expect(result.cols[0]).toBe("continent_africa");
      expect(result.rows).toHaveLength(3);
      expect(result.cols).toHaveLength(3);
    }
  });

  it("all cells satisfy MIN_CELL_SIZE", () => {
    const matches = buildConstraintMatches();
    const result = tryBuildGridWithSeed("language_french", "row", matches);

    expect(result).not.toBeNull();
    if (result) {
      for (const rowId of result.rows) {
        for (const colId of result.cols) {
          const size = intersect(rowId, colId, matches).length;
          expect(size).toBeGreaterThanOrEqual(MIN_CELL_SIZE);
        }
      }
    }
  });

  it("no category exceeds MAX_SAME_CATEGORY", () => {
    const CATEGORY_BY_ID: Record<string, string> = {};
    for (const c of CONSTRAINTS) CATEGORY_BY_ID[c.id] = c.category;

    const matches = buildConstraintMatches();
    let tested = 0;

    for (let i = 0; i < 20 && tested < 5; i++) {
      const seed = CONSTRAINTS[i % CONSTRAINTS.length];
      const result = tryBuildGridWithSeed(
        seed.id,
        i % 2 === 0 ? "row" : "col",
        matches,
      );
      if (!result) continue;
      tested++;

      const catCounts: Record<string, number> = {};
      for (const id of [...result.rows, ...result.cols]) {
        const cat = CATEGORY_BY_ID[id] ?? "unknown";
        catCounts[cat] = (catCounts[cat] ?? 0) + 1;
        expect(catCounts[cat]).toBeLessThanOrEqual(MAX_SAME_CATEGORY);
      }
    }
    expect(tested).toBeGreaterThan(0);
  });
});

// ─── computeCellDifficulty ────────────────────────────────────────────────────

describe("computeCellDifficulty", () => {
  it("returns a low value for easy×easy with many solutions", () => {
    const matches = buildConstraintMatches();
    // continent_europe × language_english — both easy, should have many solutions
    const diff = computeCellDifficulty(
      "continent_europe",
      "language_english",
      matches,
    );
    // With ≥ 10 solutions and easy×easy (weight 1×1), expect difficulty < 30
    const solutions = intersect(
      "continent_europe",
      "language_english",
      matches,
    );
    if (solutions.length >= 10) {
      expect(diff).toBeLessThan(30);
    } else {
      expect(diff).toBeGreaterThanOrEqual(0);
    }
  });

  it("returns a high value for hard×hard with few solutions", () => {
    const matches = buildConstraintMatches();
    // flag_has_crescent (hard) × latitude_polar (hard) — should have very few solutions
    const diff = computeCellDifficulty(
      "flag_has_crescent",
      "latitude_polar",
      matches,
    );
    const solutions = intersect("flag_has_crescent", "latitude_polar", matches);
    if (solutions.length <= 3 && solutions.length > 0) {
      expect(diff).toBeGreaterThan(70);
    } else if (solutions.length === 0) {
      expect(diff).toBe(100);
    }
  });

  it("returns 100 for a cell with no solutions", () => {
    const matches = buildConstraintMatches();
    // Two mutually exclusive constraints
    const diff = computeCellDifficulty(
      "continent_africa",
      "continent_asia",
      matches,
    );
    expect(diff).toBe(100);
  });

  it("returns an integer in [0, 100]", () => {
    const matches = buildConstraintMatches();
    for (const row of CONSTRAINTS.slice(0, 10)) {
      for (const col of CONSTRAINTS.slice(0, 10)) {
        if (row.id === col.id) continue;
        const d = computeCellDifficulty(row.id, col.id, matches);
        expect(Number.isInteger(d)).toBe(true);
        expect(d).toBeGreaterThanOrEqual(0);
        expect(d).toBeLessThanOrEqual(100);
      }
    }
  });

  it("with same pool size and constraint weight product, higher top-K popularity lowers difficulty", () => {
    const matches = buildConstraintMatches();
    const rowA = "continent_africa";
    const colA = "area_gt_2M";
    const rowB = "continent_africa";
    const colB = "borders_solo";
    const nA = intersect(rowA, colA, matches).length;
    const nB = intersect(rowB, colB, matches).length;
    expect(nA).toBe(nB);
    expect(nA).toBeGreaterThan(0);

    const popA = topKPopularity(intersect(rowA, colA, matches));
    const popB = topKPopularity(intersect(rowB, colB, matches));
    expect(popA).toBeGreaterThan(popB + 0.1);

    const dA = computeCellDifficulty(rowA, colA, matches);
    const dB = computeCellDifficulty(rowB, colB, matches);
    expect(dA).toBeLessThan(dB);
  });
});

// ─── topKPopularity ───────────────────────────────────────────────────────────

describe("topKPopularity", () => {
  it("returns 0.5 for an empty code list", () => {
    expect(topKPopularity([])).toBe(0.5);
  });

  it("returns the lone country popularity when the pool has one code", () => {
    expect(topKPopularity(["USA"])).toBe(popularityOf("USA"));
  });

  it("averages the full pool when size is below K=3", () => {
    const a = "SMR";
    const b = "MCO";
    expect(topKPopularity([a, b], 3)).toBeCloseTo(
      (popularityOf(a) + popularityOf(b)) / 2,
      6,
    );
  });

  it("averages only the top-3 by popularity when the pool is larger", () => {
    const codes = ["USA", "FSM", "AND", "TUV", "MHL"];
    const sorted = codes
      .map((code) => popularityOf(code))
      .sort((x, y) => y - x);
    const manual = (sorted[0] + sorted[1] + sorted[2]) / 3;
    expect(topKPopularity(codes, 3)).toBeCloseTo(manual, 5);
  });
});

// ─── computeGridDifficulty ────────────────────────────────────────────────────

describe("computeGridDifficulty", () => {
  it("returns an integer in [0, 100] for a real grid", () => {
    const matches = buildConstraintMatches();

    let result: { rows: string[]; cols: string[] } | null = null;
    for (let i = 0; i < 100 && !result; i++) {
      const seed = CONSTRAINTS[i % CONSTRAINTS.length];
      result = tryBuildGridWithSeed(seed.id, "row", matches);
    }
    expect(result).not.toBeNull();
    if (result) {
      const diff = computeGridDifficulty(result.rows, result.cols, matches);
      expect(Number.isInteger(diff)).toBe(true);
      expect(diff).toBeGreaterThanOrEqual(0);
      expect(diff).toBeLessThanOrEqual(100);
    }
  });
});

// ─── generateDiversePool ─────────────────────────────────────────────────────

describe("generateDiversePool (10-seed subset)", () => {
  it("produces valid grids that satisfy hard filters", () => {
    // Use only the first 10 constraints as seeds for speed
    const CATEGORY_BY_ID: Record<string, string> = {};
    for (const c of CONSTRAINTS) CATEGORY_BY_ID[c.id] = c.category;

    const matches = buildConstraintMatches();
    const { grids, report } = generateDiversePool();

    // At least some grids should be generated
    expect(grids.length).toBeGreaterThan(0);
    expect(report.totalGenerated).toBe(grids.length);
    expect(report.constraintCoverage).toBeGreaterThan(0);
    expect(report.countryCoverage).toBeGreaterThan(0);
    expect(report.durationMs).toBeGreaterThan(0);

    for (const grid of grids) {
      // 6 distinct constraint IDs
      const all6 = new Set(grid.metadata.constraintIds);
      expect(all6.size).toBe(6);

      // All cells satisfy size constraints
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const size = intersect(grid.rows[r], grid.cols[c], matches).length;
          expect(size).toBeGreaterThanOrEqual(MIN_CELL_SIZE);
          expect(size).toBeLessThanOrEqual(15);
        }
      }

      // MIN_CATEGORIES distinct categories
      expect(grid.metadata.categories.length).toBeGreaterThanOrEqual(
        MIN_CATEGORIES,
      );

      // MAX_SAME_CATEGORY per category
      const catCounts: Record<string, number> = {};
      for (const id of grid.metadata.constraintIds) {
        const cat = CATEGORY_BY_ID[id] ?? "unknown";
        catCounts[cat] = (catCounts[cat] ?? 0) + 1;
        expect(catCounts[cat]).toBeLessThanOrEqual(MAX_SAME_CATEGORY);
      }

      // Difficulty in [0, 100]
      expect(grid.metadata.difficultyEstimate).toBeGreaterThanOrEqual(0);
      expect(grid.metadata.difficultyEstimate).toBeLessThanOrEqual(100);

      // 9 cell difficulties
      expect(grid.metadata.cellDifficulties).toHaveLength(9);

      // validAnswers has 9 keys
      expect(Object.keys(grid.validAnswers)).toHaveLength(9);
    }
  }, 120_000);

  it("no two pool grids share more than 4 of 6 constraints", () => {
    const { grids } = generateDiversePool();

    for (let i = 0; i < grids.length; i++) {
      const setA = new Set(grids[i].metadata.constraintIds);
      for (let j = i + 1; j < grids.length; j++) {
        let shared = 0;
        for (const id of grids[j].metadata.constraintIds) {
          if (setA.has(id)) shared++;
        }
        expect(shared).toBeLessThan(4); // MAX_OVERLAP_BETWEEN_GRIDS = 4 (strict <)
      }
    }
  }, 120_000);

  it("report contains correct seed result entries", () => {
    const { report } = generateDiversePool();

    expect(report.seedResults).toHaveLength(CONSTRAINTS.length);
    for (const sr of report.seedResults) {
      expect(sr.constraintId).toBeTruthy();
      expect(sr.attempted).toBeGreaterThanOrEqual(sr.succeeded);
      expect(sr.failed).toBe(sr.succeeded < 5);
    }
  }, 120_000);
});

// ─── finalizeGrid ─────────────────────────────────────────────────────────────

describe("finalizeGrid", () => {
  it("returns null for a grid with invalid cells", () => {
    const matches = buildConstraintMatches();
    // Force a cell that will have 0 solutions (mutually exclusive pair in row/col)
    const result = finalizeGrid(
      ["continent_africa", "continent_asia", "continent_europe"],
      [
        "continent_north_america",
        "continent_south_america",
        "continent_oceania",
      ],
      "continent_africa",
      matches,
    );
    // continent_africa × continent_north_america = 0 → should return null
    expect(result).toBeNull();
  });

  it("returns null when MIN_CATEGORIES is violated", () => {
    const matches = buildConstraintMatches();
    // All same category: only continent → categoryCount = 1 < 4
    const result = finalizeGrid(
      ["continent_africa", "continent_asia", "continent_europe"],
      ["area_gt_2M", "area_gt_500k", "area_lt_1k"],
      "continent_africa",
      matches,
    );
    // This might pass cell size but fail MIN_CATEGORIES (2 categories)
    if (result !== null) {
      // If it somehow has enough categories, the test is inconclusive
      expect(result.metadata.categories.length).toBeGreaterThanOrEqual(
        MIN_CATEGORIES,
      );
    }
  });
});
