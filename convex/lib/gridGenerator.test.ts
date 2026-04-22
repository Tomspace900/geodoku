import { describe, expect, it } from "vitest";
import { CONSTRAINTS } from "../../src/features/game/logic/constraints";
import {
  MIN_CATEGORIES,
  MIN_CELL_SIZE,
  buildConstraintMatches,
  computeCellRisks,
  finalizeAndScore,
  generateBatch,
  intersect,
  tryBuildGrid,
} from "./gridGenerator";

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

// ─── computeCellRisks ─────────────────────────────────────────────────────────

describe("computeCellRisks", () => {
  it("returns exp(-3) ≈ 0.05 when every cell has 3 disjoint solutions", () => {
    // 9 cells × 3 distinct countries → occ(k)=1 for every k → cellSafety=3
    const cellSolutions: string[][] = [];
    for (let i = 0; i < 9; i++) {
      cellSolutions.push([`C${i * 3 + 0}`, `C${i * 3 + 1}`, `C${i * 3 + 2}`]);
    }
    const risks = computeCellRisks(cellSolutions);
    for (const r of risks) {
      expect(r).toBeCloseTo(Math.exp(-3), 5);
    }
  });

  it("returns ≈ exp(-1/9) when 1 country is shared across all 9 cells", () => {
    // Every cell has only "FRA" → occ(FRA)=9, cellSafety=1/9
    const cellSolutions: string[][] = Array.from({ length: 9 }, () => ["FRA"]);
    const risks = computeCellRisks(cellSolutions);
    for (const r of risks) {
      expect(r).toBeCloseTo(Math.exp(-1 / 9), 5);
    }
  });

  it("returns 1 for an empty cell (full risk)", () => {
    const risks = computeCellRisks([[], ["FRA"], ["DEU"]]);
    expect(risks[0]).toBe(1);
  });

  it("maxCellRisk and avgCellRisk stay in (0, 1] on real generated grids (fuzz)", () => {
    const matches = buildConstraintMatches();
    const allIds = CONSTRAINTS.map((c) => c.id);
    let found = 0;
    for (let i = 0; i < 500 && found < 30; i++) {
      const grid = tryBuildGrid(allIds, matches);
      if (!grid) continue;
      const candidate = finalizeAndScore(grid.rows, grid.cols, matches);
      if (!candidate) continue;
      expect(candidate.metadata.maxCellRisk).toBeGreaterThan(0);
      expect(candidate.metadata.maxCellRisk).toBeLessThanOrEqual(1);
      expect(candidate.metadata.avgCellRisk).toBeGreaterThan(0);
      expect(candidate.metadata.avgCellRisk).toBeLessThanOrEqual(1);
      found++;
    }
    expect(found).toBeGreaterThan(0);
  });
});

// ─── finalizeAndScore ─────────────────────────────────────────────────────────

describe("finalizeAndScore", () => {
  it("returns null when a cell has fewer than MIN_CELL_SIZE countries", () => {
    const matches = buildConstraintMatches();
    const result = finalizeAndScore(
      ["area_gt_2M", "continent_oceania", "water_island"],
      ["borders_solo", "language_russian", "borders_min_7"],
      matches,
    );
    expect(result).toBeNull();
  });

  it("returns null when categoryCount < MIN_CATEGORIES", () => {
    const matches = buildConstraintMatches();
    // 3 catégories : continent (3), area (3) → seulement 2, doit être rejeté
    // avec MIN_CATEGORIES=4
    const result = finalizeAndScore(
      ["continent_africa", "continent_asia", "continent_europe"],
      ["area_gt_2M", "area_gt_500k", "area_lt_1k"],
      matches,
    );
    expect(result).toBeNull();
  });

  it("returns integer difficulty within [0, 100]", () => {
    const matches = buildConstraintMatches();
    const allIds = CONSTRAINTS.map((c) => c.id);
    let found: ReturnType<typeof finalizeAndScore> = null;
    for (let i = 0; i < 500 && !found; i++) {
      const grid = tryBuildGrid(allIds, matches);
      if (grid) found = finalizeAndScore(grid.rows, grid.cols, matches);
    }
    expect(found).not.toBeNull();
    if (found) {
      expect(Number.isInteger(found.difficulty)).toBe(true);
      expect(found.difficulty).toBeGreaterThanOrEqual(0);
      expect(found.difficulty).toBeLessThanOrEqual(100);
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
      const all6 = new Set([...result.rows, ...result.cols]);
      expect(all6.size).toBe(6);
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
        expect(shared).toBeLessThan(5);
      }
    }
  });

  it("respects existing candidates when checking for duplicates", () => {
    const first = generateBatch(1, []);
    expect(first).toHaveLength(1);

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

// ─── Weighted shuffle (constraintUsage) ───────────────────────────────────────

describe("generateBatch — weighted shuffle", () => {
  it("biases away from highly-used constraints (without excluding them)", () => {
    // Pénalise fortement les 6 continents — ils devraient être beaucoup moins
    // choisis qu'une baseline uniforme, mais pas totalement absents.
    const penalised = [
      "continent_africa",
      "continent_asia",
      "continent_europe",
      "continent_north_america",
      "continent_south_america",
      "continent_oceania",
    ];
    const usage: Record<string, number> = {};
    for (const id of penalised) usage[id] = 20; // poids ≈ 1/21

    const BATCH = 30;
    const biasedBatch = generateBatch(BATCH, [], usage);
    const uniformBatch = generateBatch(BATCH, []);

    function countContinent(batch: typeof biasedBatch): number {
      let c = 0;
      for (const g of batch) {
        for (const id of [...g.rows, ...g.cols]) {
          if (penalised.includes(id)) c++;
        }
      }
      return c;
    }

    const biasedCount = countContinent(biasedBatch);
    const uniformCount = countContinent(uniformBatch);

    // La version biaisée doit avoir strictement moins de continents que
    // l'uniforme — signal clair que la pondération agit.
    expect(biasedCount).toBeLessThan(uniformCount);
    expect(biasedBatch.length).toBeGreaterThan(0);
  }, 60_000);
});

// ─── Stress test ──────────────────────────────────────────────────────────────

describe("stress test — 50 grids", () => {
  it("all candidates satisfy hard constraints", () => {
    const batch = generateBatch(50, []);

    for (const candidate of batch) {
      // 6 distinct constraint IDs
      const all6 = new Set([...candidate.rows, ...candidate.cols]);
      expect(all6.size).toBe(6);

      // MIN_CATEGORIES (= 4) strictement respecté
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

      // Blocking risk agrégats dans [0, 1]
      expect(candidate.metadata.maxCellRisk).toBeGreaterThan(0);
      expect(candidate.metadata.maxCellRisk).toBeLessThanOrEqual(1);
      expect(candidate.metadata.avgCellRisk).toBeGreaterThan(0);
      expect(candidate.metadata.avgCellRisk).toBeLessThanOrEqual(1);
    }
  }, 60_000);

  it("difficulty spread couvre au moins 60 points sur 100 grilles", () => {
    const batch = generateBatch(100, []);
    expect(batch.length).toBeGreaterThanOrEqual(50);
    const diffs = batch.map((c) => c.difficulty);
    const spread = Math.max(...diffs) - Math.min(...diffs);
    expect(spread).toBeGreaterThanOrEqual(60);
  }, 120_000);
});
