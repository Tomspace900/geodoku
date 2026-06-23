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
  KNOWN_CONSTRAINT_WINDOW,
  MAX_CONSTRAINT_OVERLAP,
  MAX_NEW_CONSTRAINTS_PER_GRID,
  MIN_CONSTRAINT_GAP_DAYS,
  MIN_VIABLE_GRIDS_PER_SEED,
} from "../convex/lib/gridConstants";
import {
  buildConstraintMatches,
  generateDiversePool,
  overlapCoefficient,
} from "../convex/lib/gridGenerator";
import { selectNextGrid } from "../convex/lib/gridScheduler";
import { CONSTRAINTS } from "../src/features/game/logic/constraints";

// Pass/fail thresholds for the health summary — tune here, never inline below.
// The failed/low-yield split is anchored on MIN_VIABLE_GRIDS_PER_SEED (shared
// with the generator): succeeded < MIN_VIABLE → failed, [MIN_VIABLE, lowYield)
// → low-yield (informational).
const CHECK_THRESHOLDS = {
  lowYieldGrids: 10,
  medianGridsPerSeed: 10,
  maxFailedSeedRatio: 0.2,
  minConstraintCoverage: 0.9,
  minCountryCoverage: 160,
  minUniqueConstraintRatio: 0.85,
  maxSharedConstraints: 3,
  minUniqueCountries: 150,
  minPoolRemainingRatio: 0.6,
} as const;

// Scheduling horizon simulated below.
const SIM_DAYS = 30;

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

// Per-seed breakdown
const failed = report.seedResults.filter((r) => r.failed);
const lowYield = report.seedResults.filter(
  (r) => !r.failed && r.succeeded < CHECK_THRESHOLDS.lowYieldGrids,
);

console.log(
  `\n  Failed seeds (< ${MIN_VIABLE_GRIDS_PER_SEED} grids) : ${failed.length}`,
);
for (const r of failed) {
  console.log(`    ✗ ${r.constraintId} — ${r.succeeded}/${r.attempted} grids`);
}
if (lowYield.length > 0) {
  console.log(
    `  Low-yield seeds (${MIN_VIABLE_GRIDS_PER_SEED}–${CHECK_THRESHOLDS.lowYieldGrids - 1} grids) : ${lowYield.length}`,
  );
  for (const r of lowYield) {
    console.log(`    ~ ${r.constraintId} — ${r.succeeded}`);
  }
}

// ─── 30-day simulation ────────────────────────────────────────────────────────

console.log("\n═══════════════════════════════════════════════════════");
console.log(`  SCHEDULING SIMULATION (${SIM_DAYS} days)`);
console.log("═══════════════════════════════════════════════════════");

type PoolGrid = {
  _id: string;
  rows: string[];
  cols: string[];
  validAnswers: Record<string, string[]>;
  metadata: FinalizedPoolGrid["metadata"];
};

const poolByCandId = new Map<string, PoolGrid>();
const poolQueue: PoolGrid[] = pool.map((g, i) => {
  const entry: PoolGrid = {
    _id: `cand_${i}`,
    rows: g.rows,
    cols: g.cols,
    validAnswers: g.validAnswers,
    metadata: g.metadata,
  };
  poolByCandId.set(entry._id, entry);
  return entry;
});

type ScheduledDay = {
  day: number;
  grid: PoolGrid;
  score: number;
  constraintIds: string[];
};

const scheduled: ScheduledDay[] = [];
const usedIds = new Set<string>();

for (let day = 1; day <= SIM_DAYS; day++) {
  const available = poolQueue.filter((g) => !usedIds.has(g._id));
  const recent = scheduled
    .slice(-KNOWN_CONSTRAINT_WINDOW)
    .reverse()
    .map((d) => ({ rows: d.grid.rows, cols: d.grid.cols }));

  const result = selectNextGrid(available, recent);
  if (!result) {
    console.log(`  Day ${String(day).padStart(2)}: ✗ NO GRID (pool exhausted)`);
    break;
  }

  usedIds.add(result.grid._id);
  const fullGrid = poolByCandId.get(result.grid._id);
  if (!fullGrid) throw new Error(`Missing pool entry for ${result.grid._id}`);
  scheduled.push({
    day,
    grid: fullGrid,
    score: result.score,
    constraintIds: result.grid.metadata.constraintIds,
  });
}

// Print table
console.log(`\n  ${"Day".padEnd(4)} ${"Score".padEnd(7)} Constraints`);
console.log(`  ${"─".repeat(65)}`);
for (const d of scheduled) {
  const ids = d.constraintIds.join(", ");
  const truncated = ids.length > 50 ? `${ids.slice(0, 47)}...` : ids;
  console.log(
    `  ${String(d.day).padEnd(4)} ${d.score.toFixed(1).padEnd(7)} ${truncated}`,
  );
}

// ─── Simulation metrics ───────────────────────────────────────────────────────

console.log("\n═══════════════════════════════════════════════════════");
console.log(`  SIMULATION METRICS (${SIM_DAYS} days)`);
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

// Smallest gap (days) between two appearances of the same constraint — the
// recency invariant the old aggregate checks were blind to.
const scheduledDaysByConstraint: Record<string, number[]> = {};
scheduled.forEach((d, i) => {
  for (const id of d.constraintIds) {
    if (!scheduledDaysByConstraint[id]) scheduledDaysByConstraint[id] = [];
    scheduledDaysByConstraint[id].push(i);
  }
});
let minConstraintGap = Number.POSITIVE_INFINITY;
let minGapConstraint = "";
for (const [id, days] of Object.entries(scheduledDaysByConstraint)) {
  for (let i = 1; i < days.length; i++) {
    const gap = days[i] - days[i - 1];
    if (gap < minConstraintGap) {
      minConstraintGap = gap;
      minGapConstraint = id;
    }
  }
}
const minGapValue = Number.isFinite(minConstraintGap)
  ? minConstraintGap
  : SIM_DAYS;

// Non-redondance de grille : croisements (cellules) répétés et chevauchement de
// contraintes, sur la fenêtre HISTORY_WINDOW — la dimension que cible le scheduler.
const crossingsOf = (rows: string[], cols: string[]): string[] => {
  const o: string[] = [];
  for (const r of rows)
    for (const c of cols) o.push(r < c ? `${r}|${c}` : `${c}|${r}`);
  return o;
};
let crossingRepeats = 0;
let maxShared = 0;
scheduled.forEach((d, i) => {
  const xs = crossingsOf(d.grid.rows, d.grid.cols);
  const set = new Set(d.constraintIds);
  for (const x of xs) {
    for (let j = i - 1; j >= 0 && i - j <= HISTORY_WINDOW; j--) {
      if (
        crossingsOf(scheduled[j].grid.rows, scheduled[j].grid.cols).includes(x)
      ) {
        crossingRepeats++;
        break;
      }
    }
  }
  for (let j = i - 1; j >= 0 && i - j <= HISTORY_WINDOW; j--) {
    let sh = 0;
    for (const id of scheduled[j].constraintIds) if (set.has(id)) sh++;
    if (sh > maxShared) maxShared = sh;
  }
});

console.log(`  Days scheduled    : ${scheduled.length}/${SIM_DAYS}`);
console.log(
  `  Crossings repeated (≤${HISTORY_WINDOW}d) : ${crossingRepeats} ; max shared constraints : ${maxShared}`,
);
console.log(
  `  Min gap between reappearances : ${minGapValue} days (${minGapConstraint || "n/a"})`,
);
console.log(
  `  Unique constraints: ${uniqueConstraints.size} / ${CONSTRAINTS.length} (${((uniqueConstraints.size / CONSTRAINTS.length) * 100).toFixed(1)}%)`,
);
console.log(`  Max reuse (${SIM_DAYS}d total)        : ${maxReuse}`);
console.log(
  `  Max reuse (worst ${HISTORY_WINDOW}d window) : ${maxWindowReuse} (${worstWindowConstraint}, days ${worstWindowStart}–${worstWindowStart + HISTORY_WINDOW - 1})`,
);
console.log(`  Unique countries in solution : ${uniqueCountries.size}`);
console.log(
  `  Pool remaining    : ${poolRemaining}/${pool.length} (${poolRemainingPct}%)`,
);

// Most reused constraints (whole horizon)
const topReused = Object.entries(constraintUsage)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5);
console.log(`\n  Most reused constraints (${SIM_DAYS}d):`);
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

// Same analysis on the scheduled horizon
console.log(`\n  ── Scheduled ${SIM_DAYS} days ──────────────────────────────`);
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
console.log(`\n  Top 10 most present (${SIM_DAYS} scheduled days):`);
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

// ─── Cold-start sub-simulation ──────────────────────────────────────────────────
// The from-scratch sim above never exercises the cold-start guard (an empty start
// keeps it skipped). Here we reproduce the real trigger: a *mature* history built
// without a held-out minority of constraints, then a rollout from the full pool —
// the guard must weave the newcomers in gradually, not flood the schedule.

console.log("\n═══════════════════════════════════════════════════════");
console.log("  COLD-START ROLLOUT (mature history + held-out batch)");
console.log("═══════════════════════════════════════════════════════");

const COLDSTART_ROLLOUT_DAYS = 50;
// Hold out every 4th constraint (spread across breadths) as the synthetic batch.
const heldOut = new Set(
  CONSTRAINTS.filter((_, i) => i % 4 === 0).map((c) => c.id as string),
);
const hFreePool = poolQueue.filter((g) =>
  g.metadata.constraintIds.every((id) => !heldOut.has(id)),
);

const csUsed = new Set<string>();
const csHistory: PoolGrid[] = []; // chronological, newest last

function csRecent(): { rows: string[]; cols: string[] }[] {
  return [...csHistory.slice(-KNOWN_CONSTRAINT_WINDOW)]
    .reverse()
    .map((g) => ({ rows: g.rows, cols: g.cols }));
}

// Phase 1 — establish a mature history (≥ KNOWN_CONSTRAINT_WINDOW) over the kept set.
for (let i = 0; i < KNOWN_CONSTRAINT_WINDOW; i++) {
  const avail = hFreePool.filter((g) => !csUsed.has(g._id));
  const r = selectNextGrid(avail, csRecent());
  if (!r) break;
  csUsed.add(r.grid._id);
  const full = poolByCandId.get(r.grid._id);
  if (full) csHistory.push(full);
}

const matureHistoryLen = csHistory.length;

// Phase 2 — roll out from the full pool, counting newcomers introduced per grid.
const csPerGrid: number[] = [];
const csIntroduced = new Set<string>();
for (let d = 0; d < COLDSTART_ROLLOUT_DAYS; d++) {
  const avail = poolQueue.filter((g) => !csUsed.has(g._id));
  const seen = new Set(
    csHistory
      .slice(-KNOWN_CONSTRAINT_WINDOW)
      .flatMap((g) => g.metadata.constraintIds),
  );
  const r = selectNextGrid(avail, csRecent());
  if (!r) break;
  const newcomers = r.grid.metadata.constraintIds.filter((id) => !seen.has(id));
  csPerGrid.push(newcomers.length);
  for (const id of newcomers) if (heldOut.has(id)) csIntroduced.add(id);
  csUsed.add(r.grid._id);
  const full = poolByCandId.get(r.grid._id);
  if (full) csHistory.push(full);
}

const csMatured = matureHistoryLen >= KNOWN_CONSTRAINT_WINDOW;
const csMaxPerGrid = csPerGrid.length ? Math.max(...csPerGrid) : 0;

console.log(`  Held-out batch     : ${heldOut.size} constraints`);
console.log(`  Mature history     : ${matureHistoryLen} grids (kept set only)`);
console.log(
  `  Rollout newcomers/grid (first 21): ${csPerGrid.slice(0, 21).join(" ")}`,
);
console.log(
  `  Max newcomers/grid : ${csMaxPerGrid} (cap ${MAX_NEW_CONSTRAINTS_PER_GRID})`,
);
console.log(
  `  Batch introduced   : ${csIntroduced.size}/${heldOut.size} within ${COLDSTART_ROLLOUT_DAYS} days`,
);

// ─── Pass/fail summary ────────────────────────────────────────────────────────

console.log("\n═══════════════════════════════════════════════════════");
console.log("  PASS/FAIL SUMMARY");
console.log("═══════════════════════════════════════════════════════");

// Intra-grid redundancy invariant (MAX_CONSTRAINT_OVERLAP).
const redundancyMatches = buildConstraintMatches();
let poolWorstOverlap = 0;
for (const g of pool) {
  const ids = g.metadata.constraintIds;
  for (let a = 0; a < ids.length; a++) {
    for (let b = a + 1; b < ids.length; b++) {
      const o = overlapCoefficient(ids[a], ids[b], redundancyMatches);
      if (o > poolWorstOverlap) poolWorstOverlap = o;
    }
  }
}

const seedYields = report.seedResults
  .map((r) => r.succeeded)
  .sort((a, b) => a - b);
const medianGridsPerSeed = seedYields[Math.floor(seedYields.length / 2)] ?? 0;

const checks: Array<{ label: string; pass: boolean; value: string }> = [
  {
    label: `Pool: median grids/seed ≥ ${CHECK_THRESHOLDS.medianGridsPerSeed}`,
    pass: medianGridsPerSeed >= CHECK_THRESHOLDS.medianGridsPerSeed,
    value: String(medianGridsPerSeed),
  },
  {
    label: `Pool: failed seeds ≤ ${CHECK_THRESHOLDS.maxFailedSeedRatio * 100}%`,
    pass:
      failed.length / CONSTRAINTS.length <= CHECK_THRESHOLDS.maxFailedSeedRatio,
    value: `${failed.length}/${CONSTRAINTS.length}`,
  },
  {
    label: `Pool: constraint coverage ≥ ${CHECK_THRESHOLDS.minConstraintCoverage * 100}%`,
    pass: report.constraintCoverage >= CHECK_THRESHOLDS.minConstraintCoverage,
    value: `${(report.constraintCoverage * 100).toFixed(1)}%`,
  },
  {
    label: `Pool: countries ≥ ${CHECK_THRESHOLDS.minCountryCoverage}`,
    pass: report.countryCoverage >= CHECK_THRESHOLDS.minCountryCoverage,
    value: String(report.countryCoverage),
  },
  {
    label: "Pool: max constraint overlap < limit",
    pass: poolWorstOverlap < MAX_CONSTRAINT_OVERLAP,
    value: `${poolWorstOverlap.toFixed(3)} < ${MAX_CONSTRAINT_OVERLAP}`,
  },
  {
    label: `Sched: ${SIM_DAYS} days fully covered`,
    pass: scheduled.length === SIM_DAYS,
    value: `${scheduled.length}/${SIM_DAYS}`,
  },
  {
    label: `Sched: unique constraints ≥ ${CHECK_THRESHOLDS.minUniqueConstraintRatio * 100}%`,
    pass:
      uniqueConstraints.size / CONSTRAINTS.length >=
      CHECK_THRESHOLDS.minUniqueConstraintRatio,
    value: `${((uniqueConstraints.size / CONSTRAINTS.length) * 100).toFixed(1)}%`,
  },
  {
    label: `Sched: écart min réapparitions ≥ ${MIN_CONSTRAINT_GAP_DAYS}`,
    pass: minGapValue >= MIN_CONSTRAINT_GAP_DAYS,
    value: `${minGapValue} (${minGapConstraint || "n/a"})`,
  },
  {
    label: `Sched: 0 croisement répété (≤${HISTORY_WINDOW}d)`,
    pass: crossingRepeats === 0,
    value: String(crossingRepeats),
  },
  {
    label: `Sched: chevauchement max ≤ ${CHECK_THRESHOLDS.maxSharedConstraints}`,
    pass: maxShared <= CHECK_THRESHOLDS.maxSharedConstraints,
    value: String(maxShared),
  },
  {
    label: `Sched: unique countries ≥ ${CHECK_THRESHOLDS.minUniqueCountries}`,
    pass: uniqueCountries.size >= CHECK_THRESHOLDS.minUniqueCountries,
    value: String(uniqueCountries.size),
  },
  {
    label: `Pool: ≥ ${CHECK_THRESHOLDS.minPoolRemainingRatio * 100}% remaining after ${SIM_DAYS}d`,
    pass: poolRemaining / pool.length >= CHECK_THRESHOLDS.minPoolRemainingRatio,
    value: `${poolRemainingPct}%`,
  },
  {
    label: "Cold-start: no newcomer flood",
    pass: csMatured && csMaxPerGrid <= MAX_NEW_CONSTRAINTS_PER_GRID,
    value: csMatured
      ? `max ${csMaxPerGrid}/grid ≤ ${MAX_NEW_CONSTRAINTS_PER_GRID}`
      : "history not mature",
  },
  {
    label: "Cold-start: batch fully woven in",
    pass: csIntroduced.size === heldOut.size,
    value: `${csIntroduced.size}/${heldOut.size}`,
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
