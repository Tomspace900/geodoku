/**
 * Pool quality audit (offline, no Convex).
 *
 * Generates fresh diverse pool(s) and reports, in clearly delimited sections:
 *   1. Per-constraint representation — breadth, % grids, seed coverage.
 *   2. Intra-grid redundancy        — overlap-coefficient distribution, the
 *                                      banned pairs, and the *borderline* zone
 *                                      spared by MAX_CONSTRAINT_OVERLAP.
 *   3. Concrete grid rendering      — worst-by-redundancy + a random sample,
 *                                      rendered legibly (labels + example countries).
 *   4. Answer concentration        — narrowest grids + trivial cells (few exits,
 *                                      all well-known).
 *
 * Sections 1–2 are *aggregate*: "is constraint X over-/under-represented?",
 * "do any grids pair near-synonyms?". Sections 3–4 close the historical blind
 * spot — no earlier tool ever *rendered* a concrete grid or measured the relation
 * between the two constraints crossing in a cell, so a single-theme grid
 * (Caribbean × North-America) slipped through every per-constraint statistic.
 *
 * Run: pnpm analyze:pool [--runs=3]
 */
import {
  MAX_CONSTRAINT_OVERLAP,
  MIN_CELL_SIZE,
  TARGET_GRIDS_PER_SEED,
} from "../../convex/lib/gridConstants";
import type { FinalizedPoolGrid } from "../../convex/lib/gridConstants";
import {
  buildConstraintMatches,
  generateDiversePool,
  overlapCoefficient,
} from "../../convex/lib/gridGenerator";
import countriesJson from "../../src/features/countries/data/countries.json";
import { topKPopularity } from "../../src/features/countries/lib/popularity";
import type { Country } from "../../src/features/countries/types";
import { CONSTRAINTS } from "../../src/features/game/logic/constraints";
import { translate } from "../../src/i18n/index";

// ─── Display tunables (local to this audit, not gameplay weights) ─────────────
const STARVED_SEED_MARGIN = 2; // flag a seed below TARGET − this many grids
const BORDERLINE_MIN_OVERLAP = 0.7; // [this, MAX_CONSTRAINT_OVERLAP) = spared-but-correlated
const WORST_GRIDS_TO_RENDER = 8; // most-redundant grids rendered in full
const SAMPLE_GRIDS_TO_RENDER = 6; // random grids rendered as a sanity sample
const NARROW_GRIDS_TO_SHOW = 10; // smallest answer pools listed
const CELL_EXAMPLES = 3; // example countries printed per cell
const TRIVIAL_CELL_POP = 0.85; // top-K notoriety above which exits are "obvious"
const TRIVIAL_CELL_MAX_SIZE = MIN_CELL_SIZE + 1; // small cell that also reads as trivial

// ─── Lookups (human-readable labels & country names, offline) ─────────────────
const COUNTRIES = countriesJson as Country[];
const LABEL_BY_ID: Record<string, string> = {};
for (const c of CONSTRAINTS) LABEL_BY_ID[c.id] = translate("en", c.labelKey);
const NAME_BY_CODE: Record<string, string> = {};
for (const c of COUNTRIES) NAME_BY_CODE[c.iso3] = c.names.en;

const labelFor = (id: string): string => LABEL_BY_ID[id] ?? id;
const nameFor = (code: string): string => NAME_BY_CODE[code] ?? code;

function intArg(flag: string, fallback: number): number {
  const raw = process.argv.find((a) => a.startsWith(`${flag}=`));
  const n = raw ? Number.parseInt(raw.split("=")[1], 10) : fallback;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const runs = intArg("--runs", 3);
const matches = buildConstraintMatches();

// ─── Generate pool(s) and accumulate everything from the grids themselves ─────
const breadth: Record<string, number> = {};
for (const c of CONSTRAINTS) breadth[c.id] = matches[c.id]?.size ?? 0;

const appearances: Record<string, number> = {};
const seeds: Record<string, number> = {};
for (const c of CONSTRAINTS) {
  appearances[c.id] = 0;
  seeds[c.id] = 0;
}

const allGrids: FinalizedPoolGrid[] = [];
const log = console.log;
for (let r = 0; r < runs; r++) {
  console.log = () => {}; // generateDiversePool is verbose per seed
  const { grids } = generateDiversePool();
  console.log = log;
  for (const g of grids) {
    allGrids.push(g);
    for (const id of g.metadata.constraintIds) appearances[id] += 1;
    seeds[g.metadata.seedConstraint] += 1;
  }
}
const totalGrids = allGrids.length;

// Worst (highest-overlap) constraint pair within a single grid.
type WorstPair = { overlap: number; a: string; b: string };
function worstPair(g: FinalizedPoolGrid): WorstPair {
  const ids = g.metadata.constraintIds;
  let best: WorstPair = { overlap: 0, a: ids[0], b: ids[1] };
  for (let a = 0; a < ids.length; a++) {
    for (let b = a + 1; b < ids.length; b++) {
      const o = overlapCoefficient(ids[a], ids[b], matches);
      if (o > best.overlap) best = { overlap: o, a: ids[a], b: ids[b] };
    }
  }
  return best;
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(q * sorted.length));
  return sorted[idx];
}

// ─── Section 1 — Per-constraint representation ────────────────────────────────
type Row = { id: string; breadth: number; pct: number; seedAvg: number };
const rows: Row[] = CONSTRAINTS.map((c) => ({
  id: c.id,
  breadth: breadth[c.id],
  pct: (appearances[c.id] / totalGrids) * 100,
  seedAvg: seeds[c.id] / runs,
})).sort((a, b) => b.pct - a.pct);

console.log(
  `\n══ 1. Représentation par contrainte ══  ${(totalGrids / runs).toFixed(0)} grilles/run (${runs} run·s) · seed cible ${TARGET_GRIDS_PER_SEED}/contrainte\n`,
);
console.log(
  `  ${"contrainte".padEnd(30)} ${"pays".padStart(4)} ${"%grilles".padStart(8)} ${"seed".padStart(5)}`,
);
console.log(`  ${"─".repeat(54)}`);
for (const r of rows) {
  const lowSeed =
    r.seedAvg < TARGET_GRIDS_PER_SEED - STARVED_SEED_MARGIN ? " ⚠️" : "";
  console.log(
    `  ${r.id.padEnd(30)} ${String(r.breadth).padStart(4)} ${`${r.pct.toFixed(1)}%`.padStart(8)} ${r.seedAvg.toFixed(0).padStart(5)}${lowSeed}`,
  );
}

const max = rows[0];
const starvedSeeds = rows.filter(
  (r) => r.seedAvg < TARGET_GRIDS_PER_SEED - STARVED_SEED_MARGIN,
);
console.log(
  `\n  Part max : ${max.pct.toFixed(1)}% (${max.id}) — le scheduler garde ${(100 - max.pct).toFixed(0)}% de grilles sans elle.`,
);
const starvedDetail =
  starvedSeeds.length > 0
    ? ` (${starvedSeeds.map((r) => r.id).join(", ")}) — borné par MAX_OVERLAP, pas par MAX_ATTEMPTS.`
    : "";
console.log(`  Seeds sous la cible : ${starvedSeeds.length}${starvedDetail}`);

// ─── Section 2 — Intra-grid redundancy ────────────────────────────────────────
const gridWorst = allGrids.map(worstPair);
const overlapsSorted = gridWorst.map((s) => s.overlap).sort((a, b) => a - b);

console.log("\n══ 2. Redondance intra-grille ══");
console.log(
  `  Max overlap coef / grille : p50 ${quantile(overlapsSorted, 0.5).toFixed(2)} · p75 ${quantile(overlapsSorted, 0.75).toFixed(2)} · p90 ${quantile(overlapsSorted, 0.9).toFixed(2)} · p95 ${quantile(overlapsSorted, 0.95).toFixed(2)} · max ${overlapsSorted[overlapsSorted.length - 1]?.toFixed(2) ?? "—"}`,
);
console.log(`  (filtre MAX_CONSTRAINT_OVERLAP = ${MAX_CONSTRAINT_OVERLAP})`);
for (const thr of [0.5, 0.6, 0.7, 0.8]) {
  const n = gridWorst.filter((s) => s.overlap >= thr).length;
  console.log(
    `  Grilles avec ≥1 paire overlap ≥ ${thr.toFixed(1)} : ${n} (${((n / gridWorst.length) * 100).toFixed(0)}%)`,
  );
}

// Catalogue-level pairwise overlap — judge the 0.85 calibration directly.
type CataloguePair = { overlap: number; a: string; b: string };
const cataloguePairs: CataloguePair[] = [];
const ids = CONSTRAINTS.map((c) => c.id as string);
for (let a = 0; a < ids.length; a++) {
  for (let b = a + 1; b < ids.length; b++) {
    const o = overlapCoefficient(ids[a], ids[b], matches);
    if (o >= BORDERLINE_MIN_OVERLAP)
      cataloguePairs.push({ overlap: o, a: ids[a], b: ids[b] });
  }
}
cataloguePairs.sort((x, y) => y.overlap - x.overlap);
const banned = cataloguePairs.filter(
  (p) => p.overlap >= MAX_CONSTRAINT_OVERLAP,
);
const borderline = cataloguePairs.filter(
  (p) => p.overlap < MAX_CONSTRAINT_OVERLAP,
);

console.log(
  `\n  Paires bannies au catalogue (overlap ≥ ${MAX_CONSTRAINT_OVERLAP}) : ${banned.length}`,
);
for (const p of banned.slice(0, 12)) {
  console.log(
    `    ${p.overlap.toFixed(3)}  ${labelFor(p.a)} × ${labelFor(p.b)}`,
  );
}
console.log(
  `\n  Paires borderline épargnées (${BORDERLINE_MIN_OVERLAP}–${MAX_CONSTRAINT_OVERLAP}) : ${borderline.length} — juger si le seuil est bien calé`,
);
for (const p of borderline.slice(0, 15)) {
  console.log(
    `    ${p.overlap.toFixed(3)}  ${labelFor(p.a)} × ${labelFor(p.b)}`,
  );
}

// ─── Section 3 — Concrete grid rendering ──────────────────────────────────────
function renderGrid(g: FinalizedPoolGrid, withExamples: boolean): void {
  const w = worstPair(g);
  console.log(
    `\n  GRID seed=${g.metadata.seedConstraint} · worst overlap ${w.overlap.toFixed(3)} (${labelFor(w.a)} × ${labelFor(w.b)})`,
  );
  console.log(`    cols: ${g.cols.map(labelFor).join(" │ ")}`);
  const labelWidth = Math.max(...g.rows.map((id) => labelFor(id).length));
  for (let r = 0; r < 3; r++) {
    const sizes = [0, 1, 2]
      .map((c) => String(g.validAnswers[`${r},${c}`].length).padStart(5))
      .join("");
    console.log(`    ${labelFor(g.rows[r]).padEnd(labelWidth)} ${sizes}`);
  }
  if (!withExamples) return;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const codes = g.validAnswers[`${r},${c}`];
      const ex = codes.slice(0, CELL_EXAMPLES).map(nameFor).join(", ");
      const more = codes.length > CELL_EXAMPLES ? "…" : "";
      console.log(
        `      [${labelFor(g.rows[r])} × ${labelFor(g.cols[c])}] (${codes.length}) ${ex}${more}`,
      );
    }
  }
}

console.log("\n══ 3. Rendu lisible des grilles ══");
console.log(
  `\n── ${WORST_GRIDS_TO_RENDER} grilles les plus redondantes (inspection) ──`,
);
const worstGrids = [...allGrids]
  .map((g) => ({ g, o: worstPair(g).overlap }))
  .sort((x, y) => y.o - x.o)
  .slice(0, WORST_GRIDS_TO_RENDER);
for (const { g } of worstGrids) renderGrid(g, true);

console.log(
  `\n── ${SAMPLE_GRIDS_TO_RENDER} grilles au hasard (échantillon) ──`,
);
const sample = [...allGrids]
  .sort(() => Math.random() - 0.5)
  .slice(0, SAMPLE_GRIDS_TO_RENDER);
for (const g of sample) renderGrid(g, false);

// ─── Section 4 — Answer concentration ─────────────────────────────────────────
console.log("\n══ 4. Concentration des réponses ══");

const poolsSorted = allGrids
  .map((g) => g.metadata.countryPool.length)
  .sort((a, b) => a - b);
console.log(
  `  Taille countryPool / grille : p05 ${quantile(poolsSorted, 0.05)} · p10 ${quantile(poolsSorted, 0.1)} · p25 ${quantile(poolsSorted, 0.25)} · p50 ${quantile(poolsSorted, 0.5)} · min ${poolsSorted[0] ?? "—"}`,
);

console.log(
  `\n  ${NARROW_GRIDS_TO_SHOW} grilles les plus étroites (peu de pays distincts) :`,
);
const narrow = [...allGrids]
  .sort((a, b) => a.metadata.countryPool.length - b.metadata.countryPool.length)
  .slice(0, NARROW_GRIDS_TO_SHOW);
for (const g of narrow) {
  console.log(
    `    ${String(g.metadata.countryPool.length).padStart(3)} pays  seed=${g.metadata.seedConstraint}  [${g.metadata.constraintIds.map(labelFor).join(", ")}]`,
  );
}

// Trivial cells: few exits AND all top-K exits well-known.
type TrivialGrid = { g: FinalizedPoolGrid; trivial: number };
const trivialGrids: TrivialGrid[] = [];
let trivialCells = 0;
let totalCells = 0;
for (const g of allGrids) {
  let count = 0;
  for (const codes of Object.values(g.validAnswers)) {
    totalCells += 1;
    if (
      codes.length <= TRIVIAL_CELL_MAX_SIZE &&
      topKPopularity(codes) >= TRIVIAL_CELL_POP
    ) {
      count += 1;
      trivialCells += 1;
    }
  }
  if (count > 0) trivialGrids.push({ g, trivial: count });
}
console.log(
  `\n  Cellules triviales (≤ ${TRIVIAL_CELL_MAX_SIZE} sorties, top-K notoriété ≥ ${TRIVIAL_CELL_POP}) : ${trivialCells}/${totalCells} (${((trivialCells / totalCells) * 100).toFixed(1)}%)`,
);
trivialGrids.sort((x, y) => y.trivial - x.trivial);
for (const { g, trivial } of trivialGrids.slice(0, 5)) {
  console.log(
    `    ${trivial} cellule·s triviale·s  seed=${g.metadata.seedConstraint}  [${g.metadata.constraintIds.map(labelFor).join(", ")}]`,
  );
}
