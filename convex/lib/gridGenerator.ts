/**
 * Pure TypeScript grid generation — no Convex runtime dependencies.
 * Safe to import in Convex actions and in Vitest tests alike.
 */
import countriesJson from "../../src/features/countries/data/countries.json";
import type { Country } from "../../src/features/countries/types";
import { CONSTRAINTS } from "../../src/features/game/logic/constraints";
import {
  type FinalizedPoolGrid,
  type GenerationReport,
  MAX_ATTEMPTS_PER_SEED,
  MAX_CELL_SIZE,
  MAX_CONSTRAINT_OVERLAP,
  MAX_OVERLAP_BETWEEN_GRIDS,
  MAX_SAME_CATEGORY,
  MIN_CATEGORIES,
  MIN_CELL_SIZE,
  MIN_VIABLE_GRIDS_PER_SEED,
  type PoolGridMetadata,
  TARGET_GRIDS_PER_SEED,
} from "./gridConstants";

const COUNTRIES: Country[] = countriesJson as Country[];

// Constraint → category lookup, built once at module load.
const CATEGORY_BY_ID: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const c of CONSTRAINTS) map[c.id] = c.category;
  return map;
})();

// ─── Core: constraint matching ────────────────────────────────────────────────

/**
 * For each constraint, compute the set of ISO3 codes that satisfy it.
 * Called once per generation run.
 */
export function buildConstraintMatches(): Record<string, Set<string>> {
  const result: Record<string, Set<string>> = {};
  for (const constraint of CONSTRAINTS) {
    const matching = new Set<string>();
    for (const country of COUNTRIES) {
      if (constraint.predicate(country)) {
        matching.add(country.code);
      }
    }
    result[constraint.id] = matching;
  }
  return result;
}

/**
 * Returns ISO3 codes valid for the cell (rowId × colId), sorted alphabetically.
 */
export function intersect(
  rowId: string,
  colId: string,
  matches: Record<string, Set<string>>,
): string[] {
  const rowSet = matches[rowId];
  const colSet = matches[colId];
  if (!rowSet || !colSet) return [];
  const result: string[] = [];
  for (const code of rowSet) {
    if (colSet.has(code)) result.push(code);
  }
  return result.sort();
}

/**
 * Overlap coefficient between two constraints' country sets: |A∩B| / min(|A|,|B|).
 * Containment-based (not Jaccard) on purpose: it detects quasi-inclusion — when
 * one constraint is almost a subset of another, knowing one nearly tells you the
 * other, which makes a grid thematically redundant ("just name Caribbean islands").
 * Jaccard would dilute that signal when the two sets differ a lot in size.
 * Returns 0 if either set is empty (no meaningful overlap to measure).
 */
export function overlapCoefficient(
  idA: string,
  idB: string,
  matches: Record<string, Set<string>>,
): number {
  const setA = matches[idA];
  const setB = matches[idB];
  if (!setA || !setB || setA.size === 0 || setB.size === 0) return 0;
  const [small, large] = setA.size <= setB.size ? [setA, setB] : [setB, setA];
  let shared = 0;
  for (const code of small) {
    if (large.has(code)) shared++;
  }
  return shared / small.size;
}

// ─── Backtracking (seed-first) ────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Recursive backtracking: fills rows to 3, then cols to 3.
 * Checks MAX_SAME_CATEGORY, anti-redundancy (overlap coefficient) and cell-size
 * hard filters at each step. The seed is already in rows or cols when this is called.
 *
 * Note: the MAX_CELL_SIZE check below is also what makes broad constraints
 * self-regulating — a constraint matching many countries can only pair with
 * narrow orthogonal partners (else the cell exceeds 15), so it lands in few
 * grids. This is why no usage-weighting / appearance cap is needed (see
 * generateDiversePool).
 *
 * The overlap-coefficient check prunes quasi-synonym constraints early so the
 * backtracking finds a varied partner instead of discarding the whole attempt.
 * It runs against *all* placed constraints (both axes): redundancy is intrinsic
 * to a constraint pair, independent of whether they form a cell together.
 */
function fillSlots(
  rows: string[],
  cols: string[],
  remaining: string[],
  matches: Record<string, Set<string>>,
): { rows: string[]; cols: string[] } | null {
  if (rows.length === 3 && cols.length === 3) return { rows, cols };

  const fillingRows = rows.length < 3;
  const candidates = shuffle([...remaining]);

  for (const id of candidates) {
    // Category saturation: reject if this category is already at MAX_SAME_CATEGORY
    const allPlaced = [...rows, ...cols];
    const cat = CATEGORY_BY_ID[id] ?? "unknown";
    const catCount = allPlaced.filter(
      (pid) => (CATEGORY_BY_ID[pid] ?? "unknown") === cat,
    ).length;
    if (catCount >= MAX_SAME_CATEGORY) continue;

    // Anti-redundancy: reject a quasi-synonym of any already-placed constraint
    const redundant = allPlaced.some(
      (pid) => overlapCoefficient(id, pid, matches) >= MAX_CONSTRAINT_OVERLAP,
    );
    if (redundant) continue;

    // Cell-size check against already-placed orthogonal constraints
    const valid = fillingRows
      ? cols.every((colId) => {
          const size = intersect(id, colId, matches).length;
          return size >= MIN_CELL_SIZE && size <= MAX_CELL_SIZE;
        })
      : rows.every((rowId) => {
          const size = intersect(rowId, id, matches).length;
          return size >= MIN_CELL_SIZE && size <= MAX_CELL_SIZE;
        });

    if (!valid) continue;

    const newRemaining = remaining.filter((r) => r !== id);
    const result = fillSlots(
      fillingRows ? [...rows, id] : rows,
      fillingRows ? cols : [...cols, id],
      newRemaining,
      matches,
    );
    if (result) return result;
  }

  return null;
}

/**
 * Attempts to build a grid with seedId fixed at rows[0] ("row") or cols[0] ("col").
 * Fills the remaining 5 slots via backtracking with random shuffle.
 */
export function tryBuildGridWithSeed(
  seedId: string,
  seedPosition: "row" | "col",
  matches: Record<string, Set<string>>,
): { rows: string[]; cols: string[] } | null {
  const remaining = CONSTRAINTS.map((c) => c.id as string).filter(
    (id) => id !== seedId,
  );

  // "row": start with rows=[seed], fill rows[1..2] then cols[0..2]
  // "col": start with cols=[seed], fill rows[0..2] then cols[1..2]
  if (seedPosition === "row") {
    return fillSlots([seedId], [], remaining, matches);
  }
  return fillSlots([], [seedId], remaining, matches);
}

// ─── Finalization ─────────────────────────────────────────────────────────────

/**
 * Validates a grid and computes its PoolGridMetadata.
 * Hard filters applied:
 *   - All 9 cells: MIN_CELL_SIZE ≤ size ≤ MAX_CELL_SIZE
 *   - ≥ MIN_CATEGORIES distinct constraint categories
 *   - ≤ MAX_SAME_CATEGORY per category
 *   - no constraint pair with overlap coefficient ≥ MAX_CONSTRAINT_OVERLAP
 * Returns null if any filter fails. The overlap check duplicates the
 * backtracking pruning on purpose (belt-and-suspenders, like the category check)
 * so finalizeGrid is safe to call directly with an arbitrary grid.
 */
export function finalizeGrid(
  rows: string[],
  cols: string[],
  seedId: string,
  matches: Record<string, Set<string>>,
): FinalizedPoolGrid | null {
  const validAnswers: Record<string, string[]> = {};
  let minCellSize = Number.POSITIVE_INFINITY;
  let totalCellSize = 0;
  const countryPoolSet = new Set<string>();

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const solutions = intersect(rows[r], cols[c], matches);
      const size = solutions.length;
      if (size < MIN_CELL_SIZE || size > MAX_CELL_SIZE) return null;

      validAnswers[`${r},${c}`] = solutions;
      minCellSize = Math.min(minCellSize, size);
      totalCellSize += size;
      for (const code of solutions) countryPoolSet.add(code);
    }
  }

  const allIds = [...rows, ...cols];

  // Category checks (final enforcement — backtracking only enforces MAX_SAME_CATEGORY)
  const catCounts: Record<string, number> = {};
  for (const id of allIds) {
    const cat = CATEGORY_BY_ID[id] ?? "unknown";
    catCounts[cat] = (catCounts[cat] ?? 0) + 1;
    if (catCounts[cat] > MAX_SAME_CATEGORY) return null;
  }
  const categories = Object.keys(catCounts);
  if (categories.length < MIN_CATEGORIES) return null;

  // Anti-redundancy (final enforcement): no quasi-synonym pair in the grid.
  for (let i = 0; i < allIds.length; i++) {
    for (let j = i + 1; j < allIds.length; j++) {
      if (
        overlapCoefficient(allIds[i], allIds[j], matches) >=
        MAX_CONSTRAINT_OVERLAP
      ) {
        return null;
      }
    }
  }

  const avgCellSize = Math.round((totalCellSize / 9) * 10) / 10;

  const metadata: PoolGridMetadata = {
    seedConstraint: seedId,
    constraintIds: allIds,
    categories,
    avgCellSize,
    minCellSize: minCellSize === Number.POSITIVE_INFINITY ? 0 : minCellSize,
    countryPool: [...countryPoolSet],
  };

  return { rows, cols, validAnswers, metadata };
}

// ─── Pool generation ──────────────────────────────────────────────────────────

/**
 * Generates a diverse pool of grids, one seed per constraint.
 * Constraint at even index → seed in row[0]; odd index → seed in col[0].
 * Grids sharing ≥ MAX_OVERLAP_BETWEEN_GRIDS constraints with any existing pool grid are skipped.
 *
 * No per-constraint usage-weighting or appearance cap on purpose. Constraint
 * over-representation is already bounded by the hard filters: MAX_CELL_SIZE
 * confines broad constraints to narrow partners (≤~24% pool share for the most
 * frequent), and the scheduler diversifies against published history anyway.
 * Both a usage-weighted candidate order and a MAX_CONSTRAINT_SHARE cap were
 * tried (2026-06) and reverted: the first is marginal (and collapses the pool
 * if made strict, via MAX_OVERLAP), the second starves narrow seeds that depend
 * on broad partners. Measure with `scripts/prod/analyze-pool.ts` before adding
 * any such mechanism.
 *
 * Distinct from the above: MAX_CONSTRAINT_OVERLAP (applied in fillSlots +
 * finalizeGrid) bounds *intra-grid* redundancy — how much two constraints of the
 * same grid overlap — not a constraint's share of the pool.
 */
export function generateDiversePool(
  existingPool: Array<{ constraintIds: string[] }> = [],
): { grids: FinalizedPoolGrid[]; report: GenerationReport } {
  const startMs = Date.now();
  const matches = buildConstraintMatches();

  const pool: FinalizedPoolGrid[] = [];
  const allPoolSets: Set<string>[] = existingPool.map(
    (g) => new Set(g.constraintIds),
  );

  const seedResults: GenerationReport["seedResults"] = [];

  CONSTRAINTS.forEach((constraint, index) => {
    const seedId = constraint.id;
    const seedPosition: "row" | "col" = index % 2 === 0 ? "row" : "col";
    let attempted = 0;
    let succeeded = 0;

    while (
      succeeded < TARGET_GRIDS_PER_SEED &&
      attempted < MAX_ATTEMPTS_PER_SEED
    ) {
      attempted++;

      const gridResult = tryBuildGridWithSeed(seedId, seedPosition, matches);
      if (!gridResult) continue;

      const finalized = finalizeGrid(
        gridResult.rows,
        gridResult.cols,
        seedId,
        matches,
      );
      if (!finalized) continue;

      // Reject if too similar to any existing pool grid
      const candidateSet = new Set(finalized.metadata.constraintIds);
      const tooSimilar = allPoolSets.some((existingSet) => {
        let shared = 0;
        for (const id of candidateSet) {
          if (existingSet.has(id)) shared++;
        }
        return shared >= MAX_OVERLAP_BETWEEN_GRIDS;
      });
      if (tooSimilar) continue;

      pool.push(finalized);
      allPoolSets.push(candidateSet);
      succeeded++;
    }

    if (succeeded < MIN_VIABLE_GRIDS_PER_SEED) {
      console.warn(
        `CONSTRAINT ${seedId} FAILED: only ${succeeded}/${TARGET_GRIDS_PER_SEED} grids. This constraint may be structurally orphaned. Consider removing or reworking it.`,
      );
    } else {
      console.log(
        `[generateDiversePool] Seed ${seedId}: ${succeeded}/${TARGET_GRIDS_PER_SEED} in ${attempted} attempts`,
      );
    }

    seedResults.push({
      constraintId: seedId,
      attempted,
      succeeded,
      failed: succeeded < MIN_VIABLE_GRIDS_PER_SEED,
    });
  });

  const countrySet = new Set<string>();
  for (const grid of pool) {
    for (const code of grid.metadata.countryPool) countrySet.add(code);
  }

  return {
    grids: pool,
    report: {
      totalGenerated: pool.length,
      seedResults,
      constraintCoverage:
        seedResults.filter((r) => r.succeeded > 0).length / CONSTRAINTS.length,
      countryCoverage: countrySet.size,
      durationMs: Date.now() - startMs,
    },
  };
}
