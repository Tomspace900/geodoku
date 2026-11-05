import { CONSTRAINTS } from "../src/features/game/logic/constraints";
import type { QueryCtx } from "./_generated/server";
import { CELL_KEYS, type CellKey } from "./cellKeys";
import { readCellCounts } from "./cellStats";
import { readGamesForDate } from "./games";
import { getActivePoolCandidatesByStatus, getGridAnswers } from "./gridData";
import { computeCellMetric, computePlayersEngaged } from "./lib/cellMetrics";
import { todayUTC } from "./lib/dates";
import { summarizeGames } from "./lib/gameStats";

type GuessPick = { countryCode: string; count: number };
type CellInput = {
  validForCell: string[];
  totalGuesses: number;
  failedAttempts: number;
  guessRows: GuessPick[];
};

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
 * Read model d'une journée : grille, réponses, répartition (`cellStats`) et
 * lignes de partie. Avant la bascule de #70, une journée n'a que sa
 * répartition, importée : ni victoires ni erreurs par case.
 */
export async function readGridCellMetrics(ctx: QueryCtx, date: string) {
  const grid = await ctx.db
    .query("grids")
    .withIndex("by_date", (q) => q.eq("date", date))
    .unique();
  if (!grid) return null;

  const [validAnswers, counts, games] = await Promise.all([
    getGridAnswers(ctx, grid),
    readCellCounts(ctx, date),
    readGamesForDate(ctx, date),
  ]);
  const answers = validAnswers ?? {};
  const stats = summarizeGames(games, answers);

  const cellInputs = Object.fromEntries(
    CELL_KEYS.map((cellKey, index) => {
      const guessRows: GuessPick[] = Object.entries(counts[cellKey] ?? {})
        .map(([countryCode, count]) => ({ countryCode, count }))
        .sort((a, b) => b.count - a.count);
      return [
        cellKey,
        {
          validForCell: answers[cellKey] ?? [],
          totalGuesses: guessRows.reduce((sum, row) => sum + row.count, 0),
          failedAttempts: stats.failedByCell[index],
          guessRows,
        },
      ];
    }),
  ) as Record<CellKey, CellInput>;
  // Les parties créées font foi ; le max des cases ne sert qu'aux journées
  // d'avant la bascule, qui n'ont pas de lignes de partie.
  const playersEngaged = Math.max(
    stats.games,
    computePlayersEngaged(
      CELL_KEYS.map((cellKey) => cellInputs[cellKey].totalGuesses),
    ),
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

  return {
    date,
    rows: grid.rows,
    cols: grid.cols,
    gamesFinished: stats.wins + stats.losses,
    playersEngaged,
    wins: stats.wins,
    losses: stats.losses,
    cells,
  };
}

/** Plafond de documents lus par la tendance admin, toutes journées confondues. */
const MAX_TREND_GAMES = 12_000;

/**
 * Agrégats des journées récentes, de la plus récente à la plus ancienne. Seules
 * les journées qui ont des lignes de partie apparaissent : celles d'avant la
 * bascule n'ont plus ces indicateurs (export hors repo, #70).
 */
export async function readDailyGameStats(ctx: QueryCtx, days: number) {
  const grids = await ctx.db
    .query("grids")
    .withIndex("by_date", (q) => q.lte("date", todayUTC()))
    .order("desc")
    .take(days);

  const rows = [];
  let budget = MAX_TREND_GAMES;
  for (const grid of grids) {
    if (budget <= 0) break;
    const games = await ctx.db
      .query("games")
      .withIndex("by_date", (q) => q.eq("date", grid.date))
      .take(budget);
    budget -= games.length;
    if (games.length === 0) continue;
    const validAnswers = (await getGridAnswers(ctx, grid)) ?? {};
    rows.push({ date: grid.date, ...summarizeGames(games, validAnswers) });
  }
  return rows;
}
