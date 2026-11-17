import {
  type GameRecord,
  recordCells,
  recordFailedTotal,
  recordLivesRemaining,
  recordStatus,
} from "../../src/features/game/logic/gameRecord";
import { CELL_KEYS } from "../../src/features/game/logic/gridTopology";

/**
 * Indicateurs admin d'une journée, recalculés depuis les lignes de partie
 * (#70) : rien n'est agrégé à l'écriture. Logique pure, testée hors Convex.
 */

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
  /** Erreurs par case, toutes parties confondues (ordre de `CELL_KEYS`). */
  failedByCell: number[];
  /**
   * Parties finies où le joueur s'est trompé au moins une fois sur la case :
   * la règle du calque « Erreurs » de la grille solution (`buildCohort`).
   */
  erredByCell: number[];
  /**
   * Parties finies où la case est restée vide, hors case bloquée : le joueur
   * qui ne connaît pas la réponse ne tente rien, et ses erreurs ne le disent pas.
   */
  leftEmptyByCell: number[];
};

function zeroPerCell(): number[] {
  return Array.from({ length: CELL_KEYS.length }, () => 0);
}

export function summarizeGames(
  games: readonly GameRecord[],
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
    failedByCell: zeroPerCell(),
    erredByCell: zeroPerCell(),
    leftEmptyByCell: zeroPerCell(),
  };
  games.forEach((game) => {
    game.failed.forEach((n, index) => {
      stats.failedByCell[index] += n;
    });
    const status = recordStatus(game, validAnswers);
    if (status === "playing") return;
    const lives = recordLivesRemaining(game);
    const cells = recordCells(game, validAnswers);
    let filled = 0;
    CELL_KEYS.forEach((key, index) => {
      const cell = cells[key];
      if (cell.status === "filled") filled += 1;
      else if (cell.status === "empty") stats.leftEmptyByCell[index] += 1;
      if (game.failed[index] > 0) stats.erredByCell[index] += 1;
    });
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
