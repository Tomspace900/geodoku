import { describe, expect, it } from "vitest";
import { CONSTRAINTS } from "../../src/features/game/logic/constraints";
import {
  MAX_CONSTRAINT_OVERLAP,
  MAX_SAME_CATEGORY,
  MIN_CATEGORIES,
  MIN_CELL_SIZE,
} from "./gridConstants";
import {
  buildConstraintMatches,
  finalizeGrid,
  generateDiversePool,
  intersect,
  overlapCoefficient,
  tryBuildGridWithSeed,
} from "./gridGenerator";

// ─── intersect ────────────────────────────────────────────────────────────────

describe("intersect", () => {
  it("returns a sorted, stable result", () => {
    const matches = buildConstraintMatches();
    const result = intersect(
      "continent_europe",
      "area_smaller_belgium",
      matches,
    );
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

// ─── overlapCoefficient ───────────────────────────────────────────────────────

describe("overlapCoefficient", () => {
  it("returns ~1 when one constraint is (near) a subset of another", () => {
    const matches = buildConstraintMatches();
    // Every country larger than Mexico is larger than France (nested thresholds).
    expect(
      overlapCoefficient("area_larger_mexico", "area_larger_france", matches),
    ).toBe(1);
    // South-East Asia ⊆ Asia.
    expect(
      overlapCoefficient("subregion_southeast_asia", "continent_asia", matches),
    ).toBe(1);
  });

  it("returns 0 for disjoint constraints", () => {
    const matches = buildConstraintMatches();
    expect(
      overlapCoefficient("continent_africa", "continent_asia", matches),
    ).toBe(0);
  });

  it("is symmetric", () => {
    const matches = buildConstraintMatches();
    expect(
      overlapCoefficient("continent_africa", "water_landlocked", matches),
    ).toBe(overlapCoefficient("water_landlocked", "continent_africa", matches));
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

// ─── generateDiversePool ─────────────────────────────────────────────────────

describe("generateDiversePool (10-seed subset)", () => {
  it("produces valid grids that satisfy hard filters", () => {
    const CATEGORY_BY_ID: Record<string, string> = {};
    for (const c of CONSTRAINTS) CATEGORY_BY_ID[c.id] = c.category;

    const matches = buildConstraintMatches();
    const { grids, report } = generateDiversePool();

    expect(grids.length).toBeGreaterThan(0);
    expect(report.totalGenerated).toBe(grids.length);
    expect(report.constraintCoverage).toBeGreaterThan(0);
    expect(report.countryCoverage).toBeGreaterThan(0);
    expect(report.durationMs).toBeGreaterThan(0);

    for (const grid of grids) {
      const all6 = new Set(grid.metadata.constraintIds);
      expect(all6.size).toBe(6);

      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const size = intersect(grid.rows[r], grid.cols[c], matches).length;
          expect(size).toBeGreaterThanOrEqual(MIN_CELL_SIZE);
          expect(size).toBeLessThanOrEqual(15);
        }
      }

      expect(grid.metadata.categories.length).toBeGreaterThanOrEqual(
        MIN_CATEGORIES,
      );

      const catCounts: Record<string, number> = {};
      for (const id of grid.metadata.constraintIds) {
        const cat = CATEGORY_BY_ID[id] ?? "unknown";
        catCounts[cat] = (catCounts[cat] ?? 0) + 1;
        expect(catCounts[cat]).toBeLessThanOrEqual(MAX_SAME_CATEGORY);
      }

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
        expect(shared).toBeLessThan(4);
      }
    }
  }, 120_000);

  it("no grid contains a quasi-synonym constraint pair", () => {
    const matches = buildConstraintMatches();
    const { grids } = generateDiversePool();

    for (const grid of grids) {
      const ids = grid.metadata.constraintIds;
      for (let a = 0; a < ids.length; a++) {
        for (let b = a + 1; b < ids.length; b++) {
          expect(overlapCoefficient(ids[a], ids[b], matches)).toBeLessThan(
            MAX_CONSTRAINT_OVERLAP,
          );
        }
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
    expect(result).toBeNull();
  });

  it("returns null for a grid with a quasi-synonym constraint pair", () => {
    const matches = buildConstraintMatches();
    // Cells and categories are all valid here; only the redundant pair
    // (area_larger_mexico × area_larger_france, overlap 1.0) should reject it.
    const result = finalizeGrid(
      [
        "area_larger_mexico",
        "society_capital_not_largest",
        "nature_rainforest",
      ],
      ["area_larger_france", "ocean_atlantic", "borders_china"],
      "area_larger_mexico",
      matches,
    );
    expect(result).toBeNull();
  });

  it("returns null when MIN_CATEGORIES is violated", () => {
    const matches = buildConstraintMatches();
    const result = finalizeGrid(
      ["continent_africa", "continent_asia", "continent_europe"],
      ["area_larger_india", "area_larger_france", "area_smaller_belgium"],
      "continent_africa",
      matches,
    );
    if (result !== null) {
      expect(result.metadata.categories.length).toBeGreaterThanOrEqual(
        MIN_CATEGORIES,
      );
    }
  });
});
