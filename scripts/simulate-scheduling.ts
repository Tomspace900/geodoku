/**
 * Standalone simulation — no Convex runtime dependency.
 * Generates a full pool then simulates 30 days of scheduling,
 * printing a Pool Report + Scheduling Simulation table.
 *
 * Usage: pnpm tsx scripts/simulate-scheduling.ts
 */
import {
  type FinalizedPoolGrid,
  HISTORY_WINDOW,
  TARGET_DIFFICULTY,
} from "../convex/lib/gridConstants";
import { generateDiversePool } from "../convex/lib/gridGenerator";
import { selectNextGrid } from "../convex/lib/gridScheduler";
import { CONSTRAINTS } from "../src/features/game/logic/constraints";

// ─── Pool generation ──────────────────────────────────────────────────────────

console.log("Generating pool...\n");
const start = Date.now();
const { grids: pool, report } = generateDiversePool();
const genMs = Date.now() - start;

// ─── Pool Report ──────────────────────────────────────────────────────────────

console.log("═══════════════════════════════════════════════════════");
console.log("  POOL REPORT");
console.log("═══════════════════════════════════════════════════════");
console.log(`  Total grids       : ${report.totalGenerated}`);
console.log(`  Duration          : ${genMs}ms`);
console.log(
  `  Constraint cover  : ${(report.constraintCoverage * 100).toFixed(1)}%`,
);
console.log(
  `  Country coverage  : ${report.countryCoverage} distinct countries`,
);

const difficulties = pool.map((g) => g.metadata.difficultyEstimate);
const avgDiff = difficulties.reduce((a, b) => a + b, 0) / difficulties.length;
const sorted = [...difficulties].sort((a, b) => a - b);
const medianDiff = sorted[Math.floor(sorted.length / 2)] ?? 0;
console.log(`  Avg difficulty    : ${avgDiff.toFixed(1)}/100`);
console.log(`  Median difficulty : ${medianDiff}/100`);
console.log(`  Target difficulty : ${TARGET_DIFFICULTY}/100`);

// Per-seed breakdown
const failed = report.seedResults.filter((r) => r.failed);
const lowYield = report.seedResults.filter(
  (r) => !r.failed && r.succeeded < 10,
);

console.log(`\n  Failed seeds (< 5 grids) : ${failed.length}`);
for (const r of failed) {
  console.log(`    ✗ ${r.constraintId} — ${r.succeeded}/${r.attempted} grids`);
}
if (lowYield.length > 0) {
  console.log(`  Low-yield seeds (5–9 grids) : ${lowYield.length}`);
  for (const r of lowYield) {
    console.log(`    ~ ${r.constraintId} — ${r.succeeded}`);
  }
}

// ─── 30-day simulation ────────────────────────────────────────────────────────

console.log("\n═══════════════════════════════════════════════════════");
console.log("  SCHEDULING SIMULATION (30 days)");
console.log("═══════════════════════════════════════════════════════");

type PoolGrid = {
  _id: string;
  rows: string[];
  cols: string[];
  validAnswers: Record<string, string[]>;
  metadata: FinalizedPoolGrid["metadata"];
};

const poolQueue: PoolGrid[] = pool.map((g, i) => ({
  _id: `cand_${i}`,
  rows: g.rows,
  cols: g.cols,
  validAnswers: g.validAnswers,
  metadata: g.metadata,
}));

type ScheduledDay = {
  day: number;
  grid: PoolGrid;
  score: number;
  difficulty: number;
  constraintIds: string[];
};

const scheduled: ScheduledDay[] = [];
const usedIds = new Set<string>();

for (let day = 1; day <= 30; day++) {
  const available = poolQueue.filter((g) => !usedIds.has(g._id));
  const recent = scheduled.slice(-HISTORY_WINDOW).map((d) => ({
    constraintIds: d.constraintIds,
    countryPool: Object.values(d.grid.validAnswers).flat(),
  }));

  const result = selectNextGrid(available, recent);
  if (!result) {
    console.log(`  Day ${String(day).padStart(2)}: ✗ NO GRID (pool exhausted)`);
    break;
  }

  usedIds.add(result.grid._id);
  scheduled.push({
    day,
    grid: result.grid,
    score: result.score,
    difficulty: result.grid.metadata.difficultyEstimate,
    constraintIds: result.grid.metadata.constraintIds,
  });
}

// Print table
console.log(
  `\n  ${"Day".padEnd(4)} ${"Diff".padEnd(6)} ${"Score".padEnd(7)} Constraints`,
);
console.log(`  ${"─".repeat(65)}`);
for (const d of scheduled) {
  const ids = d.constraintIds.join(", ");
  const truncated = ids.length > 50 ? `${ids.slice(0, 47)}...` : ids;
  console.log(
    `  ${String(d.day).padEnd(4)} ${String(d.difficulty).padEnd(6)} ${d.score.toFixed(1).padEnd(7)} ${truncated}`,
  );
}

// ─── Simulation metrics ───────────────────────────────────────────────────────

console.log("\n═══════════════════════════════════════════════════════");
console.log("  SIMULATION METRICS (30 days)");
console.log("═══════════════════════════════════════════════════════");

const allConstraintIds = scheduled.flatMap((d) => d.constraintIds);
const uniqueConstraints = new Set(allConstraintIds);
const constraintUsage: Record<string, number> = {};
for (const id of allConstraintIds) {
  constraintUsage[id] = (constraintUsage[id] ?? 0) + 1;
}
const maxReuse = Math.max(...Object.values(constraintUsage));

const allCountries = scheduled.flatMap((d) =>
  Object.values(d.grid.validAnswers).flat(),
);
const uniqueCountries = new Set(allCountries);

const scheduledDifficulties = scheduled.map((d) => d.difficulty);
const schedSorted = [...scheduledDifficulties].sort((a, b) => a - b);
const schedMedian = schedSorted[Math.floor(schedSorted.length / 2)] ?? 0;
const schedAvg =
  scheduledDifficulties.reduce((a, b) => a + b, 0) /
  scheduledDifficulties.length;

const poolRemaining = pool.length - scheduled.length;
const poolRemainingPct = ((poolRemaining / pool.length) * 100).toFixed(1);

// Max reuse within any 15-day sliding window
let maxWindowReuse = 0;
let worstWindowStart = 0;
let worstWindowConstraint = "";
for (let w = 0; w <= scheduled.length - HISTORY_WINDOW; w++) {
  const window = scheduled.slice(w, w + HISTORY_WINDOW);
  const windowUsage: Record<string, number> = {};
  for (const d of window) {
    for (const id of d.constraintIds) {
      windowUsage[id] = (windowUsage[id] ?? 0) + 1;
    }
  }
  for (const [id, count] of Object.entries(windowUsage)) {
    if (count > maxWindowReuse) {
      maxWindowReuse = count;
      worstWindowStart = w + 1;
      worstWindowConstraint = id;
    }
  }
}

console.log(`  Days scheduled    : ${scheduled.length}/30`);
console.log(
  `  Unique constraints: ${uniqueConstraints.size} / ${CONSTRAINTS.length} (${((uniqueConstraints.size / CONSTRAINTS.length) * 100).toFixed(1)}%)`,
);
console.log(`  Max reuse (30d total)        : ${maxReuse}`);
console.log(
  `  Max reuse (worst 15d window) : ${maxWindowReuse} (${worstWindowConstraint}, days ${worstWindowStart}–${worstWindowStart + HISTORY_WINDOW - 1})`,
);
console.log(`  Unique countries in solution : ${uniqueCountries.size}`);
console.log(`  Avg difficulty    : ${schedAvg.toFixed(1)}/100`);
console.log(`  Median difficulty : ${schedMedian}/100`);
console.log(
  `  Pool remaining    : ${poolRemaining}/${pool.length} (${poolRemainingPct}%)`,
);

// Most reused constraints (30d total)
const topReused = Object.entries(constraintUsage)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5);
console.log("\n  Most reused constraints (30d):");
for (const [id, count] of topReused) {
  console.log(`    ${count}× ${id}`);
}

// ─── Country distribution ─────────────────────────────────────────────────────

console.log("\n═══════════════════════════════════════════════════════");
console.log(`  COUNTRY DISTRIBUTION (pool — ${pool.length} grids × 9 cells)`);
console.log("═══════════════════════════════════════════════════════");

// For each country: how many cells across all pool grids mention it as a valid answer
const countryAppearancesInPool: Record<string, number> = {};
for (const g of pool) {
  for (const codes of Object.values(g.validAnswers)) {
    for (const code of codes) {
      countryAppearancesInPool[code] =
        (countryAppearancesInPool[code] ?? 0) + 1;
    }
  }
}
// Also track per-grid: in how many grids does a country appear (regardless of cell count)
const countryGridPresence: Record<string, number> = {};
for (const g of pool) {
  const seen = new Set<string>();
  for (const codes of Object.values(g.validAnswers)) {
    for (const code of codes) seen.add(code);
  }
  for (const code of seen) {
    countryGridPresence[code] = (countryGridPresence[code] ?? 0) + 1;
  }
}
// And per-grid: in how many cells of its grid does each country appear (solo vs shared)
// solo = appears in exactly 1 cell of a grid, shared = appears in ≥2
let soloAppearanceCount = 0; // (country, grid) pairs where country is in exactly 1 cell
let multiAppearanceCount = 0;
for (const g of pool) {
  const cellsPerCountry: Record<string, number> = {};
  for (const codes of Object.values(g.validAnswers)) {
    for (const code of codes) {
      cellsPerCountry[code] = (cellsPerCountry[code] ?? 0) + 1;
    }
  }
  for (const count of Object.values(cellsPerCountry)) {
    if (count === 1) soloAppearanceCount++;
    else multiAppearanceCount++;
  }
}
const totalCountryGridPairs = soloAppearanceCount + multiAppearanceCount;

const allPoolCountries = Object.keys(countryAppearancesInPool);
const neverInPool = 197 - allPoolCountries.length; // 197 UN members
const cellCounts = Object.values(countryAppearancesInPool).sort(
  (a, b) => a - b,
);
const avgCellsPerCountry =
  cellCounts.reduce((s, v) => s + v, 0) / cellCounts.length;
const medianCells = cellCounts[Math.floor(cellCounts.length / 2)] ?? 0;
const p90Cells = cellCounts[Math.floor(cellCounts.length * 0.9)] ?? 0;
const p10Cells = cellCounts[Math.floor(cellCounts.length * 0.1)] ?? 0;

console.log(`  Countries in pool    : ${allPoolCountries.length} / 197`);
console.log(`  Never appear         : ${neverInPool}`);
console.log(
  `  Total cell slots     : ${Object.values(countryAppearancesInPool).reduce((s, v) => s + v, 0)}`,
);
console.log(
  `  Appearances/country  : avg ${avgCellsPerCountry.toFixed(1)}  median ${medianCells}  p10 ${p10Cells}  p90 ${p90Cells}`,
);
console.log(
  `  Solo in their grid   : ${((soloAppearanceCount / totalCountryGridPairs) * 100).toFixed(1)}% of (country×grid) pairs`,
);
console.log(
  `  Multi-cell in grid   : ${((multiAppearanceCount / totalCountryGridPairs) * 100).toFixed(1)}%`,
);

// Top 15 most ubiquitous countries (cell appearances across pool)
const top15 = Object.entries(countryAppearancesInPool)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 15);
console.log("\n  Top 15 most present (cell slots in pool):");
for (const [code, count] of top15) {
  const grids = countryGridPresence[code] ?? 0;
  const avgCellsInGrid = (count / grids).toFixed(1);
  console.log(
    `    ${code.padEnd(4)} ${String(count).padStart(5)} cells  ${String(grids).padStart(4)} grids  ${avgCellsInGrid} cells/grid`,
  );
}

// Bottom 15 (rarest)
const bottom15 = Object.entries(countryAppearancesInPool)
  .sort((a, b) => a[1] - b[1])
  .slice(0, 15);
console.log("\n  15 rarest countries (cell slots in pool):");
for (const [code, count] of bottom15) {
  const grids = countryGridPresence[code] ?? 0;
  console.log(
    `    ${code.padEnd(4)} ${String(count).padStart(5)} cells  ${String(grids).padStart(4)} grids`,
  );
}

// Distribution histogram: bucket by appearances
const buckets: Record<string, number> = {
  "1–5": 0,
  "6–15": 0,
  "16–30": 0,
  "31–60": 0,
  "61–120": 0,
  ">120": 0,
};
for (const count of cellCounts) {
  if (count <= 5) buckets["1–5"]++;
  else if (count <= 15) buckets["6–15"]++;
  else if (count <= 30) buckets["16–30"]++;
  else if (count <= 60) buckets["31–60"]++;
  else if (count <= 120) buckets["61–120"]++;
  else buckets[">120"]++;
}
console.log("\n  Histogram (cell appearances in pool):");
const maxBucket = Math.max(...Object.values(buckets));
for (const [label, count] of Object.entries(buckets)) {
  const bar = "█".repeat(Math.round((count / maxBucket) * 30));
  console.log(
    `    ${label.padEnd(7)} ${String(count).padStart(3)} countries  ${bar}`,
  );
}

// Same analysis on scheduled 30 days
console.log("\n  ── Scheduled 30 days ──────────────────────────────");
const scheduledCellsPerCountry: Record<string, number> = {};
const scheduledGridsPerCountry: Record<string, number> = {};
for (const day of scheduled) {
  const seen = new Set<string>();
  for (const codes of Object.values(day.grid.validAnswers)) {
    for (const code of codes) {
      scheduledCellsPerCountry[code] =
        (scheduledCellsPerCountry[code] ?? 0) + 1;
      seen.add(code);
    }
  }
  for (const code of seen) {
    scheduledGridsPerCountry[code] = (scheduledGridsPerCountry[code] ?? 0) + 1;
  }
}
const schedCountryCounts = Object.values(scheduledCellsPerCountry).sort(
  (a, b) => a - b,
);
const schedAvgCells =
  schedCountryCounts.reduce((s, v) => s + v, 0) / schedCountryCounts.length;
const schedMedianCells =
  schedCountryCounts[Math.floor(schedCountryCounts.length / 2)] ?? 0;

const top10Sched = Object.entries(scheduledCellsPerCountry)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);
const bottom10Sched = Object.entries(scheduledCellsPerCountry)
  .sort((a, b) => a[1] - b[1])
  .slice(0, 10);

console.log(
  `  Countries seen       : ${Object.keys(scheduledCellsPerCountry).length}`,
);
console.log(
  `  Appearances/country  : avg ${schedAvgCells.toFixed(1)}  median ${schedMedianCells}`,
);
console.log("\n  Top 10 most present (30 scheduled days):");
for (const [code, count] of top10Sched) {
  const grids = scheduledGridsPerCountry[code] ?? 0;
  console.log(
    `    ${code.padEnd(4)} ${String(count).padStart(4)} cells  ${String(grids).padStart(3)} grids`,
  );
}
console.log("\n  10 rarest in schedule:");
for (const [code, count] of bottom10Sched) {
  const grids = scheduledGridsPerCountry[code] ?? 0;
  console.log(
    `    ${code.padEnd(4)} ${String(count).padStart(4)} cells  ${String(grids).padStart(3)} grids`,
  );
}

// ─── Pass/fail summary ────────────────────────────────────────────────────────

console.log("\n═══════════════════════════════════════════════════════");
console.log("  PASS/FAIL SUMMARY");
console.log("═══════════════════════════════════════════════════════");

const checks: Array<{ label: string; pass: boolean; value: string }> = [
  {
    label: "Pool: median grids/seed ≥ 10",
    pass: (() => {
      const counts = report.seedResults.map((r) => r.succeeded);
      const sortedCounts = [...counts].sort((a, b) => a - b);
      const median = sortedCounts[Math.floor(sortedCounts.length / 2)] ?? 0;
      return median >= 10;
    })(),
    value: (() => {
      const counts = report.seedResults.map((r) => r.succeeded);
      const sortedCounts = [...counts].sort((a, b) => a - b);
      return String(sortedCounts[Math.floor(sortedCounts.length / 2)] ?? 0);
    })(),
  },
  {
    label: "Pool: failed seeds ≤ 20%",
    pass: failed.length / CONSTRAINTS.length <= 0.2,
    value: `${failed.length}/${CONSTRAINTS.length}`,
  },
  {
    label: "Pool: constraint coverage ≥ 90%",
    pass: report.constraintCoverage >= 0.9,
    value: `${(report.constraintCoverage * 100).toFixed(1)}%`,
  },
  {
    label: "Pool: countries ≥ 160",
    pass: report.countryCoverage >= 160,
    value: String(report.countryCoverage),
  },
  {
    label: "Sched: 30 days fully covered",
    pass: scheduled.length === 30,
    value: `${scheduled.length}/30`,
  },
  {
    label: "Sched: unique constraints ≥ 85%",
    pass: uniqueConstraints.size / CONSTRAINTS.length >= 0.85,
    value: `${((uniqueConstraints.size / CONSTRAINTS.length) * 100).toFixed(1)}%`,
  },
  {
    label: "Sched: max reuse in 15d window ≤ 4",
    pass: maxWindowReuse <= 4,
    value: `${maxWindowReuse} (${worstWindowConstraint})`,
  },
  {
    label: "Sched: unique countries ≥ 150",
    pass: uniqueCountries.size >= 150,
    value: String(uniqueCountries.size),
  },
  {
    label: "Sched: median difficulty 35–45",
    pass: schedMedian >= 35 && schedMedian <= 45,
    value: String(schedMedian),
  },
  {
    label: "Pool: ≥ 60% remaining after 30d",
    pass: poolRemaining / pool.length >= 0.6,
    value: `${poolRemainingPct}%`,
  },
];

for (const c of checks) {
  const icon = c.pass ? "✓" : "✗";
  const status = c.pass ? "PASS" : "FAIL";
  console.log(`  ${icon} [${status}] ${c.label.padEnd(42)} ${c.value}`);
}

const passCount = checks.filter((c) => c.pass).length;
console.log(
  `\n  Result: ${passCount}/${checks.length} checks passed${passCount === checks.length ? " — ALL GOOD ✓" : " — INVESTIGATE ✗"}`,
);
