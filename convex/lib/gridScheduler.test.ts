import { describe, expect, it } from "vitest";
import {
  KNOWN_CONSTRAINT_WINDOW,
  type PoolGridMetadata,
} from "./gridConstants";
import { selectNextGrid } from "./gridScheduler";

function makeGrid(
  id: string,
  constraintIds: string[],
  countryPool: string[],
  difficultyEstimate = 40,
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

    // grid2 should win: it carries no overuse penalty.
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

  // A mature history: KNOWN_CONSTRAINT_WINDOW grids over the established set e1..e6.
  const matureHistory = Array.from({ length: KNOWN_CONSTRAINT_WINDOW }, () => ({
    constraintIds: ["e1", "e2", "e3", "e4", "e5", "e6"],
    countryPool: [] as string[],
  }));

  it("caps newcomers per grid once the history is mature", () => {
    // n1,n2 never appear in the mature history → newcomers; e* are established.
    // gridBad packs 2 newcomers → would win on freshness, but is filtered out.
    const gridBad = makeGrid("bad", ["n1", "n2", "e1", "e2", "e3", "e4"], []);
    // gridGood introduces only 1 newcomer → eligible.
    const gridGood = makeGrid("good", ["n1", "e1", "e2", "e3", "e4", "e5"], []);

    const result = selectNextGrid([gridBad, gridGood], matureHistory);
    expect(result!.grid._id).toBe("good");
  });

  it("does not cap newcomers before the history is mature (from-scratch seeding)", () => {
    // Same pool as above, but history one grid short of mature → guard skipped, so the
    // newcomer-heavier grid wins on freshness instead of being filtered out.
    const shortHistory = matureHistory.slice(0, KNOWN_CONSTRAINT_WINDOW - 1);
    const gridBad = makeGrid("bad", ["n1", "n2", "e1", "e2", "e3", "e4"], []);
    const gridGood = makeGrid("good", ["n1", "e1", "e2", "e3", "e4", "e5"], []);

    const result = selectNextGrid([gridBad, gridGood], shortHistory);
    expect(result!.grid._id).toBe("bad");
  });
});
