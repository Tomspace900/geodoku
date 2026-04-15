import {
  CONTEXT_HISTORY_WINDOW,
  type GridContextInput,
  computeGridContext,
} from "../convex/lib/gridContext.ts";
import {
  type GridCandidate,
  buildConstraintMatches,
  finalizeAndScore,
  tryBuildGrid,
} from "../convex/lib/gridGenerator.ts";
/**
 * Monte Carlo audit for grid generation formulas.
 *
 * Generates many random valid candidates with the current generator and prints:
 * - acceptance rate (valid grids / attempts)
 * - distributions for qualityScore / difficulty / metadata components
 * - correlations between quality components (detect redundancy)
 * - phase 2 simulation: builds a synthetic "daily" history (2×CONTEXT_HISTORY_WINDOW
 *   chained picks against a sliding 15-grid window, then scores every candidate
 *   against the final 15 grids — see buildChainedHistoryWindow).
 *
 * Run:
 *   pnpm analyze:grids
 *   pnpm analyze:grids --samples=5000 --maxAttempts=100000
 *   pnpm analyze:grids --chainSamples=200
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
  | "cellsWithNoObvious"
  | "difficultyVariance"
  | "criteriaOverlapScore"
  | "difficultyMixNorm";

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
/** Candidates triés par finalScore à chaque pas de la chaîne (qualité + contexte). */
const DEFAULT_CHAIN_SAMPLES_PER_STEP = 100;

/** Aligné sur convex/grids.ts — finalScore en phase 2 cron. */
const PHASE2_QUALITY_WEIGHT = 0.6;
const PHASE2_CONTEXT_WEIGHT = 0.4;

const CHAIN_STEPS = 2 * CONTEXT_HISTORY_WINDOW;

function parsePositiveInt(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function parseCliArgs(argv: string[]): {
  samples: number;
  maxAttempts: number;
  chainSamplesPerStep: number;
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

  const requestedChain = parsePositiveInt(parsed.chainSamples);
  const chainSamplesPerStep = requestedChain ?? DEFAULT_CHAIN_SAMPLES_PER_STEP;

  return { samples, maxAttempts, chainSamplesPerStep };
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
    case "cellsWithNoObvious":
      return candidate.metadata.cellsWithNoObvious;
    case "difficultyVariance":
      return candidate.metadata.difficultyVariance;
    case "criteriaOverlapScore":
      return candidate.metadata.criteriaOverlapScore;
    case "difficultyMixNorm":
      return candidate.metadata.difficultyMixNorm;
  }
}

function toContextInput(candidate: GridCandidate): GridContextInput {
  return {
    rows: candidate.rows,
    cols: candidate.cols,
    validAnswers: candidate.validAnswers,
  };
}

function gridKey(g: GridContextInput): string {
  return `${g.rows.join(",")}|${g.cols.join(",")}`;
}

/**
 * Padding aléatoire pour compléter la fenêtre de 15 grilles ; évite autant que
 * possible de dupliquer les clés déjà présentes dans `publishedKeys`.
 */
function pickRandomPadding(
  pool: GridCandidate[],
  count: number,
  publishedKeys: ReadonlySet<string>,
): GridContextInput[] {
  const usedInPad = new Set<string>(publishedKeys);
  const out: GridContextInput[] = [];
  for (let i = 0; i < count; i++) {
    let picked: GridContextInput | null = null;
    for (let tries = 0; tries < pool.length * 8; tries++) {
      const cand = pool[Math.floor(Math.random() * pool.length)];
      const g = toContextInput(cand);
      const k = gridKey(g);
      if (!usedInPad.has(k)) {
        picked = g;
        usedInPad.add(k);
        break;
      }
    }
    if (!picked) {
      const cand = pool[Math.floor(Math.random() * pool.length)];
      picked = toContextInput(cand);
    }
    out.push(picked);
  }
  return out;
}

/**
 * Simule 2×CONTEXT_HISTORY_WINDOW « jours » : à chaque pas, fenêtre = préfixe
 * publié + padding aléatoire jusqu'à 15 grilles, puis les 15 dernières seules
 * une fois le préfixe assez long. Le gagnard du pas maximise
 * PHASE2_QUALITY_WEIGHT×quality + PHASE2_CONTEXT_WEIGHT×contextScore.
 * Retourne uniquement les CONTEXT_HISTORY_WINDOW dernières grilles (historique
 * figé pour l'audit).
 */
function buildChainedHistoryWindow(
  pool: GridCandidate[],
  steps: number,
  samplesPerStep: number,
): GridContextInput[] {
  const published: GridContextInput[] = [];

  for (let step = 0; step < steps; step++) {
    const publishedKeys = new Set(published.map(gridKey));
    let window: GridContextInput[];
    if (published.length < CONTEXT_HISTORY_WINDOW) {
      const padCount = CONTEXT_HISTORY_WINDOW - published.length;
      const padding = pickRandomPadding(pool, padCount, publishedKeys);
      window = [...published, ...padding];
    } else {
      window = published.slice(-CONTEXT_HISTORY_WINDOW);
    }

    let bestCandidate: GridCandidate | null = null;
    let bestFinal = Number.NEGATIVE_INFINITY;
    for (let s = 0; s < samplesPerStep; s++) {
      const cand = pool[Math.floor(Math.random() * pool.length)];
      const ctx = computeGridContext(toContextInput(cand), window);
      const finalScore =
        PHASE2_QUALITY_WEIGHT * cand.score +
        PHASE2_CONTEXT_WEIGHT * ctx.contextScore;
      if (finalScore > bestFinal) {
        bestFinal = finalScore;
        bestCandidate = cand;
      }
    }
    if (!bestCandidate) {
      throw new Error("buildChainedHistoryWindow: empty pool");
    }
    published.push(toContextInput(bestCandidate));
  }

  return published.slice(-CONTEXT_HISTORY_WINDOW);
}

function main(): void {
  const { samples, maxAttempts, chainSamplesPerStep } = parseCliArgs(
    process.argv.slice(2),
  );
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
    "cellsWithNoObvious",
    "difficultyVariance",
    "criteriaOverlapScore",
    "difficultyMixNorm",
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
  const diffVariance = accepted.map((c) => c.metadata.difficultyVariance);

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
    `quality   vs difficultyVar:     ${formatNum(pearson(score, diffVariance), 3)}`,
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
  console.log(
    `quality    vs difficulty:       ${formatNum(pearson(score, difficulty), 3)}`,
  );

  printHistogram("Quality histogram (10 bins)", score, 10);
  printHistogram("Difficulty histogram (10 bins)", difficulty, 10);
  printHistogram("ObviousCellCount histogram (10 bins)", obviousCount, 10);
  printHistogram("CriteriaOverlap histogram (10 bins)", overlap, 10);

  // ─── Phase 2 simulation ─────────────────────────────────────────────────────
  // Chaîne de 2×CONTEXT_HISTORY_WINDOW « publications » ; chaque jour = meilleur
  // tirage parmi chainSamplesPerStep candidats du pool sous la fenêtre courante.
  // On score tout l'échantillon contre les CONTEXT_HISTORY_WINDOW dernières seules.
  if (accepted.length > CONTEXT_HISTORY_WINDOW + 1) {
    const chainedHistory = buildChainedHistoryWindow(
      accepted,
      CHAIN_STEPS,
      chainSamplesPerStep,
    );
    console.log(
      `\n--- Phase 2 simulation (chained history: ${CHAIN_STEPS} steps → last ${CONTEXT_HISTORY_WINDOW} grids, ${chainSamplesPerStep} samples/step) ---`,
    );

    const contextScores: number[] = [];
    const pairReuseRates: number[] = [];
    const structureSims: number[] = [];
    const countryReuseRates: number[] = [];
    const criteriaReuseRates: number[] = [];

    for (const candidate of accepted) {
      const metrics = computeGridContext(
        toContextInput(candidate),
        chainedHistory,
      );
      contextScores.push(metrics.contextScore);
      pairReuseRates.push(metrics.criteriaPairReuseRate);
      structureSims.push(metrics.structureSimilarity);
      countryReuseRates.push(metrics.countryReuseRate);
      criteriaReuseRates.push(metrics.criteriaReuseRate);
    }

    printSummary("contextScore", summarize(contextScores));
    printSummary("pairReuseRate", summarize(pairReuseRates));
    printSummary("structureSim", summarize(structureSims));
    printSummary("countryReuseRate", summarize(countryReuseRates));
    printSummary("criteriaReuseRate", summarize(criteriaReuseRates));

    const finalScores = score.map((q, i) =>
      Math.round(
        PHASE2_QUALITY_WEIGHT * q + PHASE2_CONTEXT_WEIGHT * contextScores[i],
      ),
    );
    printSummary("finalScore", summarize(finalScores));

    console.log(
      `\nquality   vs context:           ${formatNum(pearson(score, contextScores), 3)}`,
    );
    console.log(
      `quality   vs finalScore:        ${formatNum(pearson(score, finalScores), 3)}`,
    );
    console.log(
      `context   vs finalScore:        ${formatNum(pearson(contextScores, finalScores), 3)}`,
    );

    printHistogram("Context histogram (10 bins)", contextScores, 10);
    printHistogram("Final score histogram (10 bins)", finalScores, 10);
  }
}

main();
