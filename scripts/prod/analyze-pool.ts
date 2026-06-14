import { TARGET_GRIDS_PER_SEED } from "../../convex/lib/gridConstants.ts";
/**
 * Per-constraint pool representation analysis (offline, no Convex).
 *
 * Generates a fresh diverse pool and reports, for each constraint:
 * - breadth  : how many countries match it
 * - % grids  : share of the pool that contains it
 * - seed     : how many grids are seeded on it (coverage floor; target = TARGET_GRIDS_PER_SEED)
 *
 * Use this to answer "is constraint X over-/under-represented?" with numbers
 * instead of intuition — especially before adding a new (broad) constraint or
 * any throttling mechanism. Empirically the generator self-regulates: broad
 * constraints self-limit via MAX_CELL_SIZE (max share ~24%), and the real risk
 * is the opposite end — narrow/clustered seeds failing to reach their seed
 * target (bounded by MAX_OVERLAP_BETWEEN_GRIDS, not MAX_ATTEMPTS_PER_SEED).
 *
 * Run: pnpm analyze:pool [--runs=3]
 */
import {
  buildConstraintMatches,
  generateDiversePool,
  overlapCoefficient,
} from "../../convex/lib/gridGenerator.ts";
import { CONSTRAINTS } from "../../src/features/game/logic/constraints.ts";

function intArg(flag: string, fallback: number): number {
  const raw = process.argv.find((a) => a.startsWith(`${flag}=`));
  const n = raw ? Number.parseInt(raw.split("=")[1], 10) : fallback;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const runs = intArg("--runs", 3);

const breadth: Record<string, number> = {};
const matches = buildConstraintMatches();
for (const c of CONSTRAINTS) breadth[c.id] = matches[c.id]?.size ?? 0;

const appearances: Record<string, number> = {};
const seeds: Record<string, number> = {};
for (const c of CONSTRAINTS) {
  appearances[c.id] = 0;
  seeds[c.id] = 0;
}

// Per-grid redundancy stats (anti-boring-grid filter calibration).
type GridStat = {
  maxOverlap: number;
  pair: [string, string];
  poolSize: number;
};
const gridStats: GridStat[] = [];

let totalGrids = 0;
const log = console.log;
for (let r = 0; r < runs; r++) {
  console.log = () => {}; // generateDiversePool is verbose per seed
  const { grids } = generateDiversePool();
  console.log = log;
  totalGrids += grids.length;
  for (const g of grids) {
    for (const id of g.metadata.constraintIds) appearances[id] += 1;
    seeds[g.metadata.seedConstraint] += 1;

    const ids = g.metadata.constraintIds;
    let maxOverlap = 0;
    let pair: [string, string] = [ids[0], ids[1]];
    for (let a = 0; a < ids.length; a++) {
      for (let b = a + 1; b < ids.length; b++) {
        const o = overlapCoefficient(ids[a], ids[b], matches);
        if (o > maxOverlap) {
          maxOverlap = o;
          pair = [ids[a], ids[b]];
        }
      }
    }
    gridStats.push({
      maxOverlap,
      pair,
      poolSize: g.metadata.countryPool.length,
    });
  }
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(q * sorted.length));
  return sorted[idx];
}

type Row = { id: string; breadth: number; pct: number; seedAvg: number };
const rows: Row[] = CONSTRAINTS.map((c) => ({
  id: c.id,
  breadth: breadth[c.id],
  pct: (appearances[c.id] / totalGrids) * 100,
  seedAvg: seeds[c.id] / runs,
})).sort((a, b) => b.pct - a.pct);

console.log(
  `\nPool : ${(totalGrids / runs).toFixed(0)} grilles/run (${runs} run·s) · seed cible ${TARGET_GRIDS_PER_SEED}/contrainte\n`,
);
console.log(
  `  ${"contrainte".padEnd(30)} ${"pays".padStart(4)} ${"%grilles".padStart(8)} ${"seed".padStart(5)}`,
);
console.log(`  ${"─".repeat(54)}`);
for (const r of rows) {
  const lowSeed = r.seedAvg < TARGET_GRIDS_PER_SEED - 2 ? " ⚠️" : "";
  console.log(
    `  ${r.id.padEnd(30)} ${String(r.breadth).padStart(4)} ${`${r.pct.toFixed(1)}%`.padStart(8)} ${r.seedAvg.toFixed(0).padStart(5)}${lowSeed}`,
  );
}

const max = rows[0];
const starvedSeeds = rows.filter((r) => r.seedAvg < TARGET_GRIDS_PER_SEED - 2);
console.log("\n── Synthèse ──");
console.log(
  `  Part max : ${max.pct.toFixed(1)}% (${max.id}) — le scheduler garde ${(100 - max.pct).toFixed(0)}% de grilles sans elle.`,
);
const starvedDetail =
  starvedSeeds.length > 0
    ? ` (${starvedSeeds.map((r) => r.id).join(", ")}) — borné par MAX_OVERLAP, pas par MAX_ATTEMPTS.`
    : "";
console.log(`  Seeds sous la cible : ${starvedSeeds.length}${starvedDetail}`);

// ── Redondance intra-grille (calibration MAX_CONSTRAINT_OVERLAP) ──
// La distribution du countryPool reste informative (diversité de l'espace de
// réponses), même sans plancher dur : un plancher biaiserait contre les
// contraintes étroites (cf. gridConstants MAX_CONSTRAINT_OVERLAP).
const overlapsSorted = gridStats.map((s) => s.maxOverlap).sort((a, b) => a - b);
const poolsSorted = gridStats.map((s) => s.poolSize).sort((a, b) => a - b);

console.log("\n── Redondance intra-grille ──");
console.log(
  `  Max overlap coef / grille  : p50 ${quantile(overlapsSorted, 0.5).toFixed(2)} · p75 ${quantile(overlapsSorted, 0.75).toFixed(2)} · p90 ${quantile(overlapsSorted, 0.9).toFixed(2)} · p95 ${quantile(overlapsSorted, 0.95).toFixed(2)} · max ${overlapsSorted[overlapsSorted.length - 1]?.toFixed(2) ?? "—"}`,
);
console.log(
  `  Taille countryPool / grille: p05 ${quantile(poolsSorted, 0.05)} · p10 ${quantile(poolsSorted, 0.1)} · p25 ${quantile(poolsSorted, 0.25)} · p50 ${quantile(poolsSorted, 0.5)} · min ${poolsSorted[0] ?? "—"}`,
);

for (const thr of [0.5, 0.6, 0.7, 0.8]) {
  const n = gridStats.filter((s) => s.maxOverlap >= thr).length;
  console.log(
    `  Grilles avec ≥1 paire overlap ≥ ${thr.toFixed(1)} : ${n} (${((n / gridStats.length) * 100).toFixed(0)}%)`,
  );
}

console.log("\n  Top 10 paires les plus redondantes (grille la pire) :");
const worst = [...gridStats]
  .sort((a, b) => b.maxOverlap - a.maxOverlap)
  .slice(0, 10);
for (const s of worst) {
  console.log(
    `    ${s.maxOverlap.toFixed(2)}  ${s.pair[0]} × ${s.pair[1]}  (pool ${s.poolSize})`,
  );
}
