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
 *
 * ─── Principes de lecture (faible trafic) ─────────────────────────────────────
 * Le jeu reçoit peu de joueurs : la plupart des chiffres sont **directionnels**,
 * pas des mesures. Chaque agrégat porte donc son `n`. Deux signaux seulement
 * sont fiables à ce stade :
 *   - `struggle` = échecs / (échecs + succès) sur une case → difficulté
 *     INTRINSÈQUE, dépouillée de l'abandon. Ne vaut que pour les cases tentées
 *     depuis le déploiement de `failedAttempts` (cf. FAILED_ATTEMPTS_SINCE).
 *   - `abandon` = joueurs engagés − parties terminées → où les gens décrochent.
 * `fillRate` reste CONFONDU par l'abandon (une case du bas a un fillRate bas
 * parce que peu de gens l'atteignent, pas parce qu'elle est dure). On le garde
 * comme signal d'abandon, jamais comme mesure de difficulté.
 */
import { writeFileSync } from "node:fs";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import COUNTRIES_JSON from "../src/features/countries/data/countries.json";
import type { Country } from "../src/features/countries/types";
import { CONSTRAINTS } from "../src/features/game/logic/constraints";

// ─── Constantes ───────────────────────────────────────────────────────────────

/**
 * Date de déploiement en prod de `recordFailedGuess` / `dailyStats.failedAttempts`
 * (Phase 0). AVANT cette date : l'absence d'échecs = absence de tracking, PAS
 * « facile ». Les colonnes failed/struggle affichent `—` pour ces jours.
 * Mettre à jour si l'instrumentation est (re)déployée à une autre date.
 */
const FAILED_ATTEMPTS_SINCE = "2026-05-30";

/** En-deçà, la concentration top-1 n'est que du bruit d'échantillon (tout à 100 %). */
const CONCENTRATION_MIN_ENGAGED = 15;

/** Nb minimal de tentatives (succès+échecs) pour qu'un `struggle` par case compte. */
const STRUGGLE_MIN_ATTEMPTS = 3;

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
const COUNTRY_BY_CODE = new Map(COUNTRIES.map((c) => [c.iso3, c]));
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
  wins: number;
  losses: number;
  lostByLives: number;
  lostByBlocked: number;
};

type CellMetric = {
  totalGuesses: number;
  failedAttempts: number;
  distinctCountries: number;
  validAnswersCount: number;
  coverage: number;
  fillRate: number | null;
  observedDifficulty100: number | null;
  topAnswers: Array<{ countryCode: string; count: number; share: number }>;
  missingCountries: string[];
};

type CellMetricsResult = {
  date: string;
  rows: string[];
  cols: string[];
  gamesFinished?: number;
  gamesPlayed?: number;
  playersEngaged?: number;
  wins: number;
  losses: number;
  cells: Record<string, CellMetric>;
};

type GridEngagement = {
  gamesFinished: number;
  playersEngaged: number;
  abandonGap: number;
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
  return `${(value * 100).toFixed(digits)} %`;
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

/** Données `failedAttempts` disponibles pour cette date (post-déploiement) ? */
function hasStruggleData(date: string): boolean {
  return date >= FAILED_ATTEMPTS_SINCE;
}

function gridEngagement(m: CellMetricsResult): GridEngagement {
  const gamesFinished = m.gamesFinished ?? m.gamesPlayed ?? m.wins + m.losses;
  const playersEngaged =
    m.playersEngaged ??
    Math.max(0, ...CELL_KEYS.map((k) => m.cells[k]?.totalGuesses ?? 0));
  return {
    gamesFinished,
    playersEngaged,
    abandonGap: Math.max(0, playersEngaged - gamesFinished),
  };
}

/** Part des tentatives sur la case qui ont échoué. `null` si jamais tentée. */
function struggleRate(cell: CellMetric): number | null {
  const attempts = cell.totalGuesses + cell.failedAttempts;
  if (attempts === 0) return null;
  return cell.failedAttempts / attempts;
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
  const totalFinished = feedback.reduce((s, r) => s + r.gamesPlayed, 0);
  const totalWins = Object.values(cellMetricsByDate).reduce(
    (s, r) => s + r.wins,
    0,
  );
  const totalEngaged = Object.values(cellMetricsByDate).reduce(
    (s, m) => s + gridEngagement(m).playersEngaged,
    0,
  );
  const totalAbandonGap = Object.values(cellMetricsByDate).reduce(
    (s, m) => s + gridEngagement(m).abandonGap,
    0,
  );
  let totalFailed = 0;
  for (const m of Object.values(cellMetricsByDate)) {
    if (!hasStruggleData(m.date)) continue;
    for (const key of CELL_KEYS)
      totalFailed += m.cells[key]?.failedAttempts ?? 0;
  }
  const totalRatings = feedback.reduce((s, r) => s + r.ratingCount, 0);
  const dated = feedback.map((r) => r.date).sort();
  const period = dated.length
    ? `${dated[0]} → ${dated[dated.length - 1]}`
    : "—";
  const instrumentedDays = dated.filter(hasStruggleData).length;

  return [
    "# Geodoku — analytics bundle",
    "",
    `- Fenêtre : ${DAYS_WINDOW} j demandés · ${feedback.length} grilles (${period})`,
    `- Parties terminées (wins+losses) : ${totalFinished}`,
    `- Joueurs engagés (Σ max remplissages/grille) : ${totalEngaged}`,
    `- **Abandon** (engagés − terminés) : ${totalAbandonGap}` +
      `${totalEngaged > 0 ? ` (${pct(totalAbandonGap / totalEngaged, 0)} des engagés)` : ""}`,
    `- Win rate global : ${totalFinished === 0 ? "—" : pct(totalWins / totalFinished, 1)}`,
    `- Échecs de croisement (failedAttempts) : ${totalFailed} sur ${instrumentedDays} j instrumentés (depuis ${FAILED_ATTEMPTS_SINCE})`,
    `- Ratings : ${totalRatings}${totalFinished > 0 ? ` (${pct(totalRatings / totalFinished, 0)} des parties)` : ""}`,
    "",
    "> ⚠️ **Faible trafic — lecture directionnelle.** Peu de joueurs : la plupart des chiffres ont un `n` faible, à lire comme tendance, pas comme mesure. Chaque tableau porte son échantillon.",
    ">",
    `> **Métriques fiables :** \`struggle\` = échecs/(échecs+succès) par case = difficulté INTRINSÈQUE (seulement depuis ${FAILED_ATTEMPTS_SINCE}) ; \`abandon\` = engagés − terminés.`,
    ">",
    "> **Métrique confondue :** `fillRate` (et `observed = 100·(1−fillRate)`) dépend de qui ATTEINT la case → mesure surtout l'abandon, pas la difficulté. À ne jamais lire comme difficulté seule.",
    "",
  ].join("\n");
}

function renderDailySummary(
  feedback: FeedbackRow[],
  cellMetricsByDate: Record<string, CellMetricsResult>,
): string {
  const lines: string[] = [
    "## Tableau journalier",
    "",
    "`abandon` = engagés − terminés. `failedΣ` / `avgStruggle` = `—` avant l'instrumentation (pas « zéro échec » : pas de tracking). `diffObs100` vient des ratings (faible `n`, biaisé).",
    "",
    "| date | finished | engaged | abandon | winRate | failedΣ | avgStruggle | avgFilled | ratings |",
    "|---|---:|---:|---:|---:|---:|---:|---:|---:|",
  ];
  const sorted = [...feedback].sort((a, b) => (a.date < b.date ? 1 : -1));
  for (const f of sorted) {
    const m = cellMetricsByDate[f.date];
    const eng = m ? gridEngagement(m) : null;
    const tracked = hasStruggleData(f.date);
    let failedSum = 0;
    let struggleSum = 0;
    let struggleCount = 0;
    if (m && tracked) {
      for (const key of CELL_KEYS) {
        const cell = m.cells[key];
        if (!cell) continue;
        failedSum += cell.failedAttempts;
        const s = struggleRate(cell);
        if (s !== null) {
          struggleSum += s;
          struggleCount += 1;
        }
      }
    }
    const avgStruggle =
      !tracked || struggleCount === 0 ? null : struggleSum / struggleCount;
    lines.push(
      `| ${f.date} | ${f.gamesPlayed} | ${eng?.playersEngaged ?? "—"} | ${eng?.abandonGap ?? "—"} | ${pct(f.winRate, 0)} | ${tracked ? failedSum : "—"} | ${pct(avgStruggle, 0)} | ${num(f.avgFilledCells, 1)} | ${f.ratingCount} |`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

function renderAbandon(
  feedback: FeedbackRow[],
  cellMetricsByDate: Record<string, CellMetricsResult>,
): string {
  // Heatmap positionnelle : fillRate moyen par case (row,col), tous jours.
  // Le dénominateur (playersEngaged) est commun aux 9 cases d'une grille, donc
  // un gradient haut→bas isole l'abandon (où les joueurs décrochent).
  const sumByPos: number[] = new Array(9).fill(0);
  const nByPos: number[] = new Array(9).fill(0);
  for (const m of Object.values(cellMetricsByDate)) {
    if (gridEngagement(m).playersEngaged === 0) continue;
    CELL_KEYS.forEach((k, i) => {
      const fr = m.cells[k]?.fillRate;
      if (fr === null || fr === undefined) return;
      sumByPos[i] += fr;
      nByPos[i] += 1;
    });
  }
  const posFill = (i: number) =>
    nByPos[i] === 0 ? null : sumByPos[i] / nByPos[i];

  const rowAvg = (r: number) => {
    let s = 0;
    let n = 0;
    for (let c = 0; c < 3; c++) {
      const v = posFill(r * 3 + c);
      if (v !== null) {
        s += v;
        n += 1;
      }
    }
    return n === 0 ? null : s / n;
  };

  const lines: string[] = [
    "## Abandon & engagement",
    "",
    "**Heatmap `fillRate` moyen par position** (tous jours, dénominateur commun aux 9 cases d'une grille). Un gradient haut → bas = abandon : les cases du bas sont *moins atteintes*, pas plus dures. C'est le signal n°1 du « trop dur » — il vit dans les vies / l'ordre de remplissage, pas dans le générateur.",
    "",
    "| | col 0 | col 1 | col 2 | **moy. rangée** |",
    "|---|---:|---:|---:|---:|",
  ];
  for (let r = 0; r < 3; r++) {
    lines.push(
      `| **row ${r}** | ${pct(posFill(r * 3), 0)} | ${pct(posFill(r * 3 + 1), 0)} | ${pct(posFill(r * 3 + 2), 0)} | **${pct(rowAvg(r), 0)}** |`,
    );
  }
  lines.push("");
  lines.push(
    "**Funnel par grille** (`abandon` = engagés − terminés ; `abandonRate` = abandon / engagés).",
  );
  lines.push("");
  lines.push("| date | engaged | finished | won | abandon | abandonRate |");
  lines.push("|---|---:|---:|---:|---:|---:|");
  const sorted = [...feedback].sort((a, b) => (a.date < b.date ? 1 : -1));
  for (const f of sorted) {
    const m = cellMetricsByDate[f.date];
    if (!m) continue;
    const eng = gridEngagement(m);
    const won =
      f.winRate !== null && f.gamesPlayed > 0
        ? Math.round(f.winRate * f.gamesPlayed)
        : 0;
    const rate =
      eng.playersEngaged === 0 ? null : eng.abandonGap / eng.playersEngaged;
    lines.push(
      `| ${f.date} | ${eng.playersEngaged} | ${eng.gamesFinished} | ${won} | ${eng.abandonGap} | ${pct(rate, 0)} |`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

function renderEndReason(feedback: FeedbackRow[]): string {
  // Parmi les parties TERMINÉES (l'abandon, lui, n'émet pas recordGameEnd et
  // vit dans la section précédente). `unknown` = défaites sans endReason
  // (pré-instrumentation / client non à jour) — décroît à mesure que les
  // clients à jour jouent.
  let totFin = 0;
  let totWin = 0;
  let totLives = 0;
  let totBlocked = 0;
  let totUnknown = 0;
  const lines: string[] = [
    "## Fin de partie (`endReason`)",
    "",
    "Comment se terminent les parties **finies** : victoire, **vies épuisées**, ou **blocage** (plus aucune case remplissable — interaction non-réutilisation). C'est le diagnostic direct du « trop dur ». `unknown` = défaite sans cause enregistrée (avant le déploiement `endReason`, ou client non à jour).",
    "",
    "| date | finished | win | vies | bloqué | unknown |",
    "|---|---:|---:|---:|---:|---:|",
  ];
  const sorted = [...feedback].sort((a, b) => (a.date < b.date ? 1 : -1));
  for (const f of sorted) {
    const finished = f.wins + f.losses;
    if (finished === 0) continue;
    const unknown = Math.max(0, f.losses - f.lostByLives - f.lostByBlocked);
    totFin += finished;
    totWin += f.wins;
    totLives += f.lostByLives;
    totBlocked += f.lostByBlocked;
    totUnknown += unknown;
    lines.push(
      `| ${f.date} | ${finished} | ${f.wins} | ${f.lostByLives} | ${f.lostByBlocked} | ${unknown} |`,
    );
  }
  lines.push(
    `| **total** | **${totFin}** | ${totWin} | ${totLives} | ${totBlocked} | ${totUnknown} |`,
  );
  lines.push("");
  const classified = totLives + totBlocked;
  if (classified > 0) {
    lines.push(
      `- Défaites classées : **${classified}** (${totLives} vies / ${totBlocked} blocage). Sur les classées, **${pct(totBlocked / classified, 0)} sont des blocages** — si élevé, c'est la non-réutilisation qui tue les parties, pas seulement les vies.`,
    );
  } else {
    lines.push(
      "- Aucune défaite encore classée (`endReason` fraîchement déployé) — la ventilation se remplit à partir des prochaines parties.",
    );
  }
  lines.push("");
  return lines.join("\n");
}

function renderObservedDifficulty(
  cellMetricsByDate: Record<string, CellMetricsResult>,
): string {
  type Row = {
    date: string;
    rc: string;
    struggle: number;
    struggle100: number;
    attempts: number;
    fillRate: number | null;
  };
  const rows: Row[] = [];

  for (const [date, m] of Object.entries(cellMetricsByDate)) {
    if (!hasStruggleData(date)) continue;
    for (let i = 0; i < CELL_KEYS.length; i++) {
      const cell = m.cells[CELL_KEYS[i]];
      if (!cell) continue;
      const attempts = cell.totalGuesses + cell.failedAttempts;
      if (attempts < STRUGGLE_MIN_ATTEMPTS) continue;
      const s = struggleRate(cell);
      if (s === null) continue;
      const struggle100 = Math.round(s * 100);
      const { row, col } = cellPosition(i);
      rows.push({
        date,
        rc: `${constraintLabel(m.rows[row])} × ${constraintLabel(m.cols[col])}`,
        struggle: s,
        struggle100,
        attempts,
        fillRate: cell.fillRate,
      });
    }
  }

  rows.sort((a, b) => b.struggle100 - a.struggle100);

  const lines: string[] = [
    "## Difficulté observée par case (struggle)",
    "",
    `Cases réellement tentées (≥ ${STRUGGLE_MIN_ATTEMPTS} tentatives) depuis ${FAILED_ATTEMPTS_SINCE}. \`struggle\` = part des tentatives qui échouent = difficulté ressentie une fois la case atteinte. \`fillRate\` en regard pour repérer l'abandon (bas + struggle bas = case esquivée, pas dure).`,
    "",
    "| date | row × col | struggle | attempts | fillRate |",
    "|---|---|---:|---:|---:|",
  ];
  for (const r of rows.slice(0, 40)) {
    lines.push(
      `| ${r.date} | ${r.rc} | ${r.struggle100} | ${r.attempts} | ${pct(r.fillRate, 0)} |`,
    );
  }
  if (rows.length === 0) {
    lines.push(
      `| _aucune case avec ≥ ${STRUGGLE_MIN_ATTEMPTS} tentatives dans la fenêtre instrumentée_ | | | | |`,
    );
  } else {
    const meanStruggle =
      rows.reduce((s, r) => s + r.struggle100, 0) / rows.length;
    const hard = rows.filter((r) => r.struggle100 >= 50).length;
    lines.push("");
    lines.push(
      `- Cases avec assez de tentatives : **${rows.length}** _(échantillon faible — directionnel)_`,
    );
    lines.push(`- Struggle moyen : **${meanStruggle.toFixed(1)}** %`);
    lines.push(`- Cases struggle ≥ 50 % : ${hard}`);
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
    sumFillRate: number;
    fillSamples: number;
    sumStruggle: number;
    struggleCells: number;
    sumTooHardShare: number;
    tooHardGrids: number;
  };
  const byConstraint = new Map<string, Agg>();
  const feedbackByDate = new Map(feedback.map((f) => [f.date, f]));

  function ensure(id: string): Agg {
    let a = byConstraint.get(id);
    if (!a) {
      a = {
        appearances: 0,
        sumFillRate: 0,
        fillSamples: 0,
        sumStruggle: 0,
        struggleCells: 0,
        sumTooHardShare: 0,
        tooHardGrids: 0,
      };
      byConstraint.set(id, a);
    }
    return a;
  }

  for (const m of Object.values(cellMetricsByDate)) {
    const tracked = hasStruggleData(m.date);
    for (let i = 0; i < CELL_KEYS.length; i++) {
      const cell = m.cells[CELL_KEYS[i]];
      if (!cell) continue;
      const { row, col } = cellPosition(i);
      for (const id of [m.rows[row], m.cols[col]]) {
        const a = ensure(id);
        if (cell.fillRate !== null) {
          a.sumFillRate += cell.fillRate;
          a.fillSamples += 1;
        }
        if (tracked) {
          const s = struggleRate(cell);
          if (
            s !== null &&
            cell.totalGuesses + cell.failedAttempts >= STRUGGLE_MIN_ATTEMPTS
          ) {
            a.sumStruggle += s;
            a.struggleCells += 1;
          }
        }
      }
    }
  }

  for (const m of Object.values(cellMetricsByDate)) {
    const ids = new Set([...m.rows, ...m.cols]);
    for (const id of ids) ensure(id).appearances += 1;
    const fb = feedbackByDate.get(m.date);
    if (fb && fb.ratingCount > 0) {
      const share = fb.tooHardCount / fb.ratingCount;
      for (const id of ids) {
        const a = ensure(id);
        a.sumTooHardShare += share;
        a.tooHardGrids += 1;
      }
    }
  }

  const rows = [...byConstraint.entries()]
    .map(([id, a]) => ({
      id,
      label: constraintLabel(id),
      category: constraintCategory(id),
      appearances: a.appearances,
      avgFillRate: a.fillSamples === 0 ? null : a.sumFillRate / a.fillSamples,
      avgStruggle:
        a.struggleCells === 0 ? null : a.sumStruggle / a.struggleCells,
      nStruggle: a.struggleCells,
      avgTooHard:
        a.tooHardGrids === 0 ? null : a.sumTooHardShare / a.tooHardGrids,
    }))
    // contraintes avec données struggle d'abord (tri desc), le reste après
    .sort((a, b) => {
      if (a.avgStruggle === null && b.avgStruggle === null) {
        return (a.avgFillRate ?? 1) - (b.avgFillRate ?? 1);
      }
      if (a.avgStruggle === null) return 1;
      if (b.avgStruggle === null) return -1;
      return b.avgStruggle - a.avgStruggle;
    });

  const lines: string[] = [
    "## Rollup par contrainte",
    "",
    "Une apparition = une grille où la contrainte sort en ligne/colonne. `avgStruggle` = difficulté intrinsèque moyenne des cases tentées portant cette contrainte (`nStr` = nb de telles cases, `—` si aucune donnée instrumentée). `avgFillRate` = signal d'abandon (confondu). `tooHard%` vient des ratings. Tri : struggle décroissant, puis fillRate.",
    "",
    "| contrainte | catégorie | appar. | avgStruggle | nStr | avgFillRate | tooHard% |",
    "|---|---|---:|---:|---:|---:|---:|",
  ];
  for (const r of rows) {
    lines.push(
      `| ${r.label} | ${r.category} | ${r.appearances} | ${pct(r.avgStruggle, 0)} | ${r.nStruggle || "—"} | ${pct(r.avgFillRate, 0)} | ${pct(r.avgTooHard, 0)} |`,
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
    if (gridEngagement(m).playersEngaged === 0) continue;
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
    "Pays valides dans ≥ 2 cases de la fenêtre mais jamais dans le top des choix. `popIdx` ≥ 0.4 = pays connu pourtant ignoré (friction discoverabilité ou croisement non-évident). Signal stable (indépendant du dénominateur).",
    "",
    "| code | name (en) | missing | pool | popIdx |",
    "|---|---|---:|---:|---:|",
  ];
  for (const r of rows.slice(0, 25)) {
    lines.push(
      `| ${r.code} | ${r.name} | ${r.missingAppearances} | ${r.poolAppearances} | ${r.popularityIndex === null ? "—" : r.popularityIndex.toFixed(2)} |`,
    );
  }
  if (rows.length === 0) lines.push("| _aucun_ | | | | |");
  lines.push("");
  return lines.join("\n");
}

function renderConcentration(
  cellMetricsByDate: Record<string, CellMetricsResult>,
): string {
  type ConcRow = {
    date: string;
    rc: string;
    engaged: number;
    top1Country: string;
    top1Share: number;
    top3Share: number;
  };
  const rows: ConcRow[] = [];
  for (const [date, m] of Object.entries(cellMetricsByDate)) {
    const { playersEngaged } = gridEngagement(m);
    if (playersEngaged < CONCENTRATION_MIN_ENGAGED) continue;
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
        engaged: playersEngaged,
        top1Country: top1.countryCode,
        top1Share: top1.share,
        top3Share,
      });
    }
  }
  rows.sort((a, b) => b.top1Share - a.top1Share);

  const lines: string[] = [
    "## Concentration des réponses (top-1 share)",
    "",
    `Cases « à réponse évidente » : un pays capte > 50 % des choix. **Gaté à ≥ ${CONCENTRATION_MIN_ENGAGED} joueurs engagés** — en deçà, tout est à 100 % (bruit d'échantillon). S'activera quand le trafic montera.`,
    "",
    "| date | row × col | engaged | top-1 | top1Share | top3Share |",
    "|---|---|---:|---|---:|---:|",
  ];
  for (const r of rows.slice(0, 25)) {
    lines.push(
      `| ${r.date} | ${r.rc} | ${r.engaged} | ${r.top1Country} | ${pct(r.top1Share, 0)} | ${pct(r.top3Share, 0)} |`,
    );
  }
  if (rows.length === 0) {
    lines.push(
      `| _aucune grille à ≥ ${CONCENTRATION_MIN_ENGAGED} engagés (trafic insuffisant)_ | | | | | |`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

function renderRatingCoherence(feedback: FeedbackRow[]): string {
  const lines: string[] = [
    "## Cohérence sentiment ↔ performance _(faible confiance)_",
    "",
    "> ⚠️ 1-4 raters par grille : anecdotique, pas une tendance. À ignorer tant que le volume de ratings n'a pas franchi ~10/grille.",
    "",
    "`diffFromWinRate` = 100·(1 − winRate). `diffFromRatings` = balanced·50 + tooHard·100 / ratings. Δ > 20 = inconfort potentiel (réussissent mais notent pénible, ou l'inverse).",
    "",
    "| date | games | ratings | winRate | diffWinRate | diffRatings | Δ |",
    "|---|---:|---:|---:|---:|---:|---:|",
  ];
  type Row = { delta: number; line: string };
  const rows: Row[] = [];
  for (const f of feedback) {
    if (f.gamesPlayed === 0 || f.winRate === null) continue;
    const diffWin = Math.round((1 - f.winRate) * 100);
    const diffRat = f.difficultyObserved100;
    const delta = diffRat === null ? null : diffRat - diffWin;
    rows.push({
      delta: delta === null ? 0 : Math.abs(delta),
      line: `| ${f.date} | ${f.gamesPlayed} | ${f.ratingCount} | ${pct(f.winRate, 0)} | ${diffWin} | ${diffRat ?? "—"} | ${delta === null ? "—" : (delta >= 0 ? "+" : "") + delta} |`,
    });
  }
  rows.sort((a, b) => b.delta - a.delta);
  for (const r of rows.slice(0, 12)) lines.push(r.line);
  lines.push("");
  return lines.join("\n");
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const { feedback, cellMetricsByDate } = await fetchAll();

  const sections = [
    renderHeader(feedback, cellMetricsByDate),
    renderDailySummary(feedback, cellMetricsByDate),
    renderAbandon(feedback, cellMetricsByDate),
    renderEndReason(feedback),
    renderObservedDifficulty(cellMetricsByDate),
    renderConstraintRollup(cellMetricsByDate, feedback),
    renderDeadCountries(cellMetricsByDate),
    renderConcentration(cellMetricsByDate),
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
