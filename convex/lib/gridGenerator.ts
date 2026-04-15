/**
 * Pure TypeScript grid generation — no Convex runtime dependencies.
 * Safe to import in Convex actions and in Vitest tests alike.
 */
import countriesJson from "../../src/features/countries/data/countries.json";
import type { Country } from "../../src/features/countries/types";
import { CONSTRAINTS } from "../../src/features/game/logic/constraints";

const COUNTRIES: Country[] = countriesJson as Country[];
const COUNTRY_BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c] as const));

// ─── Constants ────────────────────────────────────────────────────────────────

// Hard constraints
export const MIN_CELL_SIZE = 2;
export const MAX_CELL_SIZE_HARD = 15;
export const MAX_CELL_SIZE_SOFT = 8;
export const MAX_CELLS_WITHOUT_OBVIOUS = 2;
export const MIN_CATEGORIES = 3;

// Notoriété / popularité
export const OBVIOUS_POPULARITY_THRESHOLD = 0.78;
const NOTORIETY_MIN_REF = 0.6;
const NOTORIETY_MAX_REF = 0.85;

// Batch
export const BATCH_GENERATE_N = 30;
export const BATCH_STORE_N = 5;
const MAX_ATTEMPTS_PER_CANDIDATE = 200;

// Duplicate detection
const MAX_SIMILAR_CONSTRAINTS = 5;

// Normalisation seuils — tunés empiriquement, à valider via scripts/analyze-grid-candidates.ts
const ENTROPY_NORM_CAP = 0.4;
const DIFFICULTY_VARIANCE_NORM_CAP = 0.015;

// Population log range (fallback si popularityIndex absent)
const MIN_POP_LOG = Math.log10(10_000);
const MAX_POP_LOG = Math.log10(1_500_000_000);

// ─── Types ────────────────────────────────────────────────────────────────────

export type CellMetrics = {
  cellKey: string;
  solutionCount: number;
  popularCount: number;
  maxPopularity: number;
  avgPopularity: number;
  entropy: number;
  hasObviousAnswer: boolean;
};

export type GridMetadata = {
  minCellSize: number;
  maxCellSize: number;
  avgCellSize: number;
  cellSizeVariance: number;
  solutionPoolSize: number;
  categoryCount: number;
  avgNotoriety: number;
  obviousCellCount: number;
  cellsWithNoObvious: number;
  difficultyVariance: number;
  criteriaOverlapScore: number;
  difficultyMixNorm: number;
  cellMetrics: CellMetrics[];
};

export type GridCandidate = {
  rows: string[]; // 3 constraint IDs
  cols: string[]; // 3 constraint IDs
  validAnswers: Record<string, string[]>; // "r,c" → ISO3[]
  score: number; // qualityScore 0-100
  difficulty: number; // 0-100, derived from cellMetrics
  metadata: GridMetadata;
  status: "pending";
  generatedAt: number;
  reviewedAt: null;
  rejectionReason: null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

function variance(values: number[]): number {
  if (values.length === 0) return 0;
  const m = mean(values);
  let sum = 0;
  for (const v of values) sum += (v - m) * (v - m);
  return sum / values.length;
}

// Notoriété perçue : `popularityIndex` (0..1) est dérivé des pageviews mensuels
// en.wikipedia sur tout le jeu de pays — voir `scripts/build-countries.ts` /
// `pnpm build:countries`. Quand l’index wiki est présent, on combine avec le
// signal population par `max` pour éviter les sous-estimations (ex. titre WP
// partiellement erroné) tout en gardant les micro-États très vus sur le wiki.
function notorietyFromPopulation(c: Country): number {
  const l = Math.log10(Math.max(c.population, 1));
  return clamp01((l - MIN_POP_LOG) / (MAX_POP_LOG - MIN_POP_LOG));
}

function getNotorietyIndex(c: Country): number {
  const fromPop = notorietyFromPopulation(c);
  if (typeof c.popularityIndex === "number") {
    return clamp01(Math.max(fromPop, clamp01(c.popularityIndex)));
  }
  return fromPop;
}

function normalizeNotoriety(avgNotoriety: number): number {
  const span = NOTORIETY_MAX_REF - NOTORIETY_MIN_REF;
  if (span <= 0) return 0.5;
  return clamp01((avgNotoriety - NOTORIETY_MIN_REF) / span);
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── Core: constraint matching ────────────────────────────────────────────────

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

// ─── Cell-level analysis (Phase 1) ────────────────────────────────────────────

/**
 * Analyzes a single cell: solution count, popular countries, entropy.
 * Entropy is a simple max - avg proxy: high when one dominant country exists.
 */
export function analyzeCell(
  rowIdx: number,
  colIdx: number,
  rowId: string,
  colId: string,
  matches: Record<string, Set<string>>,
): { metrics: CellMetrics; codes: string[] } {
  const codes = intersect(rowId, colId, matches);
  let popularCount = 0;
  let maxPopularity = 0;
  let sumPopularity = 0;

  for (const code of codes) {
    const country = COUNTRY_BY_CODE.get(code);
    const pop = country ? getNotorietyIndex(country) : 0.5;
    sumPopularity += pop;
    if (pop > maxPopularity) maxPopularity = pop;
    if (pop >= OBVIOUS_POPULARITY_THRESHOLD) popularCount += 1;
  }

  const solutionCount = codes.length;
  const avgPopularity = solutionCount === 0 ? 0 : sumPopularity / solutionCount;
  const entropy = maxPopularity - avgPopularity;

  return {
    metrics: {
      cellKey: `${rowIdx},${colIdx}`,
      solutionCount,
      popularCount,
      maxPopularity,
      avgPopularity,
      entropy,
      hasObviousAnswer: popularCount >= 1,
    },
    codes,
  };
}

// ─── Grid-level metrics (Phase 2) ─────────────────────────────────────────────

/**
 * Measures constraint redundancy within a grid.
 * For each pair of the 6 constraints, overlap = |A ∩ B| / min(|A|, |B|).
 * Returns mean over all 15 pairs, in [0, 1]. Higher = more redundant.
 */
export function computeCriteriaOverlap(
  rows: string[],
  cols: string[],
  matches: Record<string, Set<string>>,
): number {
  const ids = [...rows, ...cols];
  const overlaps: number[] = [];

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = matches[ids[i]];
      const b = matches[ids[j]];
      if (!a || !b) continue;
      const minSize = Math.min(a.size, b.size);
      if (minSize === 0) {
        overlaps.push(0);
        continue;
      }
      let shared = 0;
      for (const code of a) {
        if (b.has(code)) shared += 1;
      }
      overlaps.push(shared / minSize);
    }
  }

  return mean(overlaps);
}

function computeDifficultyMixNorm(rows: string[], cols: string[]): number {
  const tiers = new Set<string>();
  for (const id of [...rows, ...cols]) {
    const c = CONSTRAINTS.find((x) => x.id === id);
    if (c) tiers.add(c.difficulty);
  }
  if (tiers.size >= 3) return 1;
  if (tiers.size === 2) return 0.65;
  return 0.25;
}

/**
 * Aggregates cell-level metrics into a full GridMetadata.
 */
export function computeGridMetrics(
  cellMetrics: CellMetrics[],
  rows: string[],
  cols: string[],
  matches: Record<string, Set<string>>,
  validAnswers: Record<string, string[]>,
): GridMetadata {
  const sizes = cellMetrics.map((c) => c.solutionCount);
  const minCellSize = Math.min(...sizes);
  const maxCellSize = Math.max(...sizes);
  const avgCellSize = mean(sizes);
  const cellSizeVariance = variance(sizes);

  const union = new Set<string>();
  for (const codes of Object.values(validAnswers)) {
    for (const code of codes) union.add(code);
  }
  const solutionPoolSize = union.size;

  const categoryById: Record<string, string> = {};
  for (const constraint of CONSTRAINTS) {
    categoryById[constraint.id] = constraint.category;
  }
  const categories = new Set<string>();
  for (const id of rows) categories.add(categoryById[id]);
  for (const id of cols) categories.add(categoryById[id]);
  const categoryCount = categories.size;

  const avgNotoriety = mean(cellMetrics.map((c) => c.avgPopularity));

  const obviousCellCount = cellMetrics.filter((c) => c.hasObviousAnswer).length;
  const cellsWithNoObvious = cellMetrics.length - obviousCellCount;

  // "Difficulté ressentie" par cellule = 1 - entropy
  // Une cellule sans pic clair (plusieurs réponses équivalentes) = difficile à trancher.
  const perCellHardness = cellMetrics.map((c) => 1 - c.entropy);
  const difficultyVariance = variance(perCellHardness);

  const criteriaOverlapScore = computeCriteriaOverlap(rows, cols, matches);
  const difficultyMixNorm = computeDifficultyMixNorm(rows, cols);

  return {
    minCellSize,
    maxCellSize,
    avgCellSize,
    cellSizeVariance,
    solutionPoolSize,
    categoryCount,
    avgNotoriety,
    obviousCellCount,
    cellsWithNoObvious,
    difficultyVariance,
    criteriaOverlapScore,
    difficultyMixNorm,
    cellMetrics,
  };
}

/**
 * Computes qualityScore 0-100 from a GridMetadata.
 * Quality = présence de réponses évidentes + confort des tailles de cellule
 * + équilibre + diversité + indépendance des contraintes.
 */
export function computeQualityScore(metadata: GridMetadata): number {
  const { cellMetrics } = metadata;

  const avgEntropyNorm = clamp01(
    mean(cellMetrics.map((c) => c.entropy)) / ENTROPY_NORM_CAP,
  );

  const balanceNorm =
    1 - clamp01(metadata.difficultyVariance / DIFFICULTY_VARIANCE_NORM_CAP);

  const sizeComfortNorm = mean(
    cellMetrics.map((c) => {
      if (c.solutionCount <= MAX_CELL_SIZE_SOFT) return 1;
      if (c.solutionCount >= MAX_CELL_SIZE_HARD) return 0;
      return (
        1 -
        (c.solutionCount - MAX_CELL_SIZE_SOFT) /
          (MAX_CELL_SIZE_HARD - MAX_CELL_SIZE_SOFT)
      );
    }),
  );

  const categoryDiversityNorm = clamp01(
    (metadata.categoryCount - MIN_CATEGORIES) / 3,
  );

  const independenceNorm = 1 - clamp01(metadata.criteriaOverlapScore);

  const difficultyMixNorm = metadata.difficultyMixNorm;

  // obviousRatio retiré : le hard reject MAX_CELLS_WITHOUT_OBVIOUS agit
  // comme floor, et sa présence dans quality anti-corrèle quality/difficulty.
  const rawQuality =
    0.27 * sizeComfortNorm +
    0.18 * independenceNorm +
    0.18 * categoryDiversityNorm +
    0.14 * balanceNorm +
    0.13 * avgEntropyNorm +
    0.1 * difficultyMixNorm;

  return Math.round(clamp01(rawQuality) * 100);
}

// ─── Derived difficulty (Phase 3) ─────────────────────────────────────────────

/**
 * Derives a player-facing difficulty score (0-100) entirely from cell metrics.
 * Higher = harder to solve without guessing.
 */
export function deriveDifficulty(metadata: GridMetadata): number {
  const { cellMetrics } = metadata;
  const cellCount = cellMetrics.length || 1;

  const avgSolutionCount = mean(cellMetrics.map((c) => c.solutionCount));
  const avgPopularityOnGrid = mean(cellMetrics.map((c) => c.avgPopularity));
  const hardCellRatio =
    cellMetrics.filter((c) => !c.hasObviousAnswer).length / cellCount;

  const sizeHardnessNorm =
    1 -
    clamp01(
      Math.log(Math.max(Math.min(avgSolutionCount, 10), 1)) / Math.log(10),
    );
  const obscurityNorm = 1 - normalizeNotoriety(avgPopularityOnGrid);
  const missingObviousNorm = hardCellRatio;
  const varianceNorm = clamp01(metadata.difficultyVariance * 2);

  const rawDifficulty =
    0.35 * obscurityNorm +
    0.3 * missingObviousNorm +
    0.2 * sizeHardnessNorm +
    0.15 * varianceNorm;

  return Math.round(clamp01(rawDifficulty) * 100);
}

// ─── Backtracking search ──────────────────────────────────────────────────────

/**
 * Recursive backtracking: fills slots 0-2 (rows) then 3-5 (cols).
 * Prunes branches where any cell would fall outside [MIN_CELL_SIZE, MAX_CELL_SIZE_HARD].
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
    const valid = isRow
      ? cols.every((colId) => {
          const size = intersect(id, colId, matches).length;
          return size >= MIN_CELL_SIZE && size <= MAX_CELL_SIZE_HARD;
        })
      : rows.every((rowId) => {
          const size = intersect(rowId, id, matches).length;
          return size >= MIN_CELL_SIZE && size <= MAX_CELL_SIZE_HARD;
        });

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

export function tryBuildGrid(
  remainingIds: string[],
  matches: Record<string, Set<string>>,
): { rows: string[]; cols: string[] } | null {
  return fillSlot(0, shuffle([...remainingIds]), matches, [], []);
}

// ─── Finalization ─────────────────────────────────────────────────────────────

/**
 * Finalizes a grid: builds validAnswers + cellMetrics, applies hard filters,
 * computes qualityScore and derived difficulty.
 * Returns null if any hard constraint fails.
 */
export function finalizeAndScore(
  rows: string[],
  cols: string[],
  matches: Record<string, Set<string>>,
): GridCandidate | null {
  const validAnswers: Record<string, string[]> = {};
  const cellMetrics: CellMetrics[] = [];

  for (let r = 0; r < 3; r++) {
    const rowId = rows[r];
    for (let c = 0; c < 3; c++) {
      const colId = cols[c];
      const { metrics, codes } = analyzeCell(r, c, rowId, colId, matches);
      if (
        metrics.solutionCount < MIN_CELL_SIZE ||
        metrics.solutionCount > MAX_CELL_SIZE_HARD
      ) {
        return null;
      }
      validAnswers[metrics.cellKey] = codes;
      cellMetrics.push(metrics);
    }
  }

  const cellsWithNoObvious = cellMetrics.filter(
    (c) => !c.hasObviousAnswer,
  ).length;
  if (cellsWithNoObvious > MAX_CELLS_WITHOUT_OBVIOUS) return null;

  const metadata = computeGridMetrics(
    cellMetrics,
    rows,
    cols,
    matches,
    validAnswers,
  );

  if (metadata.categoryCount < MIN_CATEGORIES) return null;

  const score = computeQualityScore(metadata);
  const difficulty = deriveDifficulty(metadata);

  return {
    rows,
    cols,
    validAnswers,
    score,
    difficulty,
    metadata,
    status: "pending",
    generatedAt: Date.now(),
    reviewedAt: null,
    rejectionReason: null,
  };
}

// ─── Batch generation ─────────────────────────────────────────────────────────

/**
 * Generates up to `n` grid candidates, intrinsically scored and returned
 * sorted by qualityScore descending. Skips near-duplicates (≥ MAX_SIMILAR_CONSTRAINTS
 * shared constraint IDs with any existing or already-generated grid).
 */
export function generateBatch(
  n: number,
  existing: { rows: string[]; cols: string[] }[],
): GridCandidate[] {
  const matches = buildConstraintMatches();
  const allIds = CONSTRAINTS.map((c) => c.id);

  const existingSets = existing.map(
    (e) => new Set<string>([...e.rows, ...e.cols]),
  );

  const result: GridCandidate[] = [];
  const maxAttempts = n * MAX_ATTEMPTS_PER_CANDIDATE;
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

  result.sort((a, b) => b.score - a.score);
  return result;
}
