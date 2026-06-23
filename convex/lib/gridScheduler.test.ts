import { describe, expect, it } from "vitest";
import {
  BONUS_TIERS,
  KNOWN_CONSTRAINT_WINDOW,
  type PoolGridMetadata,
} from "./gridConstants";
import { selectNextGrid } from "./gridScheduler";

function makeGrid(
  id: string,
  constraintIds: string[],
): {
  _id: string;
  rows: string[];
  cols: string[];
  metadata: PoolGridMetadata;
} {
  const rows = constraintIds.slice(0, 3);
  const cols = constraintIds.slice(3, 6);
  return {
    _id: id,
    rows,
    cols,
    metadata: {
      seedConstraint: constraintIds[0],
      constraintIds,
      categories: ["cat_a", "cat_b", "cat_c", "cat_d"],
      avgCellSize: 5,
      minCellSize: 3,
      countryPool: [],
    },
  };
}

const recent = (ids: string[]) => ({
  rows: ids.slice(0, 3),
  cols: ids.slice(3, 6),
});
const unrelated = () => recent(["u1", "u2", "u3", "u4", "u5", "u6"]);

// ─── selectNextGrid ───────────────────────────────────────────────────────────

describe("selectNextGrid", () => {
  it("returns null for an empty pool", () => {
    expect(selectNextGrid([], [])).toBeNull();
  });

  it("applies the full freshness bonus when history is empty", () => {
    const grid = makeGrid("g1", ["a", "b", "c", "d", "e", "f"]);
    const result = selectNextGrid([grid], []);
    expect(result!.grid._id).toBe("g1");
    // empty history → all 6 constraints at the top staleness tier, zero malus.
    expect(result!.score).toBe(6 * BONUS_TIERS[BONUS_TIERS.length - 1]);
  });

  it("excludes a grid reusing a constraint seen yesterday (recency gap)", () => {
    const history = [recent(["a", "b", "c", "d", "e", "f"])];
    const grid1 = makeGrid("g1", ["a", "p", "q", "r", "s", "t"]); // reuses "a"
    const grid2 = makeGrid("g2", ["p", "q", "r", "s", "t", "u"]); // nothing recent
    expect(selectNextGrid([grid1, grid2], history)!.grid._id).toBe("g2");
  });

  it("excludes a grid repeating a crossing within the window", () => {
    // "a×d" is a cell of the day-before grid; the gap shield (unrelated yesterday)
    // keeps a,d eligible so only the crossing filter can reject grid1.
    const history = [unrelated(), recent(["a", "b", "c", "d", "e", "f"])];
    const grid1 = makeGrid("g1", ["a", "p", "q", "d", "r", "s"]); // a×d crossing
    const grid2 = makeGrid("g2", ["a", "d", "p", "q", "r", "s"]); // a,d both rows → no a×d
    expect(selectNextGrid([grid1, grid2], history)!.grid._id).toBe("g2");
  });

  it("prefers the grid sharing the fewest constraints with recent grids", () => {
    const history = [unrelated(), recent(["a", "b", "c", "d", "e", "f"])];
    const grid1 = makeGrid("g1", ["a", "b", "c", "p", "q", "r"]); // shares 3
    const grid2 = makeGrid("g2", ["p", "q", "r", "s", "t", "u"]); // shares 0
    expect(selectNextGrid([grid1, grid2], history)!.grid._id).toBe("g2");
  });

  it("caps newcomers per grid once the history is mature", () => {
    // u-grids fill the recency window (indices 0..14) so a,b,c,d,e are only seen
    // in OLD history (≥15 days) — established (not newcomers) but free of gap /
    // crossing / overlap interference. n1, n2 never appear → newcomers.
    const history = [
      ...Array.from({ length: 15 }, unrelated),
      ...Array.from({ length: KNOWN_CONSTRAINT_WINDOW - 15 }, () =>
        recent(["e1", "e2", "e3", "e4", "e5", "e6"]),
      ),
    ];
    const gridBad = makeGrid("bad", ["n1", "n2", "e1", "e2", "e3", "e4"]);
    const gridGood = makeGrid("good", ["n1", "e1", "e2", "e3", "e4", "e5"]);
    expect(selectNextGrid([gridBad, gridGood], history)!.grid._id).toBe("good");
  });

  it("does not cap newcomers before the history is mature", () => {
    // Short history → cold-start guard skipped, so the newcomer-heavier grid is not
    // filtered; it wins by sharing fewer constraints with the window.
    const history = [
      unrelated(),
      recent(["e5", "e6", "w1", "w2", "w3", "w4"]), // shares e5 with gridGood
      ...Array.from({ length: 8 }, unrelated),
    ];
    const gridBad = makeGrid("bad", ["n1", "n2", "e1", "e2", "e3", "e4"]);
    const gridGood = makeGrid("good", ["n1", "e1", "e2", "e3", "e4", "e5"]);
    expect(selectNextGrid([gridBad, gridGood], history)!.grid._id).toBe("bad");
  });
});
