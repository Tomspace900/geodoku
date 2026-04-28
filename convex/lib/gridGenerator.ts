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
  MAX_OVERLAP_BETWEEN_GRIDS,
  MAX_SAME_CATEGORY,
  MIN_CATEGORIES,
  MIN_CELL_SIZE,
  type PoolGridMetadata,
  TARGET_GRIDS_PER_SEED,
} from "./gridConstants";

const COUNTRIES: Country[] = countriesJson as Country[];

// Difficulty curve: `raw` includes cardinality, constraint weights, and the
// popularity multiplier; then maps through 1 − exp(−raw × DIFFICULTY_CURVE_K).
const DIFFICULTY_CURVE_K = 0.8;

// Popularity dampener: shifts raw difficulty toward easier cells when the
// solution pool is well-known (top-K average popularity closer to 1).
// 0 = ignore popularity; 1 = ±50% raw scale at extremes (pop factor 1.5 vs 0.5 vs base).
const POPULARITY_WEIGHT = 0.6;

/** Average this many highest-known candidates in each cell pool. */
const POPULARITY_TOP_K = 3;

// Constraint → category/difficulty lookups, built once at module load.
const CATEGORY_BY_ID: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const c of CONSTRAINTS) map[c.id] = c.category;
  return map;
})();

const DIFFICULTY_BY_ID: Record<string, "easy" | "medium" | "hard"> = (() => {
  const map: Record<string, "easy" | "medium" | "hard"> = {};
  for (const c of CONSTRAINTS) map[c.id] = c.difficulty;
  return map;
})();

/** ISO3 → percentile popularity [0..1] from bundled countries dataset. */
const POPULARITY_BY_CODE: Record<string, number> = (() => {
  const map: Record<string, number> = {};
  for (const country of COUNTRIES) {
    map[country.code] = country.popularityIndex ?? 0.5;
  }
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
 * Checks MAX_SAME_CATEGORY and cell-size hard filters at each step.
 * The seed is already in rows or cols when this is called.
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

// ─── Difficulty scoring ───────────────────────────────────────────────────────

/**
 * Mean popularity of the K best-known countries in `codes` (ISO3).
 * Empty pool → median fallback so callers never propagate NaNs.
 */
export function topKPopularity(codes: string[], k = POPULARITY_TOP_K): number {
  if (codes.length === 0) return 0.5;

  const pops = codes
    .map((code) => POPULARITY_BY_CODE[code] ?? 0.5)
    .sort((a, b) => b - a);
  const slice = pops.slice(0, Math.min(k, pops.length));
  return slice.reduce((sum, p) => sum + p, 0) / slice.length;
}

/**
 * Difficulty of a single cell: constraint weights, solution cardinality, and a
 * popularity-aware dampener on the raw score (easier well-known pools).
 * Returns an integer in [0, 100].
 */
export function computeCellDifficulty(
  rowId: string,
  colId: string,
  matches: Record<string, Set<string>>,
): number {
  const solutions = intersect(rowId, colId, matches);
  if (solutions.length === 0) return 100;

  const diffWeight = { easy: 1, medium: 2, hard: 3 } as const;
  const rowDiff = diffWeight[DIFFICULTY_BY_ID[rowId] ?? "medium"];
  const colDiff = diffWeight[DIFFICULTY_BY_ID[colId] ?? "medium"];

  const baseRaw = (1 / solutions.length) * rowDiff * colDiff;
  const pop = topKPopularity(solutions);
  const popFactor = Math.max(0, 1 + POPULARITY_WEIGHT * (0.5 - pop));
  const raw = baseRaw * popFactor;

  return Math.min(
    100,
    Math.max(0, Math.round(100 * (1 - Math.exp(-raw * DIFFICULTY_CURVE_K)))),
  );
}

/**
 * Average cell difficulty across all 9 cells of a 3×3 grid.
 */
export function computeGridDifficulty(
  rows: string[],
  cols: string[],
  matches: Record<string, Set<string>>,
): number {
  let total = 0;
  for (const rowId of rows) {
    for (const colId of cols) {
      total += computeCellDifficulty(rowId, colId, matches);
    }
  }
  return Math.round(total / (rows.length * cols.length));
}

// ─── Finalization ─────────────────────────────────────────────────────────────

/**
 * Validates a grid and computes its PoolGridMetadata.
 * Hard filters applied:
 *   - All 9 cells: MIN_CELL_SIZE ≤ size ≤ MAX_CELL_SIZE
 *   - ≥ MIN_CATEGORIES distinct constraint categories
 *   - ≤ MAX_SAME_CATEGORY per category
 * Returns null if any filter fails.
 */
export function finalizeGrid(
  rows: string[],
  cols: string[],
  seedId: string,
  matches: Record<string, Set<string>>,
): FinalizedPoolGrid | null {
  const validAnswers: Record<string, string[]> = {};
  const cellDifficulties: number[] = [];
  let minCellSize = Number.POSITIVE_INFINITY;
  let totalCellSize = 0;
  const countryPoolSet = new Set<string>();

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const solutions = intersect(rows[r], cols[c], matches);
      const size = solutions.length;
      if (size < MIN_CELL_SIZE || size > MAX_CELL_SIZE) return null;

      validAnswers[`${r},${c}`] = solutions;
      cellDifficulties.push(computeCellDifficulty(rows[r], cols[c], matches));
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

  const avgCellSize = Math.round((totalCellSize / 9) * 10) / 10;
  const difficultyEstimate = Math.round(
    cellDifficulties.reduce((s, d) => s + d, 0) / cellDifficulties.length,
  );

  const difficultyTags = { easy: 0, medium: 0, hard: 0 };
  for (const d of cellDifficulties) {
    if (d <= 33) difficultyTags.easy++;
    else if (d <= 66) difficultyTags.medium++;
    else difficultyTags.hard++;
  }

  const metadata: PoolGridMetadata = {
    seedConstraint: seedId,
    constraintIds: allIds,
    categories,
    avgCellSize,
    minCellSize: minCellSize === Number.POSITIVE_INFINITY ? 0 : minCellSize,
    countryPool: [...countryPoolSet],
    difficultyEstimate,
    difficultyTags,
    cellDifficulties,
  };

  return { rows, cols, validAnswers, metadata };
}

// ─── Pool generation ──────────────────────────────────────────────────────────

/**
 * Generates a diverse pool of grids, one seed per constraint.
 * Constraint at even index → seed in row[0]; odd index → seed in col[0].
 * Grids sharing ≥ MAX_OVERLAP_BETWEEN_GRIDS constraints with any existing pool grid are skipped.
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

    if (succeeded < 5) {
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
      failed: succeeded < 5,
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
