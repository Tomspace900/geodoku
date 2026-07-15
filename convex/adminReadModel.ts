import { CONSTRAINTS } from "../src/features/game/logic/constraints";
import type { QueryCtx } from "./_generated/server";
import { CELL_KEYS, type CellKey } from "./cellKeys";
import { getActivePoolCandidatesByStatus, getGridAnswers } from "./gridData";
import { computeCellMetric, computePlayersEngaged } from "./lib/cellMetrics";

const CELL_KEY_SET = new Set<string>(CELL_KEYS);
// Les écritures actuelles produisent exactement 9 lignes max. Cette marge
// absorbe une éventuelle pollution legacy sans rendre la lecture non bornée.
const MAX_DAILY_STATS_ROWS_PER_DATE = 64;
// 9 cases × ~200 pays × cohortes live/replay, sous la limite Convex de 4096.
const MAX_GUESS_ROWS_PER_DATE = 4096;

type GuessPick = { countryCode: string; count: number };
type CellInput = {
  validForCell: string[];
  totalGuesses: number;
  failedAttempts: number;
  guessRows: GuessPick[];
};

function isCellKey(value: string): value is CellKey {
  return CELL_KEY_SET.has(value);
}

/**
 * Read model du stock actif. Les candidates `used` sont exclues : leur total
 * historique n'est ni actionnable ni nécessaire à la santé du pool courant.
 */
export async function readPoolStats(ctx: QueryCtx) {
  const available = await getActivePoolCandidatesByStatus(ctx, "available");
  const constraintCounts: Record<string, number> = {};
  CONSTRAINTS.forEach((constraint) => {
    constraintCounts[constraint.id] = 0;
  });
  const countryCounts: Record<string, number> = {};

  available.forEach((candidate) => {
    candidate.metadata.constraintIds.forEach((id) => {
      constraintCounts[id] = (constraintCounts[id] ?? 0) + 1;
    });
    candidate.metadata.countryPool.forEach((code) => {
      countryCounts[code] = (countryCounts[code] ?? 0) + 1;
    });
  });

  return {
    available: available.length,
    constraintCoverage: Object.entries(constraintCounts).map(([id, count]) => ({
      id,
      gridsInPool: count,
    })),
    countryCoverage: Object.entries(countryCounts).map(([code, count]) => ({
      code,
      gridsInPool: count,
    })),
  };
}

/**
 * Compose le read model d'une grille en cinq lectures bornées : grille, puis
 * satellite, feedback et deux ranges date (`dailyStats`, `guesses`).
 */
export async function readGridCellMetrics(ctx: QueryCtx, date: string) {
  const grid = await ctx.db
    .query("grids")
    .withIndex("by_date", (q) => q.eq("date", date))
    .unique();
  if (!grid) return null;

  const [validAnswers, feedback, statsRows, guessRows] = await Promise.all([
    getGridAnswers(ctx, grid),
    ctx.db
      .query("gridFeedback")
      .withIndex("by_date", (q) => q.eq("date", date))
      .unique(),
    ctx.db
      .query("dailyStats")
      .withIndex("by_date_and_cell", (q) => q.eq("date", date))
      .take(MAX_DAILY_STATS_ROWS_PER_DATE),
    ctx.db
      .query("guesses")
      .withIndex("by_date_and_cell", (q) => q.eq("date", date))
      .take(MAX_GUESS_ROWS_PER_DATE),
  ]);

  const statsByCell = new Map(
    statsRows
      .filter((row) => isCellKey(row.cellKey))
      .map((row) => [row.cellKey, row] as const),
  );
  const guessesByCell = new Map<CellKey, GuessPick[]>();
  guessRows.forEach((row) => {
    if (row.isReplay === true || !isCellKey(row.cellKey)) return;
    const picks = guessesByCell.get(row.cellKey) ?? [];
    picks.push({ countryCode: row.countryCode, count: row.count });
    guessesByCell.set(row.cellKey, picks);
  });

  const answers = validAnswers ?? {};
  const cellInputs: Record<CellKey, CellInput> = Object.fromEntries(
    CELL_KEYS.map((cellKey) => {
      const stats = statsByCell.get(cellKey);
      return [
        cellKey,
        {
          validForCell: answers[cellKey] ?? [],
          totalGuesses: stats?.totalGuesses ?? 0,
          failedAttempts: stats?.failedAttempts ?? 0,
          guessRows: guessesByCell.get(cellKey) ?? [],
        },
      ];
    }),
  ) as Record<CellKey, CellInput>;
  const playersEngaged = computePlayersEngaged(
    CELL_KEYS.map((cellKey) => cellInputs[cellKey].totalGuesses),
  );

  const cells = Object.fromEntries(
    CELL_KEYS.map((cellKey) => {
      const input = cellInputs[cellKey];
      return [
        cellKey,
        {
          ...computeCellMetric({
            validForCell: input.validForCell,
            totalGuesses: input.totalGuesses,
            guessRows: input.guessRows,
            playersEngaged,
          }),
          failedAttempts: input.failedAttempts,
          validAnswers: input.validForCell,
          picks: input.guessRows,
        },
      ];
    }),
  );
  const wins = feedback?.wins ?? 0;
  const losses = feedback?.losses ?? 0;

  return {
    date,
    rows: grid.rows,
    cols: grid.cols,
    gamesFinished: wins + losses,
    playersEngaged,
    wins,
    losses,
    cells,
  };
}
