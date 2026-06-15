/**
 * Analyse statistique de la difficulté OBSERVÉE des cases (tuning continu).
 *
 * Rejoue l'étude de juin 2026 qui a invalidé la difficulté prédite et validé
 * la notoriété des solutions (popTop3) comme seul prédicteur du taux d'échec :
 *   - classement des contraintes par taux d'échec observé ;
 *   - corrélations pondérées des features de case (taille du pool, popTopK…) ;
 *   - validation croisée leave-one-day-out (LODO) contre le taux d'échec ;
 *   - comparaison des agrégations de popularité (topK, décroissances géo.) ;
 *   - bootstrap apparié par jours : le meilleur combo bat-il popTop3 ?
 *
 * À relancer quand le volume de données a sensiblement grossi (~2× les jours
 * trackés) pour re-trancher top3 vs top4/top5 et recalibrer si besoin.
 *
 * Usage:
 *   pnpm analyze:observed                # depuis FAILED_ATTEMPTS_SINCE
 *   pnpm analyze:observed --days=14      # fenêtre bornée aux 14 derniers jours
 *
 * `VITE_CONVEX_URL` + `ADMIN_TOKEN` lus depuis `.env.local` (cf. package.json).
 */
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { countryPopularity } from "../../src/features/countries/lib/popularity";
import { offsetUTC, todayUTC } from "../../src/lib/dates";

// ─── Constantes ───────────────────────────────────────────────────────────────

/**
 * Date de déploiement de `recordFailedGuess` / `dailyStats.failedAttempts`.
 * AVANT : pas de tracking des échecs → taux d'échec incalculable, jours exclus.
 * Garder aligné avec FAILED_ATTEMPTS_SINCE de scripts/export-analytics.ts.
 */
const FAILED_ATTEMPTS_SINCE = "2026-05-30";

/** Réplicats du bootstrap apparié (resampling des jours). */
const BOOTSTRAP_REPLICATES = 1000;

// ─── Args / env ───────────────────────────────────────────────────────────────

function parseArgs(argv: string[]): { days: number } {
  let days = 365;
  for (const arg of argv) {
    const daysMatch = arg.match(/^--days=(\d+)$/);
    if (daysMatch) days = Number.parseInt(daysMatch[1], 10);
  }
  return { days };
}

const { days: DAYS_WINDOW } = parseArgs(process.argv.slice(2));

const CONVEX_URL = process.env.VITE_CONVEX_URL ?? process.env.CONVEX_URL;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

if (!CONVEX_URL) {
  console.error(
    "Missing VITE_CONVEX_URL (or CONVEX_URL). Tip: tsx --env-file=.env.local …",
  );
  process.exit(1);
}
if (!ADMIN_TOKEN) {
  console.error("Missing ADMIN_TOKEN env var.");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

// ─── Collecte ─────────────────────────────────────────────────────────────────

type CellRecord = {
  date: string;
  rowId: string;
  colId: string;
  codes: string[];
  fails: number;
  attempts: number;
  /** Taux d'échec observé = fails / attempts (la variable à prédire). */
  y: number;
  features: Record<string, number>;
};

// Agrégations candidates de la popularité des solutions d'une case (triées
// desc). Le signal validé est « les quelques meilleures portes de sortie »,
// d'où la dominance des topK ; les agrégations pool entier servent de témoin.
const AGGREGATIONS: Record<string, (pops: number[]) => number> = {
  popTop1: (pops) => meanTopK(pops, 1),
  popTop2: (pops) => meanTopK(pops, 2),
  popTop3: (pops) => meanTopK(pops, 3),
  popTop4: (pops) => meanTopK(pops, 4),
  popTop5: (pops) => meanTopK(pops, 5),
  popGeo05: (pops) => geoDecay(pops, 0.5),
  popGeo07: (pops) => geoDecay(pops, 0.7),
  popMean: (pops) => pops.reduce((s, p) => s + p, 0) / pops.length,
  popMin: (pops) => Math.min(...pops),
};

const BASELINE_AGG = "popTop3";

function meanTopK(popsDesc: number[], k: number): number {
  const slice = popsDesc.slice(0, Math.min(k, popsDesc.length));
  return slice.reduce((s, p) => s + p, 0) / slice.length;
}

function geoDecay(popsDesc: number[], q: number): number {
  let num = 0;
  let den = 0;
  popsDesc.forEach((p, i) => {
    const w = q ** i;
    num += p * w;
    den += w;
  });
  return num / den;
}

async function fetchCells(): Promise<CellRecord[]> {
  const today = todayUTC();
  const windowStart = offsetUTC(-(DAYS_WINDOW - 1));
  const start =
    windowStart > FAILED_ATTEMPTS_SINCE ? windowStart : FAILED_ATTEMPTS_SINCE;

  const records: CellRecord[] = [];
  for (let date = start; date <= today; date = nextDay(date)) {
    const metrics = await client.query(api.grids.getGridCellMetrics, {
      adminToken: ADMIN_TOKEN as string,
      date,
    });
    if (!metrics) continue;
    for (const [cellKey, cell] of Object.entries(metrics.cells)) {
      const fails = cell.failedAttempts;
      const attempts = fails + cell.totalGuesses;
      if (attempts === 0) continue;
      const [r, c] = cellKey.split(",").map(Number);
      const codes = cell.validAnswers;
      const popsDesc = codes.map(countryPopularity).sort((a, b) => b - a);
      const features: Record<string, number> = {
        poolSize: codes.length,
      };
      for (const [name, agg] of Object.entries(AGGREGATIONS)) {
        features[name] = popsDesc.length ? agg(popsDesc) : 0.5;
      }
      records.push({
        date,
        rowId: metrics.rows[r],
        colId: metrics.cols[c],
        codes,
        fails,
        attempts,
        y: fails / attempts,
        features,
      });
    }
  }
  return records;
}

function nextDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return next.toISOString().slice(0, 10);
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function weightedMean(xs: number[], ws: number[]): number {
  let num = 0;
  let den = 0;
  xs.forEach((x, i) => {
    num += x * ws[i];
    den += ws[i];
  });
  return num / den;
}

function weightedPearson(xs: number[], ys: number[], ws: number[]): number {
  const mx = weightedMean(xs, ws);
  const my = weightedMean(ys, ws);
  let cov = 0;
  let vx = 0;
  let vy = 0;
  xs.forEach((x, i) => {
    const dx = x - mx;
    const dy = ys[i] - my;
    cov += ws[i] * dx * dy;
    vx += ws[i] * dx * dx;
    vy += ws[i] * dy * dy;
  });
  if (vx === 0 || vy === 0) return Number.NaN;
  return cov / Math.sqrt(vx * vy);
}

function pearson(xs: number[], ys: number[]): number {
  return weightedPearson(
    xs,
    ys,
    xs.map(() => 1),
  );
}

/** Rangs moyens en cas d'ex-aequo (pour Spearman). */
function ranks(vals: number[]): number[] {
  const indexed = vals.map((v, i) => [v, i] as const);
  indexed.sort((a, b) => a[0] - b[0]);
  const out = new Array<number>(vals.length);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j + 1 < indexed.length && indexed[j + 1][0] === indexed[i][0]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) out[indexed[k][1]] = avg;
    i = j + 1;
  }
  return out;
}

function spearman(xs: number[], ys: number[]): number {
  return pearson(ranks(xs), ranks(ys));
}

/** Régression linéaire pondérée univariée : y = a + b·x. */
function weightedOls(
  xs: number[],
  ys: number[],
  ws: number[],
): { a: number; b: number } {
  const mx = weightedMean(xs, ws);
  const my = weightedMean(ys, ws);
  let cov = 0;
  let vx = 0;
  xs.forEach((x, i) => {
    cov += ws[i] * (x - mx) * (ys[i] - my);
    vx += ws[i] * (x - mx) * (x - mx);
  });
  const b = vx === 0 ? 0 : cov / vx;
  return { a: my - b * mx, b };
}

/**
 * Validation croisée leave-one-day-out : fit pondéré (par tentatives) sur les
 * autres jours, prédiction du jour tenu, corrélation sur les prédictions
 * out-of-fold poolées. Protège du sur-ajustement à la cohorte d'un jour.
 */
function lodoCv(
  cells: CellRecord[],
  dates: string[],
  feature: string,
): { r: number; rho: number } {
  const preds: number[] = [];
  const obs: number[] = [];
  for (const heldOut of dates) {
    const train = cells.filter((c) => c.date !== heldOut);
    const test = cells.filter((c) => c.date === heldOut);
    const fit = weightedOls(
      train.map((c) => c.features[feature]),
      train.map((c) => c.y),
      train.map((c) => c.attempts),
    );
    for (const cell of test) {
      preds.push(fit.a + fit.b * cell.features[feature]);
      obs.push(cell.y);
    }
  }
  return { r: pearson(preds, obs), rho: spearman(preds, obs) };
}

/** r corrélé après centrage par jour (contrôle de l'effet cohorte). */
function dayCenteredR(
  cells: CellRecord[],
  dates: string[],
  feature: string,
): number {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const date of dates) {
    const sub = cells.filter((c) => c.date === date);
    const mx = sub.reduce((s, c) => s + c.features[feature], 0) / sub.length;
    const my = sub.reduce((s, c) => s + c.y, 0) / sub.length;
    for (const cell of sub) {
      xs.push(cell.features[feature] - mx);
      ys.push(cell.y - my);
    }
  }
  return pearson(xs, ys);
}

// ─── Rapports ─────────────────────────────────────────────────────────────────

function reportConstraintRanking(cells: CellRecord[]): void {
  const byConstraint = new Map<string, { fails: number; attempts: number }>();
  for (const cell of cells) {
    for (const id of [cell.rowId, cell.colId]) {
      const agg = byConstraint.get(id) ?? { fails: 0, attempts: 0 };
      agg.fails += cell.fails;
      agg.attempts += cell.attempts;
      byConstraint.set(id, agg);
    }
  }
  const rows = [...byConstraint.entries()]
    .map(([id, agg]) => ({
      id,
      rate: agg.fails / agg.attempts,
      attempts: agg.attempts,
    }))
    .sort((a, b) => b.rate - a.rate);

  console.log("=== Contraintes par taux d'échec observé (toutes cases) ===");
  for (const row of rows) {
    console.log(
      `  ${row.id.padEnd(34)} ${(row.rate * 100).toFixed(0).padStart(3)} %  (n=${row.attempts})`,
    );
  }
}

function reportFeatureCorrelations(
  cells: CellRecord[],
  dates: string[],
): string {
  const ys = cells.map((c) => c.y);
  const ws = cells.map((c) => c.attempts);

  console.log(
    "\n=== Features vs taux d'échec (LODO-CV ; raw = Pearson pondéré tentatives) ===",
  );
  const results = ["poolSize", ...Object.keys(AGGREGATIONS)].map((feature) => {
    const cv = lodoCv(cells, dates, feature);
    const raw = weightedPearson(
      cells.map((c) => c.features[feature]),
      ys,
      ws,
    );
    return { feature, cv, raw };
  });
  results.sort((a, b) => Math.abs(b.cv.r) - Math.abs(a.cv.r));
  for (const { feature, cv, raw } of results) {
    console.log(
      `  ${feature.padEnd(10)} CVr=${cv.r.toFixed(3)}  CVrho=${cv.rho.toFixed(3)}  raw=${raw.toFixed(3)}`,
    );
  }
  const best = results[0].feature;
  console.log(
    `\n  r centré-par-jour (${BASELINE_AGG}) = ${dayCenteredR(cells, dates, BASELINE_AGG).toFixed(3)} (contrôle cohorte)`,
  );
  return best;
}

function reportBootstrap(
  cells: CellRecord[],
  dates: string[],
  challenger: string,
): void {
  if (challenger === BASELINE_AGG) {
    console.log(
      `\n=== Bootstrap: ${BASELINE_AGG} est déjà le meilleur combo, rien à comparer ===`,
    );
    return;
  }
  const byDate = new Map<string, CellRecord[]>();
  for (const date of dates) {
    byDate.set(
      date,
      cells.filter((c) => c.date === date),
    );
  }
  const rOn = (sample: string[], feature: string): number => {
    const sub = sample.flatMap((d) => byDate.get(d) ?? []);
    return weightedPearson(
      sub.map((c) => c.features[feature]),
      sub.map((c) => c.y),
      sub.map((c) => c.attempts),
    );
  };
  const deltas: number[] = [];
  for (let b = 0; b < BOOTSTRAP_REPLICATES; b++) {
    const sample = Array.from(
      { length: dates.length },
      () => dates[Math.floor(Math.random() * dates.length)],
    );
    const rA = rOn(sample, challenger);
    const rB = rOn(sample, BASELINE_AGG);
    if (Number.isFinite(rA) && Number.isFinite(rB)) {
      deltas.push(Math.abs(rA) - Math.abs(rB));
    }
  }
  deltas.sort((a, b) => a - b);
  const q = (p: number) => deltas[Math.floor(p * deltas.length)];
  const pGt = deltas.filter((d) => d > 0).length / deltas.length;
  console.log(
    `\n=== Bootstrap apparié (${BOOTSTRAP_REPLICATES}×, jours) : |r|(${challenger}) − |r|(${BASELINE_AGG}) ===`,
  );
  console.log(
    `  médiane=${q(0.5).toFixed(3)}  CI90=[${q(0.05).toFixed(3)}, ${q(0.95).toFixed(3)}]  P(Δ>0)=${pGt.toFixed(2)}`,
  );
  console.log(
    "  Lecture : si la CI90 contient 0, le challenger n'est PAS distinguable du baseline.",
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const cells = await fetchCells();
  const dates = [...new Set(cells.map((c) => c.date))].sort();
  const totalAttempts = cells.reduce((s, c) => s + c.attempts, 0);

  console.log(
    `Données : ${dates.length} jours trackés (≥ ${FAILED_ATTEMPTS_SINCE}), ` +
      `${cells.length} cases avec ≥ 1 tentative, ${totalAttempts} tentatives\n`,
  );
  if (dates.length < 5) {
    console.warn(
      "⚠ Moins de 5 jours de données : les corrélations ne sont pas interprétables.\n",
    );
  }

  reportConstraintRanking(cells);
  const best = reportFeatureCorrelations(cells, dates);
  reportBootstrap(cells, dates, best);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
