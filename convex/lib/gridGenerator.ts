/**
 * Pure TypeScript grid generation — no Convex runtime dependencies.
 * Safe to import in Convex actions and in Vitest tests alike.
 */
import countriesJson from "../../src/features/countries/data/countries.json";
import type { Country } from "../../src/features/countries/types";
import { CONSTRAINTS } from "../../src/features/game/logic/constraints";

const COUNTRIES: Country[] = countriesJson as Country[];

// ─── Constants ────────────────────────────────────────────────────────────────

export const MIN_CELL_SIZE = 3;
export const MIN_CATEGORIES = 4;
const MAX_SIMILAR_CONSTRAINTS = 5; // grids sharing ≥5/6 constraints are considered duplicates

// ─── Types ────────────────────────────────────────────────────────────────────

export type GridMetadata = {
  minCellSize: number;
  maxCellSize: number;
  avgCellSize: number;
  categoryCount: number;
  avgObscurity: number;
};

export type GridCandidate = {
  rows: string[]; // 3 constraint IDs
  cols: string[]; // 3 constraint IDs
  validAnswers: Record<string, string[]>; // "r,c" → ISO3[]
  score: number;
  difficulty: number; // 0-100
  metadata: GridMetadata;
  status: "pending";
  generatedAt: number;
  reviewedAt: null;
  rejectionReason: null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// TODO: enrichir avec les pageviews Wikipedia pour mieux capturer
// la notoriété perçue (Singapour, Vatican, Monaco sont sous-évalués
// par la population seule).
const MIN_POP_LOG = Math.log10(10_000); // ~0
const MAX_POP_LOG = Math.log10(1_500_000_000); // ~1 (Inde/Chine)
function getNotorietyIndex(c: Country): number {
  const l = Math.log10(Math.max(c.population, 1));
  return Math.min(
    1,
    Math.max(0, (l - MIN_POP_LOG) / (MAX_POP_LOG - MIN_POP_LOG)),
  );
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── Core functions ───────────────────────────────────────────────────────────

/**
 * For each constraint, compute the set of ISO3 codes that satisfy it.
 * Called once per batch generation.
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
 * Recursive backtracking: fills slots 0-2 (rows) then 3-5 (cols).
 * At each slot, shuffles remaining IDs for diversity.
 * Returns { rows, cols } on success, null if no valid combination found.
 */
function fillSlot(
  slotIndex: number,
  remaining: string[],
  matches: Record<string, Set<string>>,
  rows: string[],
  cols: string[],
): { rows: string[]; cols: string[] } | null {
  if (slotIndex === 6) return { rows, cols };

  const isRow = slotIndex < 3;
  const candidates = shuffle([...remaining]);

  for (const id of candidates) {
    // When adding a row: check against existing cols (rows phase has no cols yet → trivially passes)
    // When adding a col: check against all 3 rows
    const valid = isRow
      ? cols.every(
          (colId) => intersect(id, colId, matches).length >= MIN_CELL_SIZE,
        )
      : rows.every(
          (rowId) => intersect(rowId, id, matches).length >= MIN_CELL_SIZE,
        );

    if (!valid) continue;

    const newRemaining = remaining.filter((r) => r !== id);
    const result = fillSlot(
      slotIndex + 1,
      newRemaining,
      matches,
      isRow ? [...rows, id] : rows,
      isRow ? cols : [...cols, id],
    );
    if (result) return result;
  }

  return null;
}

/**
 * Entry point for backtracking grid search.
 * Shuffles the full constraint list before starting for diversity.
 */
export function tryBuildGrid(
  remainingIds: string[],
  matches: Record<string, Set<string>>,
): { rows: string[]; cols: string[] } | null {
  return fillSlot(0, shuffle([...remainingIds]), matches, [], []);
}

/**
 * Computes validAnswers, applies hard filters, and calculates score + difficulty.
 * Returns null if the grid fails any hard constraint.
 */
export function finalizeAndScore(
  rows: string[],
  cols: string[],
  matches: Record<string, Set<string>>,
): GridCandidate | null {
  const validAnswers: Record<string, string[]> = {};
  let minCellSize = Number.POSITIVE_INFINITY;
  let maxCellSize = 0;
  let totalCellSize = 0;
  const categories = new Set<string>();
  let totalObscurity = 0;

  // Build a lookup for constraint categories
  const categoryById: Record<string, string> = {};
  for (const c of CONSTRAINTS) {
    categoryById[c.id] = c.category;
  }

  for (let r = 0; r < 3; r++) {
    const rowId = rows[r];
    categories.add(categoryById[rowId]);

    for (let c = 0; c < 3; c++) {
      const colId = cols[c];
      if (r === 0) categories.add(categoryById[colId]);

      const key = `${r},${c}`;
      const cellCodes = intersect(rowId, colId, matches);
      const size = cellCodes.length;

      // Hard filter: minimum cell size
      if (size < MIN_CELL_SIZE) return null;

      validAnswers[key] = cellCodes;
      minCellSize = Math.min(minCellSize, size);
      maxCellSize = Math.max(maxCellSize, size);
      totalCellSize += size;

      // Compute average obscurity for this cell
      const countryMap = Object.fromEntries(COUNTRIES.map((x) => [x.code, x]));
      const cellObscurity =
        cellCodes.reduce((sum, code) => {
          const country = countryMap[code];
          return sum + (country ? 1 - getNotorietyIndex(country) : 0.5);
        }, 0) / size;
      totalObscurity += cellObscurity;
    }
  }

  // Hard filter: minimum distinct categories
  const categoryCount = categories.size;
  if (categoryCount < MIN_CATEGORIES) return null;

  const avgCellSize = totalCellSize / 9;
  const avgObscurity = totalObscurity / 9;

  // Difficulty formula (result in [0, 1], scaled to [0, 100])
  const logRef = Math.log(50);
  const rawDifficulty =
    0.4 * (1 - Math.log(Math.min(minCellSize, 50)) / logRef) +
    0.3 * (1 - Math.log(Math.min(avgCellSize, 50)) / logRef) +
    0.3 * avgObscurity;
  const difficulty = Math.round(
    Math.min(100, Math.max(0, rawDifficulty * 100)),
  );

  // Score formula (higher = more solvable / better quality for admin queue)
  const score =
    Math.log(minCellSize) * 5 + categoryCount * 3 + (1 - avgObscurity) * 4;

  return {
    rows,
    cols,
    validAnswers,
    score,
    difficulty,
    metadata: {
      minCellSize,
      maxCellSize,
      avgCellSize,
      categoryCount,
      avgObscurity,
    },
    status: "pending",
    generatedAt: Date.now(),
    reviewedAt: null,
    rejectionReason: null,
  };
}

/**
 * Generates up to `n` new grid candidates, skipping duplicates against `existing`.
 * Two grids are duplicates if they share ≥ MAX_SIMILAR_CONSTRAINTS constraint IDs.
 */
export function generateBatch(
  n: number,
  existing: { rows: string[]; cols: string[] }[],
): GridCandidate[] {
  const matches = buildConstraintMatches();
  const allIds = CONSTRAINTS.map((c) => c.id);

  // Pre-compute sets of existing constraint combinations
  const existingSets = existing.map(
    (e) => new Set<string>([...e.rows, ...e.cols]),
  );

  const result: GridCandidate[] = [];
  const maxAttempts = n * 200;
  let attempts = 0;
  let failedFilter = 0;
  let failedDuplicate = 0;

  while (result.length < n && attempts < maxAttempts) {
    attempts++;

    const gridResult = tryBuildGrid(allIds, matches);
    if (!gridResult) {
      failedFilter++;
      continue;
    }

    const candidate = finalizeAndScore(
      gridResult.rows,
      gridResult.cols,
      matches,
    );
    if (!candidate) {
      failedFilter++;
      continue;
    }

    // Duplicate check: compare against existing AND already-generated candidates
    const candidateSet = new Set<string>([
      ...candidate.rows,
      ...candidate.cols,
    ]);
    const resultSets = result.map(
      (r) => new Set<string>([...r.rows, ...r.cols]),
    );

    const isDuplicate = [...existingSets, ...resultSets].some((existingSet) => {
      let shared = 0;
      for (const id of candidateSet) {
        if (existingSet.has(id)) shared++;
      }
      return shared >= MAX_SIMILAR_CONSTRAINTS;
    });

    if (isDuplicate) {
      failedDuplicate++;
      continue;
    }

    result.push(candidate);
  }

  if (result.length < n) {
    console.log(
      `[generateBatch] Only ${result.length}/${n} candidates after ${attempts} attempts` +
        ` (${failedFilter} failed filters, ${failedDuplicate} duplicates)`,
    );
  }

  return result;
}
