import {
  CONTEXT_HISTORY_WINDOW,
  type GridContextInput,
  type GridContextMetrics,
  computeGridContext,
} from "../convex/lib/gridContext.ts";
import {
  BATCH_GENERATE_N,
  BATCH_STORE_N,
  type GridCandidate,
  buildConstraintMatches,
  finalizeAndScore,
  generateBatch,
  tryBuildGrid,
} from "../convex/lib/gridGenerator.ts";
/**
 * Monte Carlo audit for grid generation formulas.
 *
 * Generates many random valid candidates with the current generator and prints:
 * - acceptance rate (valid grids / attempts)
 * - distributions for qualityScore / difficulty / metadata components
 * - correlations between quality components (detect redundancy)
 * - seed-aligned 15-day simulation: same pipeline as `convex/seed.ts` +
 *   `generateDailyCandidates` (batch 30 → phase 2 pool 15 → store 5 → promote
 *   best pending by intrinsic quality score → purge pending), repeated for
 *   dates T−14 … T with `getRecentPublishedGrids`-style history (newest first).
 *
 * Run:
 *   pnpm analyze:grids
 *   pnpm analyze:grids --samples=5000 --maxAttempts=100000
 */
import { CONSTRAINTS } from "../src/features/game/logic/constraints.ts";

type NumericField =
  | "score"
  | "difficulty"
  | "minCellSize"
  | "maxCellSize"
  | "avgCellSize"
  | "categoryCount"
  | "avgNotoriety"
  | "obviousCellCount"
  | "criteriaOverlapScore"
  | "constraintHardnessMean"
  | "maxCellRisk"
  | "avgCellRisk";

type Summary = {
  min: number;
  p5: number;
  p25: number;
  median: number;
  mean: number;
  p75: number;
  p95: number;
  max: number;
  stdDev: number;
};

const DEFAULT_SAMPLES = 2000;
const DEFAULT_MAX_ATTEMPTS_MULTIPLIER = 20;

/** Aligné sur convex/grids.ts — finalScore en phase 2 cron. */
const PHASE2_QUALITY_WEIGHT = 0.6;
const PHASE2_CONTEXT_WEIGHT = 0.4;

/** Aligné sur convex/grids.ts — `Math.floor(BATCH_GENERATE_N / 2)`. */
const PHASE_2_POOL_SIZE = Math.floor(BATCH_GENERATE_N / 2);

/** Même fenêtre que `convex/seed.ts` (15 jours). */
const SEED_DAY_COUNT = 15;

function todayUTC(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Inclusive range from (today − 14) to today — identique à `convex/seed.ts`. */
function datesFromMinus14ToToday(today: string): string[] {
  const anchor = new Date(`${today}T12:00:00.000Z`);
  const out: string[] = [];
  for (let i = 0; i < SEED_DAY_COUNT; i++) {
    const d = new Date(anchor);
    d.setUTCDate(anchor.getUTCDate() - (SEED_DAY_COUNT - 1 - i));
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    out.push(`${y}-${m}-${day}`);
  }
  return out;
}

function parsePositiveInt(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function parseCliArgs(argv: string[]): {
  samples: number;
  maxAttempts: number;
} {
  const parsed = Object.fromEntries(
    argv
      .filter((arg) => arg.startsWith("--"))
      .map((arg) => {
        const [k, v] = arg.slice(2).split("=");
        return [k, v ?? ""];
      }),
  );

  const requestedSamples = parsePositiveInt(parsed.samples);
  const samples = requestedSamples ?? DEFAULT_SAMPLES;

  const requestedMaxAttempts = parsePositiveInt(parsed.maxAttempts);
  const maxAttempts =
    requestedMaxAttempts ?? samples * DEFAULT_MAX_ATTEMPTS_MULTIPLIER;

  return { samples, maxAttempts };
}

function pickQuantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return Number.NaN;
  if (sorted.length === 1) return sorted[0];
  const clampedQ = Math.min(1, Math.max(0, q));
  const idx = clampedQ * (sorted.length - 1);
  const low = Math.floor(idx);
  const high = Math.ceil(idx);
  if (low === high) return sorted[low];
  const weight = idx - low;
  return sorted[low] * (1 - weight) + sorted[high] * weight;
}

function mean(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function stdDev(values: number[], avg: number): number {
  const variance =
    values.reduce((acc, value) => acc + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function summarize(values: number[]): Summary {
  const sorted = [...values].sort((a, b) => a - b);
  const avg = mean(sorted);
  return {
    min: sorted[0],
    p5: pickQuantile(sorted, 0.05),
    p25: pickQuantile(sorted, 0.25),
    median: pickQuantile(sorted, 0.5),
    mean: avg,
    p75: pickQuantile(sorted, 0.75),
    p95: pickQuantile(sorted, 0.95),
    max: sorted[sorted.length - 1],
    stdDev: stdDev(sorted, avg),
  };
}

function pearson(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return Number.NaN;
  const meanX = mean(x);
  const meanY = mean(y);
  let numerator = 0;
  let sumX = 0;
  let sumY = 0;
  for (const [i, xVal] of x.entries()) {
    const dx = xVal - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    sumX += dx * dx;
    sumY += dy * dy;
  }
  const denom = Math.sqrt(sumX * sumY);
  if (denom === 0) return Number.NaN;
  return numerator / denom;
}

function formatNum(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "n/a";
  return value.toFixed(digits);
}

function printSummary(label: string, summary: Summary): void {
  console.log(
    `${label.padEnd(20)} min=${formatNum(summary.min)} p5=${formatNum(summary.p5)} p25=${formatNum(summary.p25)} median=${formatNum(summary.median)} mean=${formatNum(summary.mean)} p75=${formatNum(summary.p75)} p95=${formatNum(summary.p95)} max=${formatNum(summary.max)} sd=${formatNum(summary.stdDev)}`,
  );
}

function makeHistogram(
  values: number[],
  bins: number,
): Array<{ from: number; to: number; count: number }> {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const width = span === 0 ? 1 : span / bins;
  const hist = Array.from({ length: bins }, () => 0);
  for (const value of values) {
    if (span === 0) {
      hist[0] += 1;
      continue;
    }
    const idx = Math.min(bins - 1, Math.floor((value - min) / width));
    hist[idx] += 1;
  }
  return hist.map((count, idx) => ({
    from: min + idx * width,
    to: min + (idx + 1) * width,
    count,
  }));
}

function printHistogram(label: string, values: number[], bins: number): void {
  console.log(`\n${label}`);
  const hist = makeHistogram(values, bins);
  const maxCount = Math.max(...hist.map((h) => h.count), 1);
  for (const bucket of hist) {
    const barLen = Math.round((bucket.count / maxCount) * 28);
    const bar = "█".repeat(barLen);
    console.log(
      `  [${formatNum(bucket.from, 1).padStart(5)}..${formatNum(bucket.to, 1).padStart(5)}] ${String(bucket.count).padStart(5)} ${bar}`,
    );
  }
}

function extractField(candidate: GridCandidate, field: NumericField): number {
  switch (field) {
    case "score":
      return candidate.score;
    case "difficulty":
      return candidate.difficulty;
    case "minCellSize":
      return candidate.metadata.minCellSize;
    case "maxCellSize":
      return candidate.metadata.maxCellSize;
    case "avgCellSize":
      return candidate.metadata.avgCellSize;
    case "categoryCount":
      return candidate.metadata.categoryCount;
    case "avgNotoriety":
      return candidate.metadata.avgNotoriety;
    case "obviousCellCount":
      return candidate.metadata.obviousCellCount;
    case "criteriaOverlapScore":
      return candidate.metadata.criteriaOverlapScore;
    case "constraintHardnessMean":
      return candidate.metadata.constraintHardnessMean;
    case "maxCellRisk":
      return candidate.metadata.maxCellRisk;
    case "avgCellRisk":
      return candidate.metadata.avgCellRisk;
  }
}

function toContextInput(candidate: GridCandidate): GridContextInput {
  return {
    rows: candidate.rows,
    cols: candidate.cols,
    validAnswers: candidate.validAnswers,
  };
}

type SeedStepResult = {
  date: string;
  candidate: GridCandidate;
  contextScore: number;
  finalScore: number;
  contextMetrics: GridContextMetrics;
};

/**
 * Reproduit `generateDailyCandidates` + `promoteBestPendingForDate` + purge pending
 * (voir convex/seed.ts et convex/grids.ts). Historique phase 2 : comme
 * `getRecentPublishedGrids` (ordre date décroissante = plus récent en premier).
 */
function simulateSeedFifteenDays(): {
  steps: SeedStepResult[];
  error: string | null;
} {
  const dates = datesFromMinus14ToToday(todayUTC());
  const candidateFingerprints: { rows: string[]; cols: string[] }[] = [];
  const publishedFingerprints: { rows: string[]; cols: string[] }[] = [];
  const publishedInputs: GridContextInput[] = [];
  const steps: SeedStepResult[] = [];

  for (const date of dates) {
    const allExisting = [...candidateFingerprints, ...publishedFingerprints];
    const batch = generateBatch(BATCH_GENERATE_N, allExisting);

    if (batch.length === 0) {
      return {
        steps,
        error: `[simulateSeedFifteenDays] No batch at ${date} (space saturated?)`,
      };
    }

    const history: GridContextInput[] = [...publishedInputs]
      .slice(-CONTEXT_HISTORY_WINDOW)
      .reverse();

    const pool = batch.slice(0, PHASE_2_POOL_SIZE);
    const scored = pool.map((candidate) => {
      const contextMetrics = computeGridContext(
        toContextInput(candidate),
        history,
      );
      const finalScore =
        PHASE2_QUALITY_WEIGHT * candidate.score +
        PHASE2_CONTEXT_WEIGHT * contextMetrics.contextScore;
      return {
        candidate,
        contextScore: contextMetrics.contextScore,
        finalScore,
        contextMetrics,
      };
    });

    scored.sort((a, b) => b.finalScore - a.finalScore);
    const selected = scored.slice(0, BATCH_STORE_N);

    const promoted = [...selected].sort(
      (a, b) => b.candidate.score - a.candidate.score,
    )[0];

    const fp = {
      rows: promoted.candidate.rows,
      cols: promoted.candidate.cols,
    };
    candidateFingerprints.push(fp);
    publishedFingerprints.push(fp);
    publishedInputs.push(toContextInput(promoted.candidate));

    steps.push({
      date,
      candidate: promoted.candidate,
      contextScore: promoted.contextScore,
      finalScore: promoted.finalScore,
      contextMetrics: promoted.contextMetrics,
    });
  }

  return { steps, error: null };
}

function main(): void {
  const { samples, maxAttempts } = parseCliArgs(process.argv.slice(2));
  const matches = buildConstraintMatches();
  const allIds = CONSTRAINTS.map((c) => c.id);

  const accepted: GridCandidate[] = [];
  let attempts = 0;

  while (attempts < maxAttempts && accepted.length < samples) {
    attempts += 1;
    const built = tryBuildGrid(allIds, matches);
    if (!built) continue;

    const candidate = finalizeAndScore(built.rows, built.cols, matches);
    if (!candidate) continue;
    accepted.push(candidate);
  }

  if (accepted.length === 0) {
    console.error("No valid candidates generated.");
    process.exit(1);
  }

  const acceptanceRate = accepted.length / attempts;
  console.log("\n=== Grid Candidate Formula Audit ===");
  console.log(
    `Samples=${accepted.length}/${samples}  Attempts=${attempts}/${maxAttempts}  Acceptance=${formatNum(acceptanceRate * 100)}%`,
  );

  const fields: NumericField[] = [
    "score",
    "difficulty",
    "minCellSize",
    "maxCellSize",
    "avgCellSize",
    "categoryCount",
    "avgNotoriety",
    "obviousCellCount",
    "criteriaOverlapScore",
    "constraintHardnessMean",
    "maxCellRisk",
    "avgCellRisk",
  ];

  console.log("\n--- Distributions ---");
  for (const field of fields) {
    const values = accepted.map((candidate) => extractField(candidate, field));
    printSummary(field, summarize(values));
  }

  const score = accepted.map((c) => c.score);
  const difficulty = accepted.map((c) => c.difficulty);
  const minCell = accepted.map((c) => c.metadata.minCellSize);
  const avgCell = accepted.map((c) => c.metadata.avgCellSize);
  const notoriety = accepted.map((c) => c.metadata.avgNotoriety);
  const categories = accepted.map((c) => c.metadata.categoryCount);
  const obviousCount = accepted.map((c) => c.metadata.obviousCellCount);
  const overlap = accepted.map((c) => c.metadata.criteriaOverlapScore);
  const maxRisk = accepted.map((c) => c.metadata.maxCellRisk);
  const avgRisk = accepted.map((c) => c.metadata.avgCellRisk);

  console.log("\n--- Correlations (Pearson r) ---");
  console.log(
    `quality   vs obviousCount:      ${formatNum(pearson(score, obviousCount), 3)}`,
  );
  console.log(
    `quality   vs avgCellSize:       ${formatNum(pearson(score, avgCell), 3)}`,
  );
  console.log(
    `quality   vs categoryCount:     ${formatNum(pearson(score, categories), 3)}`,
  );
  console.log(
    `quality   vs overlap:           ${formatNum(pearson(score, overlap), 3)}`,
  );
  console.log(
    `difficulty vs obviousCount:     ${formatNum(pearson(difficulty, obviousCount), 3)}`,
  );
  console.log(
    `difficulty vs avgNotoriety:     ${formatNum(pearson(difficulty, notoriety), 3)}`,
  );
  console.log(
    `difficulty vs minCellSize:      ${formatNum(pearson(difficulty, minCell), 3)}`,
  );
  const constraintHardness = accepted.map(
    (c) => c.metadata.constraintHardnessMean,
  );
  console.log(
    `difficulty vs cstrHardness:     ${formatNum(pearson(difficulty, constraintHardness), 3)}`,
  );
  console.log(
    `difficulty vs maxCellRisk:      ${formatNum(pearson(difficulty, maxRisk), 3)}`,
  );
  console.log(
    `difficulty vs avgCellRisk:      ${formatNum(pearson(difficulty, avgRisk), 3)}`,
  );
  console.log(
    `quality    vs difficulty:       ${formatNum(pearson(score, difficulty), 3)}`,
  );

  printHistogram("Quality histogram (10 bins)", score, 10);
  printHistogram("Difficulty histogram (10 bins)", difficulty, 10);
  printHistogram("ObviousCellCount histogram (10 bins)", obviousCount, 10);
  printHistogram("CriteriaOverlap histogram (10 bins)", overlap, 10);

  // ─── Seed-aligned 15-day simulation (convex/seed.ts + generateDailyCandidates) ─
  const { steps: seedSteps, error: seedError } = simulateSeedFifteenDays();
  console.log(
    `\n--- Seed-aligned simulation (${SEED_DAY_COUNT} jours T−14…T, batch=${BATCH_GENERATE_N}, pool=${PHASE_2_POOL_SIZE}, store=${BATCH_STORE_N}) ---`,
  );
  if (seedError) {
    console.error(seedError);
  }
  if (seedSteps.length > 0) {
    const seedQuality = seedSteps.map((s) => s.candidate.score);
    const seedContext = seedSteps.map((s) => s.contextScore);
    const seedFinal = seedSteps.map((s) => s.finalScore);
    const pairReuseRates = seedSteps.map(
      (s) => s.contextMetrics.criteriaPairReuseRate,
    );
    const structureSims = seedSteps.map(
      (s) => s.contextMetrics.structureSimilarity,
    );
    const countryReuseRates = seedSteps.map(
      (s) => s.contextMetrics.countryReuseRate,
    );
    const criteriaReuseRates = seedSteps.map(
      (s) => s.contextMetrics.criteriaReuseRate,
    );

    printSummary("quality (promoted)", summarize(seedQuality));
    printSummary("contextScore", summarize(seedContext));
    printSummary("finalScore (at pick)", summarize(seedFinal));
    printSummary("pairReuseRate", summarize(pairReuseRates));
    printSummary("structureSim", summarize(structureSims));
    printSummary("countryReuseRate", summarize(countryReuseRates));
    printSummary("criteriaReuseRate", summarize(criteriaReuseRates));

    console.log(
      `\nquality   vs context:           ${formatNum(pearson(seedQuality, seedContext), 3)}`,
    );
    console.log(
      `quality   vs finalScore:        ${formatNum(pearson(seedQuality, seedFinal), 3)}`,
    );
    console.log(
      `context   vs finalScore:        ${formatNum(pearson(seedContext, seedFinal), 3)}`,
    );

    printHistogram("Context histogram (10 bins)", seedContext, 10);
    printHistogram("Final score histogram (10 bins)", seedFinal, 10);

    console.log("\n--- Par jour (grille promue) ---");
    for (const step of seedSteps) {
      console.log(
        `  ${step.date}  q=${formatNum(step.candidate.score)}  ctx=${formatNum(step.contextScore)}  final=${formatNum(step.finalScore)}  diff=${formatNum(step.candidate.difficulty)}`,
      );
    }
  }
}

main();
