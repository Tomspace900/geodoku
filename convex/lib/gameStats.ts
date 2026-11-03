import {
  type GameRecord,
  recordCells,
  recordFailedTotal,
  recordLivesRemaining,
  recordStatus,
} from "../../src/features/game/logic/gameRecord";
import type { DifficultyRating } from "../../src/features/game/types";

/**
 * Indicateurs admin d'une journée, recalculés depuis les lignes de partie
 * (#70) : rien n'est agrégé à l'écriture. Logique pure, testée hors Convex.
 */

export type GameStatsInput = GameRecord & { rating?: DifficultyRating };

export type DailyGameStats = {
  /** Parties créées (au moins un coup), finies ou non. */
  games: number;
  wins: number;
  losses: number;
  lostByLives: number;
  lostByBlocked: number;
  totalLivesLeft: number;
  totalFilledCells: number;
  totalMoves: number;
  tooEasyCount: number;
  balancedCount: number;
  tooHardCount: number;
  /** Erreurs par case, toutes parties confondues (ordre de `CELL_KEYS`). */
  failedByCell: number[];
};

export function summarizeGames(
  games: readonly GameStatsInput[],
  validAnswers: Record<string, string[]>,
): DailyGameStats {
  const stats: DailyGameStats = {
    games: games.length,
    wins: 0,
    losses: 0,
    lostByLives: 0,
    lostByBlocked: 0,
    totalLivesLeft: 0,
    totalFilledCells: 0,
    totalMoves: 0,
    tooEasyCount: 0,
    balancedCount: 0,
    tooHardCount: 0,
    failedByCell: Array.from({ length: 9 }, () => 0),
  };
  games.forEach((game) => {
    game.failed.forEach((n, index) => {
      stats.failedByCell[index] += n;
    });
    if (game.rating === "too_easy") stats.tooEasyCount += 1;
    if (game.rating === "balanced") stats.balancedCount += 1;
    if (game.rating === "too_hard") stats.tooHardCount += 1;

    const status = recordStatus(game, validAnswers);
    if (status === "playing") return;
    const lives = recordLivesRemaining(game);
    const filled = Object.values(recordCells(game, validAnswers)).filter(
      (cell) => cell.status === "filled",
    ).length;
    if (status === "won") stats.wins += 1;
    else {
      stats.losses += 1;
      if (lives <= 0) stats.lostByLives += 1;
      else stats.lostByBlocked += 1;
    }
    stats.totalLivesLeft += lives;
    stats.totalFilledCells += filled;
    stats.totalMoves += filled + recordFailedTotal(game);
  });
  return stats;
}
