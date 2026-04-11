import { describe, expect, it } from "vitest";
import { CONSTRAINTS } from "./constraintsData";
import {
  MIN_CATEGORIES,
  MIN_CELL_SIZE,
  buildConstraintMatches,
  finalizeAndScore,
  generateBatch,
  intersect,
  tryBuildGrid,
} from "./gridGenerator";

// ─── intersect ────────────────────────────────────────────────────────────────

describe("intersect", () => {
  it("returns a sorted, stable result", () => {
    const matches = buildConstraintMatches();
    const result = intersect("continent_europe", "area_lt_10k", matches);
    expect(result).toEqual([...result].sort());
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns empty for mutually exclusive constraints", () => {
    const matches = buildConstraintMatches();
    // Africa and Asia are disjoint continents
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

// ─── finalizeAndScore ─────────────────────────────────────────────────────────

describe("finalizeAndScore", () => {
  it("returns null when a cell has fewer than MIN_CELL_SIZE countries", () => {
    const matches = buildConstraintMatches();
    // area_gt_2M (≥2M km²) AND borders_solo (exactly 1 border): no such country
    const result = finalizeAndScore(
      ["area_gt_2M", "continent_oceania", "water_island"],
      ["borders_solo", "language_russian", "borders_min_7"],
      matches,
    );
    expect(result).toBeNull();
  });

  it("returns null when categoryCount < MIN_CATEGORIES", () => {
    const matches = buildConstraintMatches();
    // Only 3 categories: continent (2), area (2), language (2)
    const result = finalizeAndScore(
      ["continent_africa", "continent_asia", "area_gt_1M"],
      ["area_gt_500k", "language_arabic", "language_english"],
      matches,
    );
    expect(result).toBeNull();
  });

  it("returns difficulty within [0, 100]", () => {
    const matches = buildConstraintMatches();
    const allIds = CONSTRAINTS.map((c) => c.id);
    let found: ReturnType<typeof finalizeAndScore> = null;
    for (let i = 0; i < 500 && !found; i++) {
      const grid = tryBuildGrid(allIds, matches);
      if (grid) found = finalizeAndScore(grid.rows, grid.cols, matches);
    }
    expect(found).not.toBeNull();
    if (found) {
      expect(found.difficulty).toBeGreaterThanOrEqual(0);
      expect(found.difficulty).toBeLessThanOrEqual(100);
    }
  });

  it("returns integer difficulty", () => {
    const matches = buildConstraintMatches();
    const allIds = CONSTRAINTS.map((c) => c.id);
    let found: ReturnType<typeof finalizeAndScore> = null;
    for (let i = 0; i < 500 && !found; i++) {
      const grid = tryBuildGrid(allIds, matches);
      if (grid) found = finalizeAndScore(grid.rows, grid.cols, matches);
    }
    if (found) {
      expect(Number.isInteger(found.difficulty)).toBe(true);
    }
  });
});

// ─── tryBuildGrid ─────────────────────────────────────────────────────────────

describe("tryBuildGrid", () => {
  it("produces a valid grid using real dataset", () => {
    const matches = buildConstraintMatches();
    const allIds = CONSTRAINTS.map((c) => c.id);
    const result = tryBuildGrid(allIds, matches);

    expect(result).not.toBeNull();
    if (result) {
      expect(result.rows).toHaveLength(3);
      expect(result.cols).toHaveLength(3);
      // All 6 constraint IDs are distinct
      const all6 = new Set([...result.rows, ...result.cols]);
      expect(all6.size).toBe(6);
      // Each cell has >= MIN_CELL_SIZE valid countries
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const cell = intersect(result.rows[r], result.cols[c], matches);
          expect(cell.length).toBeGreaterThanOrEqual(MIN_CELL_SIZE);
        }
      }
    }
  });
});

// ─── generateBatch ────────────────────────────────────────────────────────────

describe("generateBatch", () => {
  it("generates candidates with no internal duplicates", () => {
    const batch = generateBatch(5, []);
    expect(batch.length).toBeGreaterThan(0);

    const sets = batch.map((g) => new Set([...g.rows, ...g.cols]));
    for (let i = 0; i < sets.length; i++) {
      for (let j = i + 1; j < sets.length; j++) {
        let shared = 0;
        for (const id of sets[i]) {
          if (sets[j].has(id)) shared++;
        }
        expect(shared).toBeLessThan(5); // MAX_SIMILAR_CONSTRAINTS
      }
    }
  });

  it("respects existing candidates when checking for duplicates", () => {
    const first = generateBatch(1, []);
    expect(first).toHaveLength(1);

    // Second batch should not produce a near-duplicate of the first
    const second = generateBatch(3, first);
    const firstSet = new Set([...first[0].rows, ...first[0].cols]);
    for (const candidate of second) {
      const candidateSet = new Set([...candidate.rows, ...candidate.cols]);
      let shared = 0;
      for (const id of candidateSet) {
        if (firstSet.has(id)) shared++;
      }
      expect(shared).toBeLessThan(5);
    }
  });
});

// ─── Stress test ──────────────────────────────────────────────────────────────

describe("stress test — 50 grids", () => {
  it("all candidates satisfy hard constraints", () => {
    const batch = generateBatch(50, []);

    for (const candidate of batch) {
      // 6 distinct constraint IDs
      const all6 = new Set([...candidate.rows, ...candidate.cols]);
      expect(all6.size).toBe(6);

      // At least MIN_CATEGORIES
      expect(candidate.metadata.categoryCount).toBeGreaterThanOrEqual(
        MIN_CATEGORIES,
      );

      // All cells >= MIN_CELL_SIZE
      expect(candidate.metadata.minCellSize).toBeGreaterThanOrEqual(
        MIN_CELL_SIZE,
      );

      // Difficulty in [0, 100]
      expect(candidate.difficulty).toBeGreaterThanOrEqual(0);
      expect(candidate.difficulty).toBeLessThanOrEqual(100);

      // validAnswers has 9 keys
      expect(Object.keys(candidate.validAnswers)).toHaveLength(9);
    }
  }, 60_000); // generous timeout for 50 grids
});
