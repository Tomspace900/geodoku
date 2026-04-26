import { describe, expect, it } from "vitest";
import {
  FRESH_CONSTRAINT_BONUS,
  FRESH_COUNTRY_BONUS,
  OVERUSE_CONSTRAINT_MALUS,
  type PoolGridMetadata,
  TARGET_DIFFICULTY,
} from "./gridConstants";
import { selectNextGrid } from "./gridScheduler";

function makeGrid(
  id: string,
  constraintIds: string[],
  countryPool: string[],
  difficultyEstimate = TARGET_DIFFICULTY,
): {
  _id: string;
  rows: string[];
  cols: string[];
  validAnswers: Record<string, string[]>;
  metadata: PoolGridMetadata;
} {
  const rows = constraintIds.slice(0, 3);
  const cols = constraintIds.slice(3, 6);
  return {
    _id: id,
    rows,
    cols,
    validAnswers: {},
    metadata: {
      seedConstraint: constraintIds[0],
      constraintIds,
      categories: ["cat_a", "cat_b", "cat_c", "cat_d"],
      avgCellSize: 5,
      minCellSize: 3,
      countryPool,
      difficultyEstimate,
      difficultyTags: { easy: 3, medium: 3, hard: 3 },
      cellDifficulties: Array(9).fill(difficultyEstimate),
    },
  };
}

// ─── selectNextGrid ───────────────────────────────────────────────────────────

describe("selectNextGrid", () => {
  it("returns null for an empty pool", () => {
    expect(selectNextGrid([], [])).toBeNull();
  });

  it("returns a valid grid when history is empty", () => {
    const grid = makeGrid(
      "g1",
      ["a", "b", "c", "d", "e", "f"],
      ["FR", "DE", "ES"],
    );
    const result = selectNextGrid([grid], []);
    expect(result).not.toBeNull();
    expect(result!.grid._id).toBe("g1");
  });

  it("prefers the grid with more fresh constraints", () => {
    // history uses constraints a, b, c, d, e once each
    const recent = [
      { constraintIds: ["a", "b", "c", "d", "e", "x"], countryPool: [] },
    ];

    // grid1: 1 fresh constraint (f is new)
    const grid1 = makeGrid("g1", ["a", "b", "c", "d", "e", "f"], []);
    // grid2: 3 fresh constraints (p, q, r are new)
    const grid2 = makeGrid("g2", ["a", "b", "c", "p", "q", "r"], []);

    const result = selectNextGrid([grid1, grid2], recent);
    expect(result!.grid._id).toBe("g2");
  });

  it("prefers the grid closest to TARGET_DIFFICULTY", () => {
    const far = makeGrid("far", ["a", "b", "c", "d", "e", "f"], [], 90);
    const close = makeGrid(
      "close",
      ["g", "h", "i", "j", "k", "l"],
      [],
      TARGET_DIFFICULTY + 5,
    );

    // Both are equally fresh (no recent history). Difficulty is the tiebreaker.
    const result = selectNextGrid([far, close], []);
    expect(result!.grid._id).toBe("close");
  });

  it("penalizes a grid whose constraints appear more than twice in recent history", () => {
    // Constraint "a" appears 3 times → overuse penalty triggers (>2 → excess = 1)
    const recent = [
      { constraintIds: ["a", "b", "c", "d", "e", "f"], countryPool: [] },
      { constraintIds: ["a", "g", "h", "i", "j", "k"], countryPool: [] },
      { constraintIds: ["a", "l", "m", "n", "o", "p"], countryPool: [] },
    ];

    // grid1 uses "a" heavily → penalized
    const grid1 = makeGrid("g1", ["a", "b", "c", "d", "e", "f"], []);
    // grid2 uses fresh constraints → no penalty
    const grid2 = makeGrid("g2", ["z1", "z2", "z3", "z4", "z5", "z6"], []);

    // Both grids need same difficulty proximity. grid2 should win due to no overuse penalty.
    const result = selectNextGrid([grid1, grid2], recent);
    expect(result!.grid._id).toBe("g2");
  });

  it("adds country freshness bonus to grids with new countries", () => {
    // recent history exhausts some countries
    const recent = [
      { constraintIds: [], countryPool: ["FR", "DE", "ES", "IT", "PT"] },
    ];

    // grid1: only stale countries
    const grid1 = makeGrid(
      "g1",
      ["a", "b", "c", "d", "e", "f"],
      ["FR", "DE", "ES"],
    );
    // grid2: all fresh countries — same constraints → freshness bonus should push grid2 ahead
    const grid2 = makeGrid(
      "g2",
      ["a", "b", "c", "d", "e", "f"],
      ["JP", "KR", "CN"],
    );

    const result = selectNextGrid([grid1, grid2], recent);
    expect(result!.grid._id).toBe("g2");
  });
});
