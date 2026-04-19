/**
 * Pure TypeScript grid generation — no Convex runtime dependencies.
 * Safe to import in Convex actions and in Vitest tests alike.
 */
import countriesJson from "../../src/features/countries/data/countries.json";
import type { Country } from "../../src/features/countries/types";
import { CONSTRAINTS } from "../../src/features/game/logic/constraints";

const COUNTRIES: Country[] = countriesJson as Country[];
const COUNTRY_BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c] as const));
const TOTAL_COUNTRIES = COUNTRIES.length;

// ─── Constants ────────────────────────────────────────────────────────────────

// Hard constraints
export const MIN_CELL_SIZE = 2;
export const MAX_CELL_SIZE_HARD = 15;
export const MAX_CELL_SIZE_SOFT = 8;
export const MAX_CELLS_WITHOUT_OBVIOUS = 2;
export const MIN_CATEGORIES = 4;

// Notoriété / popularité
export const OBVIOUS_POPULARITY_THRESHOLD = 0.78;
const NOTORIETY_MIN_REF = 0.45;
const NOTORIETY_MAX_REF = 0.9;

// Difficulty scoring — size hardness ramp: linéaire de 2 solutions (1.0) à 12+ (0.0)
const SIZE_HARDNESS_FLOOR = 2;
const SIZE_HARDNESS_CEIL = 12;

// Difficulty scoring — constraint hardness cardinalité-based : matchCount moyen
// sur 52 contraintes s'étale dans [0.73, 0.92]. On rescale sur cette plage pour
// qu'un signal discriminant émerge, sans se fier à une calibration runtime.
const CONSTRAINT_HARDNESS_MIN_REF = 0.7;
const CONSTRAINT_HARDNESS_MAX_REF = 0.95;

// Blocking risk combination: max dominates (worst cell dictates risk),
// avg penalizes grids with multiple moderately risky cells.
const BLOCKING_MAX_WEIGHT = 0.7;
const BLOCKING_AVG_WEIGHT = 0.3;

// Difficulty rescaling — P5/P95 du rawDifficulty observés sur 5000 grilles
// acceptées (pnpm analyze:grids). Calibration figée : stretcher [P5, P95] sur
// [0, 100] pour que difficulty couvre toute l'échelle au lieu de [15, 55].
// Re-calibrer uniquement si la pool de contraintes ou de pays change
// significativement : relancer analyze, relever les nouveaux p5/p95 du raw, MAJ.
const DIFFICULTY_RAW_P5 = 0.36;
const DIFFICULTY_RAW_P95 = 0.59;

// Batch
export const BATCH_GENERATE_N = 30;
export const BATCH_STORE_N = 5;
const MAX_ATTEMPTS_PER_CANDIDATE = 200;

// Duplicate detection
const MAX_SIMILAR_CONSTRAINTS = 5;

// Quality — cloche autour de 8 obvious cells (sweet spot : accessible sans être
// trivial). Pic à 8, décroît des deux côtés. Demi-largeur 2 → score 0 à 6 ou 10.
// Resserrée de 3 à 2 pour réduire la corrélation quality/difficulty (grilles 9/9
// obvious ne doivent pas rester en haut du score qualité).
const OBVIOUS_IDEAL = 8;
const OBVIOUS_BELL_HALF_WIDTH = 2;

// Population log range (fallback si popularityIndex absent)
const MIN_POP_LOG = Math.log10(10_000);
const MAX_POP_LOG = Math.log10(1_500_000_000);

// ─── Types ────────────────────────────────────────────────────────────────────

export type CellMetrics = {
  cellKey: string;
  solutionCount: number;
  popularCount: number;
  avgPopularity: number;
  cellRisk: number;
};

export type GridMetadata = {
  minCellSize: number;
  maxCellSize: number;
  avgCellSize: number;
  solutionPoolSize: number;
  categoryCount: number;
  avgNotoriety: number;
  obviousCellCount: number;
  criteriaOverlapScore: number;
  constraintHardnessMean: number;
  maxCellRisk: number;
  avgCellRisk: number;
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
 * Analyzes a single cell: solution count, popular countries, avg popularity.
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
  let sumPopularity = 0;

  for (const code of codes) {
    const country = COUNTRY_BY_CODE.get(code);
    const pop = country ? getNotorietyIndex(country) : 0.5;
    sumPopularity += pop;
    if (pop >= OBVIOUS_POPULARITY_THRESHOLD) popularCount += 1;
  }

  const solutionCount = codes.length;
  const avgPopularity = solutionCount === 0 ? 0 : sumPopularity / solutionCount;

  return {
    metrics: {
      cellKey: `${rowIdx},${colIdx}`,
      solutionCount,
      popularCount,
      avgPopularity,
      // Filled in by computeGridMetrics via computeCellRisks — needs a grid-wide view.
      cellRisk: 0,
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

/**
 * Blocking risk per cell.
 *
 * For each cell, cellSafety = Σ 1/occ(k) over solutions k, where occ(k) is the
 * number of cells in the grid where k is a valid answer. When a cell's solutions
 * are all also valid in many other cells, cellSafety → 0 (player risks being
 * locked out after consuming those countries elsewhere). cellRisk = exp(-safety):
 * smooth decay, saturates to 1 only at safety→0, differentiates safety ∈ [0.5, 2]
 * where the signal matters most.
 */
export function computeCellRisks(cellSolutions: string[][]): number[] {
  const occ = new Map<string, number>();
  for (const codes of cellSolutions) {
    for (const code of codes) {
      occ.set(code, (occ.get(code) ?? 0) + 1);
    }
  }
  return cellSolutions.map((codes) => {
    if (codes.length === 0) return 1;
    let safety = 0;
    for (const code of codes) {
      const o = occ.get(code) ?? 1;
      safety += 1 / o;
    }
    return Math.exp(-safety);
  });
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

  const obviousCellCount = cellMetrics.filter(
    (c) => c.popularCount >= 1,
  ).length;

  const criteriaOverlapScore = computeCriteriaOverlap(rows, cols, matches);
  // Cardinality-based hardness: a constraint is hard when few countries match it.
  // Objective (replaces the subjective easy/medium/hard tag) and auto-calibrated
  // against the dataset size.
  const constraintHardnessMean = mean(
    [...rows, ...cols].map((id) => {
      const set = matches[id];
      if (!set || TOTAL_COUNTRIES === 0) return 0.5;
      return 1 - set.size / TOTAL_COUNTRIES;
    }),
  );

  // Blocking risk: cells that risk being locked out if the player uses their
  // answers elsewhere. Attach per-cell and aggregate on the grid.
  const cellSolutions = cellMetrics.map((c) => validAnswers[c.cellKey] ?? []);
  const risks = computeCellRisks(cellSolutions);
  const enrichedCellMetrics = cellMetrics.map((c, i) => ({
    ...c,
    cellRisk: risks[i],
  }));
  const maxCellRisk = risks.length === 0 ? 0 : Math.max(...risks);
  const avgCellRisk = mean(risks);

  return {
    minCellSize,
    maxCellSize,
    avgCellSize,
    solutionPoolSize,
    categoryCount,
    avgNotoriety,
    obviousCellCount,
    criteriaOverlapScore,
    constraintHardnessMean,
    maxCellRisk,
    avgCellRisk,
    cellMetrics: enrichedCellMetrics,
  };
}

/**
 * Computes qualityScore 0-100 from a GridMetadata.
 * Quality = confort des tailles de cellule (0.35) + indépendance des
 * contraintes (0.35) + couverture de cases évidentes en cloche autour de
 * OBVIOUS_IDEAL (0.30).
 */
export function computeQualityScore(metadata: GridMetadata): number {
  const { cellMetrics } = metadata;

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

  const independenceNorm = 1 - clamp01(metadata.criteriaOverlapScore);

  // Cloche autour de OBVIOUS_IDEAL : récompense 7-9 obvious cells (sweet spot),
  // pénalise 5-6 (trop dur) ET 9/9 (trop facile — réduit la valeur du twist rareté).
  const obviousCoverageNorm = clamp01(
    1 -
      Math.abs(metadata.obviousCellCount - OBVIOUS_IDEAL) /
        OBVIOUS_BELL_HALF_WIDTH,
  );

  const rawQuality =
    0.35 * sizeComfortNorm +
    0.35 * independenceNorm +
    0.3 * obviousCoverageNorm;

  return Math.round(clamp01(rawQuality) * 100);
}

// ─── Derived difficulty (Phase 3) ─────────────────────────────────────────────

/**
 * Derives a player-facing difficulty score (0-100) entirely from cell metrics.
 * Higher = harder to solve without guessing.
 */
export function deriveDifficulty(metadata: GridMetadata): number {
  const { cellMetrics } = metadata;

  const avgSolutionCount = mean(cellMetrics.map((c) => c.solutionCount));
  const avgPopularityOnGrid = mean(cellMetrics.map((c) => c.avgPopularity));

  // Plus de solutions par cellule = plus facile. Ramp linéaire 2→12.
  const sizeHardnessNorm =
    1 -
    clamp01(
      (avgSolutionCount - SIZE_HARDNESS_FLOOR) /
        (SIZE_HARDNESS_CEIL - SIZE_HARDNESS_FLOOR),
    );

  // Cardinalité des contraintes, rescalée sur la plage observée empiriquement.
  const chSpan = CONSTRAINT_HARDNESS_MAX_REF - CONSTRAINT_HARDNESS_MIN_REF;
  const constraintHardnessNorm =
    chSpan > 0
      ? clamp01(
          (metadata.constraintHardnessMean - CONSTRAINT_HARDNESS_MIN_REF) /
            chSpan,
        )
      : 0.5;

  const blockingRiskNorm = clamp01(
    BLOCKING_MAX_WEIGHT * metadata.maxCellRisk +
      BLOCKING_AVG_WEIGHT * metadata.avgCellRisk,
  );

  const obscurityNorm = 1 - normalizeNotoriety(avgPopularityOnGrid);

  const rawDifficulty =
    0.35 * sizeHardnessNorm +
    0.25 * constraintHardnessNorm +
    0.25 * blockingRiskNorm +
    0.15 * obscurityNorm;

  const span = DIFFICULTY_RAW_P95 - DIFFICULTY_RAW_P5;
  const rescaled =
    span > 0 ? (rawDifficulty - DIFFICULTY_RAW_P5) / span : rawDifficulty;
  return Math.round(clamp01(rescaled) * 100);
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
    (c) => c.popularCount < 1,
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
