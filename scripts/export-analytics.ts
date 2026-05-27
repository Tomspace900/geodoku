/**
 * Bundle d'analytics au format Markdown, pensé pour être collé tel quel dans
 * un prompt IA (Claude, GPT…). Lit Convex via `ConvexHttpClient` avec
 * `VITE_CONVEX_URL` + `ADMIN_TOKEN`, agrège les `N` derniers jours et écrit
 * un fichier `analytics-<YYYY-MM-DD>.md`.
 *
 * Usage:
 *   ADMIN_TOKEN=… pnpm tsx scripts/export-analytics.ts          # 30 derniers jours
 *   ADMIN_TOKEN=… pnpm tsx scripts/export-analytics.ts --days=14
 *   ADMIN_TOKEN=… pnpm tsx scripts/export-analytics.ts --days=30 --out=foo.md
 *
 * `VITE_CONVEX_URL` est lu depuis `.env.local` via `tsx --env-file=.env.local`
 * si fourni, ou directement depuis l'env Node.
 */
import { writeFileSync } from "node:fs";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import COUNTRIES_JSON from "../src/features/countries/data/countries.json";
import type { Country } from "../src/features/countries/types";
import { CONSTRAINTS } from "../src/features/game/logic/constraints";

// ─── Args / env ───────────────────────────────────────────────────────────────

function parseArgs(argv: string[]): { days: number; out: string | null } {
  let days = 30;
  let out: string | null = null;
  for (const arg of argv) {
    const daysMatch = arg.match(/^--days=(\d+)$/);
    if (daysMatch) days = Number.parseInt(daysMatch[1], 10);
    const outMatch = arg.match(/^--out=(.+)$/);
    if (outMatch) out = outMatch[1];
  }
  return { days, out };
}

const { days: DAYS_WINDOW, out: OUT_ARG } = parseArgs(process.argv.slice(2));

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
const COUNTRIES = COUNTRIES_JSON as unknown as Country[];
const COUNTRY_BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));
const CONSTRAINT_BY_ID = new Map(CONSTRAINTS.map((c) => [c.id, c]));

// ─── Types issus des queries Convex ───────────────────────────────────────────

type FeedbackRow = {
  date: string;
  ratingCount: number;
  gamesPlayed: number;
  difficultyObserved100: number | null;
  winRate: number | null;
  avgLivesLeft: number | null;
  avgFilledCells: number | null;
  avgGuessesSubmitted: number | null;
  tooEasyCount: number;
  balancedCount: number;
  tooHardCount: number;
};

type CellMetric = {
  totalGuesses: number;
  distinctCountries: number;
  validAnswersCount: number;
  coverage: number;
  fillRate: number | null;
  observedDifficulty100: number | null;
  estimatedDifficulty: number | null;
  topAnswers: Array<{ countryCode: string; count: number; share: number }>;
  missingCountries: string[];
};

type CellMetricsResult = {
  date: string;
  rows: string[];
  cols: string[];
  gamesPlayed: number;
  wins: number;
  losses: number;
  cells: Record<string, CellMetric>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CELL_KEYS = [
  "0,0",
  "0,1",
  "0,2",
  "1,0",
  "1,1",
  "1,2",
  "2,0",
  "2,1",
  "2,2",
] as const;

function pct(value: number | null, digits = 0): string {
  if (value === null) return "—";
  return `${(value * 100).toFixed(digits)} %`;
}

function num(value: number | null, digits = 2): string {
  if (value === null) return "—";
  return value.toFixed(digits);
}

function constraintLabel(id: string): string {
  const c = CONSTRAINT_BY_ID.get(id as never);
  return c ? c.labelKey.replace(/^constraint\./, "") : id;
}

function constraintCategory(id: string): string {
  return CONSTRAINT_BY_ID.get(id as never)?.category ?? "unknown";
}

function cellPosition(i: number): { row: number; col: number } {
  return { row: Math.floor(i / 3), col: i % 3 };
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchAll() {
  console.error(`Fetching last ${DAYS_WINDOW} days of feedback…`);
  const feedback = (await client.query(api.grids.getGridFeedbackStats, {
    adminToken: ADMIN_TOKEN!,
    limit: DAYS_WINDOW,
  })) as FeedbackRow[];

  console.error(`Fetching per-cell metrics for ${feedback.length} grids…`);
  const cellMetricsByDate: Record<string, CellMetricsResult> = {};
  for (const row of feedback) {
    const result = (await client.query(api.grids.getGridCellMetrics, {
      date: row.date,
      adminToken: ADMIN_TOKEN!,
    })) as CellMetricsResult | null;
    if (result) cellMetricsByDate[row.date] = result;
  }
  return { feedback, cellMetricsByDate };
}

// ─── Sections ─────────────────────────────────────────────────────────────────

function renderHeader(
  feedback: FeedbackRow[],
  cellMetricsByDate: Record<string, CellMetricsResult>,
): string {
  const totalGames = feedback.reduce((s, r) => s + r.gamesPlayed, 0);
  const totalWins = Object.values(cellMetricsByDate).reduce(
    (s, r) => s + r.wins,
    0,
  );
  const totalRatings = feedback.reduce((s, r) => s + r.ratingCount, 0);
  const datedRows = feedback.map((r) => r.date).sort();
  const period = datedRows.length
    ? `${datedRows[0]} → ${datedRows[datedRows.length - 1]}`
    : "—";

  return [
    "# Geodoku — analytics bundle",
    "",
    `- Fenêtre demandée : ${DAYS_WINDOW} jours`,
    `- Grilles couvertes : ${feedback.length} (période ${period})`,
    `- Parties terminées : ${totalGames}`,
    `- Win rate global : ${totalGames === 0 ? "—" : pct(totalWins / totalGames, 1)}`,
    `- Ratings reçus : ${totalRatings}${totalGames > 0 ? ` (${pct(totalRatings / totalGames, 1)} des parties)` : ""}`,
    "",
    "> Convention de lecture : `observedDifficulty100` = 100·(1 − fillRate). Plus c'est haut, plus la case résiste aux joueurs. `estimatedDifficulty` est la note 0–100 du générateur. Les pays sont en ISO 3166-1 alpha-3.",
    "",
  ].join("\n");
}

function renderCalibration(
  cellMetricsByDate: Record<string, CellMetricsResult>,
): string {
  const lines: string[] = [
    "## Calibration estimé ↔ observé (par case)",
    "",
    "Pour chaque case d'une grille terminée par au moins 1 joueur : `delta = observed − estimated`. Positif = générateur trop optimiste (sous-estime la difficulté). Négatif = générateur trop pessimiste.",
    "",
    "| date | row × col | estimated | observed | Δ | gamesPlayed |",
    "|---|---|---:|---:|---:|---:|",
  ];
  const rows: Array<{
    date: string;
    rc: string;
    est: number;
    obs: number;
    delta: number;
    games: number;
  }> = [];

  for (const [date, m] of Object.entries(cellMetricsByDate)) {
    for (let i = 0; i < CELL_KEYS.length; i++) {
      const cell = m.cells[CELL_KEYS[i]];
      if (!cell || cell.observedDifficulty100 === null) continue;
      if (cell.estimatedDifficulty === null) continue;
      const { row, col } = cellPosition(i);
      rows.push({
        date,
        rc: `${constraintLabel(m.rows[row])} × ${constraintLabel(m.cols[col])}`,
        est: cell.estimatedDifficulty,
        obs: cell.observedDifficulty100,
        delta: cell.observedDifficulty100 - cell.estimatedDifficulty,
        games: m.gamesPlayed,
      });
    }
  }

  rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  for (const r of rows.slice(0, 40)) {
    lines.push(
      `| ${r.date} | ${r.rc} | ${r.est} | ${r.obs} | ${r.delta >= 0 ? "+" : ""}${r.delta} | ${r.games} |`,
    );
  }
  if (rows.length > 40) {
    lines.push(
      `| … | ${rows.length - 40} cases supplémentaires omises | | | | |`,
    );
  }

  // Aggregate stats
  if (rows.length > 0) {
    const meanAbs =
      rows.reduce((s, r) => s + Math.abs(r.delta), 0) / rows.length;
    const meanSigned = rows.reduce((s, r) => s + r.delta, 0) / rows.length;
    const overestimated = rows.filter((r) => r.delta > 10).length;
    const underestimated = rows.filter((r) => r.delta < -10).length;
    lines.push("");
    lines.push(
      `- Erreur absolue moyenne : **${meanAbs.toFixed(1)}** points sur 100`,
    );
    lines.push(
      `- Biais signé moyen : ${meanSigned >= 0 ? "+" : ""}${meanSigned.toFixed(1)} (positif = sous-estimation systématique)`,
    );
    lines.push(
      `- Cases sous-estimées (Δ > +10) : ${overestimated} / ${rows.length}`,
    );
    lines.push(
      `- Cases sur-estimées (Δ < −10) : ${underestimated} / ${rows.length}`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

function renderConstraintRollup(
  cellMetricsByDate: Record<string, CellMetricsResult>,
  feedback: FeedbackRow[],
): string {
  type Agg = {
    appearances: number;
    cellsAggregated: number;
    sumObservedDifficulty: number;
    sumFillRate: number;
    sumTooHardShare: number; // poids par grille, pas par case
    gridDates: Set<string>;
  };
  const byConstraint = new Map<string, Agg>();
  const feedbackByDate = new Map(feedback.map((f) => [f.date, f]));

  function bump(constraintId: string, m: CellMetricsResult, cell: CellMetric) {
    let agg = byConstraint.get(constraintId);
    if (!agg) {
      agg = {
        appearances: 0,
        cellsAggregated: 0,
        sumObservedDifficulty: 0,
        sumFillRate: 0,
        sumTooHardShare: 0,
        gridDates: new Set(),
      };
      byConstraint.set(constraintId, agg);
    }
    agg.gridDates.add(m.date);
    agg.cellsAggregated += 1;
    if (cell.observedDifficulty100 !== null) {
      agg.sumObservedDifficulty += cell.observedDifficulty100;
    }
    if (cell.fillRate !== null) {
      agg.sumFillRate += cell.fillRate;
    }
  }

  for (const m of Object.values(cellMetricsByDate)) {
    for (let i = 0; i < CELL_KEYS.length; i++) {
      const cell = m.cells[CELL_KEYS[i]];
      if (!cell) continue;
      const { row, col } = cellPosition(i);
      bump(m.rows[row], m, cell);
      bump(m.cols[col], m, cell);
    }
  }

  // Apparences par contrainte (denominator pour les avgs)
  for (const m of Object.values(cellMetricsByDate)) {
    const ids = new Set([...m.rows, ...m.cols]);
    for (const id of ids) {
      const agg = byConstraint.get(id);
      if (agg) agg.appearances += 1;
    }
  }

  // Sentiment too_hard par grille — distribué uniformément sur les 6 contraintes
  for (const m of Object.values(cellMetricsByDate)) {
    const fb = feedbackByDate.get(m.date);
    if (!fb || fb.ratingCount === 0) continue;
    const tooHardShare = fb.tooHardCount / fb.ratingCount;
    const ids = new Set([...m.rows, ...m.cols]);
    for (const id of ids) {
      const agg = byConstraint.get(id);
      if (agg) agg.sumTooHardShare += tooHardShare;
    }
  }

  const rows = Array.from(byConstraint.entries())
    .map(([id, agg]) => ({
      id,
      label: constraintLabel(id),
      category: constraintCategory(id),
      appearances: agg.appearances,
      cells: agg.cellsAggregated,
      avgObservedDifficulty:
        agg.cellsAggregated === 0
          ? null
          : agg.sumObservedDifficulty / agg.cellsAggregated,
      avgFillRate:
        agg.cellsAggregated === 0
          ? null
          : agg.sumFillRate / agg.cellsAggregated,
      avgTooHardShare:
        agg.appearances === 0 ? null : agg.sumTooHardShare / agg.appearances,
    }))
    .sort(
      (a, b) => (b.avgObservedDifficulty ?? 0) - (a.avgObservedDifficulty ?? 0),
    );

  const lines: string[] = [
    "## Rollup par contrainte (toute la fenêtre)",
    "",
    "Une apparence = une grille où la contrainte sort en ligne ou colonne. Les `cells` agrégées sont 3 par apparition (les 3 cases de la ligne ou colonne). `avgTooHardShare` = moyenne pondérée des `too_hard / ratingCount` des grilles où la contrainte apparaît.",
    "",
    "| contrainte | catégorie | apparitions | avgObsDiff | avgFillRate | avgTooHard |",
    "|---|---|---:|---:|---:|---:|",
  ];
  for (const r of rows) {
    lines.push(
      `| ${r.label} | ${r.category} | ${r.appearances} | ${num(r.avgObservedDifficulty, 1)} | ${pct(r.avgFillRate, 1)} | ${pct(r.avgTooHardShare, 1)} |`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

function renderDeadCountries(
  cellMetricsByDate: Record<string, CellMetricsResult>,
): string {
  type Stat = {
    code: string;
    missingAppearances: number;
    chosenAppearances: number;
    poolAppearances: number;
  };
  const byCountry = new Map<string, Stat>();

  function ensure(code: string): Stat {
    let stat = byCountry.get(code);
    if (!stat) {
      stat = {
        code,
        missingAppearances: 0,
        chosenAppearances: 0,
        poolAppearances: 0,
      };
      byCountry.set(code, stat);
    }
    return stat;
  }

  for (const m of Object.values(cellMetricsByDate)) {
    if (m.gamesPlayed === 0) continue;
    for (let i = 0; i < CELL_KEYS.length; i++) {
      const cell = m.cells[CELL_KEYS[i]];
      if (!cell) continue;
      for (const code of cell.missingCountries) {
        ensure(code).missingAppearances += 1;
        ensure(code).poolAppearances += 1;
      }
      for (const ans of cell.topAnswers) {
        ensure(ans.countryCode).chosenAppearances += 1;
        ensure(ans.countryCode).poolAppearances += 1;
      }
    }
  }

  const rows = Array.from(byCountry.values())
    .filter((s) => s.poolAppearances >= 2 && s.chosenAppearances === 0)
    .map((s) => {
      const country = COUNTRY_BY_CODE.get(s.code);
      return {
        ...s,
        name: country?.names.en ?? s.code,
        popularityIndex: country?.popularityIndex ?? null,
      };
    })
    .sort((a, b) => b.missingAppearances - a.missingAppearances);

  const lines: string[] = [
    '## Pays "fantômes" — jamais choisis malgré être valides',
    "",
    `Pays absents du top-5 de chaque case **alors qu'ils étaient une réponse valide**, et qui apparaissent dans le pool de ≥ 2 cases dans la fenêtre. La colonne \`popIdx\` est le \`popularityIndex\` (0..1, percentile de pageviews Wikipédia) — si ≥ 0.4 on est face à un pays connu pourtant ignoré.`,
    "",
    "| code | name (en) | missing | poolAppearances | popIdx |",
    "|---|---|---:|---:|---:|",
  ];
  for (const r of rows.slice(0, 30)) {
    lines.push(
      `| ${r.code} | ${r.name} | ${r.missingAppearances} | ${r.poolAppearances} | ${r.popularityIndex === null ? "—" : r.popularityIndex.toFixed(2)} |`,
    );
  }
  if (rows.length === 0) lines.push("| _aucun pays jamais choisi_ | | | | |");
  lines.push("");
  return lines.join("\n");
}

function renderConcentration(
  cellMetricsByDate: Record<string, CellMetricsResult>,
): string {
  const lines: string[] = [
    "## Concentration des réponses (top-1 share, par case)",
    "",
    "`top1Share` = part du pays le plus choisi parmi toutes les tentatives sur la case. `top3Share` = somme des 3 premiers. Concentration > 0.5 → la case a une réponse évidente qui écrase tout (signal d'un problème de calibrage si répété).",
    "",
    "| date | row × col | gamesPlayed | top-1 country | top1Share | top3Share |",
    "|---|---|---:|---|---:|---:|",
  ];
  type ConcRow = {
    date: string;
    rc: string;
    games: number;
    top1Country: string;
    top1Share: number;
    top3Share: number;
  };
  const rows: ConcRow[] = [];
  for (const [date, m] of Object.entries(cellMetricsByDate)) {
    if (m.gamesPlayed === 0) continue;
    for (let i = 0; i < CELL_KEYS.length; i++) {
      const cell = m.cells[CELL_KEYS[i]];
      if (!cell || cell.topAnswers.length === 0) continue;
      const top1 = cell.topAnswers[0];
      const top3Share = cell.topAnswers
        .slice(0, 3)
        .reduce((s, a) => s + a.share, 0);
      const { row, col } = cellPosition(i);
      rows.push({
        date,
        rc: `${constraintLabel(m.rows[row])} × ${constraintLabel(m.cols[col])}`,
        games: m.gamesPlayed,
        top1Country: top1.countryCode,
        top1Share: top1.share,
        top3Share,
      });
    }
  }
  rows.sort((a, b) => b.top1Share - a.top1Share);
  for (const r of rows.slice(0, 30)) {
    lines.push(
      `| ${r.date} | ${r.rc} | ${r.games} | ${r.top1Country} | ${pct(r.top1Share, 1)} | ${pct(r.top3Share, 1)} |`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

function renderSoftBlockSignal(
  cellMetricsByDate: Record<string, CellMetricsResult>,
  feedback: FeedbackRow[],
): string {
  // Soft-block proxy : losses avec lives restantes (avgLivesLeft > 0 sur les losses).
  // On ne peut pas exactement séparer wins/losses dans avgLivesLeft, donc on
  // utilise une approche par grille : si avgFilledCells < 9 et avgLivesLeft > 0
  // c'est un signe que des parties se sont terminées par blocage.
  const lines: string[] = [
    "## Signal de blocage (`soft-block`)",
    "",
    "Les parties peuvent se terminer par épuisement des vies **ou** par blocage (toutes les cases restantes sont impossibles). Cet agrégat est un proxy : pour chaque grille on calcule `avgLivesLeftAcrossAllGames > 0` ET `avgFilledCells < 9`, ce qui ne peut s'expliquer que par des fins de partie par blocage.",
    "",
    "| date | gamesPlayed | winRate | avgFilledCells | avgLivesLeft | indice soft-block |",
    "|---|---:|---:|---:|---:|---:|",
  ];
  for (const f of feedback) {
    if (f.gamesPlayed === 0) continue;
    const cellMetrics = cellMetricsByDate[f.date];
    if (!cellMetrics) continue;
    const livesLeftAvg = f.avgLivesLeft ?? 0;
    const filledAvg = f.avgFilledCells ?? 0;
    // Indice = manque de cellules remplies pondéré par vies restantes (proxy
    // grossier : > 0.5 fortement suggestif, > 1 quasi-certain).
    const blockingScore = livesLeftAvg * (9 - filledAvg);
    lines.push(
      `| ${f.date} | ${f.gamesPlayed} | ${pct(f.winRate, 1)} | ${num(f.avgFilledCells, 2)} | ${num(f.avgLivesLeft, 2)} | ${num(blockingScore, 2)} |`,
    );
  }
  lines.push("");
  lines.push(
    "> Note : ce proxy mélange les wins (vies > 0 + 9 cases remplies) et les losses bloquées. Pour mesurer le vrai `soft-block` il faudrait stocker un champ `endReason: 'lives' | 'blocked' | 'win'` dans `gridFeedback`. À considérer pour une prochaine itération.",
  );
  lines.push("");
  return lines.join("\n");
}

function renderRatingCoherence(feedback: FeedbackRow[]): string {
  const lines: string[] = [
    "## Cohérence sentiment ↔ performance",
    "",
    "`difficultyFromWinRate100` = 100·(1 − winRate), une approximation de difficulté ressentie via la performance objective. `difficultyObserved100` = score 0–100 calculé depuis les ratings (`balanced·50 + tooHard·100` / ratings). Un Δ > 20 = signal d'inconfort UX (les joueurs réussissent mais trouvent ça pénible, ou inversement).",
    "",
    "| date | games | ratings | winRate | diffFromWinRate | diffFromRatings | Δ |",
    "|---|---:|---:|---:|---:|---:|---:|",
  ];
  type Row = { date: string; delta: number; line: string };
  const rows: Row[] = [];
  for (const f of feedback) {
    if (f.gamesPlayed === 0 || f.winRate === null) continue;
    const diffFromWinRate = Math.round((1 - f.winRate) * 100);
    const diffFromRatings = f.difficultyObserved100;
    const delta =
      diffFromRatings === null ? null : diffFromRatings - diffFromWinRate;
    rows.push({
      date: f.date,
      delta: delta === null ? 0 : Math.abs(delta),
      line: `| ${f.date} | ${f.gamesPlayed} | ${f.ratingCount} | ${pct(f.winRate, 1)} | ${diffFromWinRate} | ${diffFromRatings ?? "—"} | ${delta === null ? "—" : (delta >= 0 ? "+" : "") + delta} |`,
    });
  }
  rows.sort((a, b) => b.delta - a.delta);
  for (const r of rows) lines.push(r.line);
  lines.push("");
  return lines.join("\n");
}

function renderDailySummary(feedback: FeedbackRow[]): string {
  const lines: string[] = [
    "## Tableau journalier (vue d'ensemble)",
    "",
    "| date | games | wins | winRate | avgFilled | avgGuesses | ratings | diffObs100 |",
    "|---|---:|---:|---:|---:|---:|---:|---:|",
  ];
  const sorted = [...feedback].sort((a, b) => (a.date < b.date ? 1 : -1));
  for (const f of sorted) {
    const wins =
      f.winRate !== null && f.gamesPlayed > 0
        ? Math.round(f.winRate * f.gamesPlayed)
        : 0;
    lines.push(
      `| ${f.date} | ${f.gamesPlayed} | ${wins} | ${pct(f.winRate, 1)} | ${num(f.avgFilledCells, 2)} | ${num(f.avgGuessesSubmitted, 2)} | ${f.ratingCount} | ${f.difficultyObserved100 ?? "—"} |`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const { feedback, cellMetricsByDate } = await fetchAll();

  const sections = [
    renderHeader(feedback, cellMetricsByDate),
    renderDailySummary(feedback),
    renderCalibration(cellMetricsByDate),
    renderConstraintRollup(cellMetricsByDate, feedback),
    renderDeadCountries(cellMetricsByDate),
    renderConcentration(cellMetricsByDate),
    renderSoftBlockSignal(cellMetricsByDate, feedback),
    renderRatingCoherence(feedback),
  ];
  const md = sections.join("\n");

  const today = new Date().toISOString().slice(0, 10);
  const outPath = OUT_ARG ?? `analytics-${today}.md`;
  writeFileSync(outPath, md, "utf8");
  console.error(`Wrote ${outPath} (${(md.length / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
