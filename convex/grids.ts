import { ConvexError, v } from "convex/values";
import { CONSTRAINTS } from "../src/features/game/logic/constraints";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";
import { action, internalAction, mutation, query } from "./_generated/server";
import { checkAdminToken } from "./auth";
import { CELL_KEYS } from "./cellKeys";
import { getCandidateAnswers, getGridAnswers } from "./gridData";
import { computeCellMetric, computePlayersEngaged } from "./lib/cellMetrics";
import { daysAgoUTC, offsetUTC, todayUTC, tomorrowUTC } from "./lib/dates";
import {
  type GenerationReport,
  HISTORY_WINDOW,
  POOL_LOW_THRESHOLD,
} from "./lib/gridConstants";
import { generateDiversePool } from "./lib/gridGenerator";
import { selectNextGrid } from "./lib/gridScheduler";
import { rateLimiter } from "./rateLimit";

// Nombre max de jours simulés/affichés par getUpcomingScheduledPreview
const UPCOMING_PREVIEW_MAX_DAYS = 14;
const UPCOMING_PREVIEW_DEFAULT_DAYS = 7;

/**
 * Borne haute défensive sur les soumissions par grille (9 succès + N échecs).
 * Cinq vies max, donc 9 + 5 = 14 en théorie ; on autorise une marge pour
 * absorber les variations futures sans bloquer les vrais joueurs.
 */
const MAX_GUESSES_PER_GAME = 50;

/** Doit rester aligné avec STARTING_LIVES dans src/features/game/logic/constants.ts. */
const MAX_LIVES = 5;

const DELETE_BATCH_SIZE = 512;

// ─── Internal actions (crons + seed) ─────────────────────────────────────────

/**
 * Generates a full diverse pool and inserts all grids into gridCandidates.
 *
 * Helper async **direct** (pas une action) : appelé in-process par
 * `refreshPoolImpl`, le seed et le cron `autoRefillPool`, jamais via
 * `ctx.runAction` (cf. anti-pattern action→action des guidelines Convex).
 */
export async function generatePoolImpl(
  ctx: ActionCtx,
): Promise<GenerationReport> {
  const existing = await ctx.runQuery(internal.gridData.getAvailablePoolGrids);
  const { grids, report } = generateDiversePool(
    existing.map((g) => ({ constraintIds: g.metadata.constraintIds })),
  );

  for (const grid of grids) {
    await ctx.runMutation(internal.gridData.insertPoolGrid, {
      rows: grid.rows,
      cols: grid.cols,
      validAnswers: grid.validAnswers,
      metadata: grid.metadata,
    });
  }

  return report;
}

/**
 * Vide le stock available puis regénère un pool complet (helper direct).
 * Les candidates used et les grilles planifiées ne sont pas touchées.
 */
export async function refreshPoolImpl(
  ctx: ActionCtx,
): Promise<GenerationReport & { deletedAvailable: number }> {
  let deletedAvailable = 0;
  for (;;) {
    const deleted = await ctx.runMutation(
      internal.gridData.deleteAvailableCandidatesBatch,
      { limit: DELETE_BATCH_SIZE },
    );
    deletedAvailable += deleted;
    if (deleted < DELETE_BATCH_SIZE) break;
  }
  console.log(`[refreshPool] ${deletedAvailable} available candidates deleted`);
  const report = await generatePoolImpl(ctx);
  return { ...report, deletedAvailable };
}

/**
 * Refills the pool if it falls below POOL_LOW_THRESHOLD.
 * Called by weekly cron (Sunday 04:00 UTC).
 */
export const autoRefillPool = internalAction({
  args: {},
  handler: async (ctx) => {
    const available = await ctx.runQuery(
      internal.gridData.getAvailablePoolGrids,
    );
    if (available.length >= POOL_LOW_THRESHOLD) {
      return;
    }
    // Helper direct (pas de ctx.runAction imbriqué) — autoRefillPool est un cron.
    await generatePoolImpl(ctx);
  },
});

// ─── Public queries ───────────────────────────────────────────────────────────

/**
 * Returns today's grid, or null if not yet generated.
 *
 * `validAnswers` est jointe depuis le satellite `gridAnswers` via candidateId.
 * Le doc `grids` lui-même n'embarque plus ce champ lourd.
 */
export const getTodayGrid = query({
  args: {},
  handler: async (ctx) => {
    const today = todayUTC();
    const grid = await ctx.db
      .query("grids")
      .withIndex("by_date", (q) => q.eq("date", today))
      .unique();
    if (!grid) {
      console.error(`[CRITICAL] no grid for today ${today}`);
      return null;
    }
    const validAnswers = (await getGridAnswers(ctx, grid)) ?? {};
    return {
      _id: grid._id,
      _creationTime: grid._creationTime,
      date: grid.date,
      rows: grid.rows,
      cols: grid.cols,
      difficulty: grid.difficulty,
      candidateId: grid.candidateId,
      validAnswers,
    };
  },
});

/**
 * Returns all grids scheduled from the past 30 days onwards, with candidate metadata.
 * Used by the admin calendar and grid detail panel.
 *
 * `validAnswers` n'est pas inclus pour limiter la bande passante : utiliser
 * `getScheduledGridPreviewDetail` à la sélection d'une date.
 */
export const getScheduledGrids = query({
  args: { adminToken: v.string() },
  handler: async (ctx, args) => {
    checkAdminToken(args.adminToken);
    const cutoff = daysAgoUTC(30);
    const grids = await ctx.db
      .query("grids")
      .withIndex("by_date", (q) => q.gte("date", cutoff))
      .order("asc")
      .take(500);

    return await Promise.all(
      grids.map(async (grid) => {
        const candidate = await ctx.db.get(grid.candidateId);
        return {
          date: grid.date,
          rows: grid.rows,
          cols: grid.cols,
          difficulty: grid.difficulty,
          candidateId: grid.candidateId,
          metadata: candidate?.metadata ?? null,
        };
      }),
    );
  },
});

/** Charge validAnswers d'une grille planifiée (lazy fetch admin). */
export const getScheduledGridPreviewDetail = query({
  args: { adminToken: v.string(), date: v.string() },
  handler: async (ctx, args) => {
    checkAdminToken(args.adminToken);
    const grid = await ctx.db
      .query("grids")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .unique();
    if (!grid) return null;
    const validAnswers = (await getGridAnswers(ctx, grid)) ?? {};
    return {
      date: grid.date,
      rows: grid.rows,
      cols: grid.cols,
      validAnswers,
      difficulty: grid.difficulty,
    };
  },
});

/** Charge validAnswers d'une candidate du pool (lazy fetch admin). */
export const getCandidatePreviewDetail = query({
  args: { adminToken: v.string(), candidateId: v.id("gridCandidates") },
  handler: async (ctx, args) => {
    checkAdminToken(args.adminToken);
    const candidate = await ctx.db.get(args.candidateId);
    if (!candidate) return null;
    const validAnswers = (await getCandidateAnswers(ctx, candidate._id)) ?? {};
    return {
      rows: candidate.rows,
      cols: candidate.cols,
      validAnswers,
      cellDifficulties: candidate.metadata.cellDifficulties,
    };
  },
});

/**
 * Pool stats for the admin dashboard.
 *
 * `constraintCoverage` and `countryCoverage` count how many available grids
 * contain each constraint / country (any cell, not just seed). On compte les
 * contraintes absentes (count = 0) pour pouvoir alerter sur les zones froides.
 */
export const getPoolStats = query({
  args: { adminToken: v.string() },
  handler: async (ctx, args) => {
    checkAdminToken(args.adminToken);
    const available = await ctx.db
      .query("gridCandidates")
      .withIndex("by_status", (q) => q.eq("status", "available"))
      .collect();
    const used = await ctx.db
      .query("gridCandidates")
      .withIndex("by_status", (q) => q.eq("status", "used"))
      .collect();

    const constraintCounts: Record<string, number> = {};
    for (const c of CONSTRAINTS) constraintCounts[c.id] = 0;

    const countryCounts: Record<string, number> = {};

    for (const g of available) {
      for (const id of g.metadata.constraintIds) {
        constraintCounts[id] = (constraintCounts[id] ?? 0) + 1;
      }
      for (const code of g.metadata.countryPool) {
        countryCounts[code] = (countryCounts[code] ?? 0) + 1;
      }
    }

    return {
      available: available.length,
      used: used.length,
      total: available.length + used.length,
      constraintCoverage: Object.entries(constraintCounts).map(
        ([id, count]) => ({ id, gridsInPool: count }),
      ),
      countryCoverage: Object.entries(countryCounts).map(([code, count]) => ({
        code,
        gridsInPool: count,
      })),
    };
  },
});

/**
 * Aperçu lecture seule des `days` prochains jours :
 * - `kind: "scheduled"` si la grille est déjà inscrite dans `grids` ;
 * - `kind: "predicted"` si on simule le scheduler depuis le pool actuel ;
 * - `kind: "missing"` si le pool est vide pour ce jour-là.
 *
 * `validAnswers` n'est PAS embarqué : le front fetch via
 * `getScheduledGridPreviewDetail` / `getCandidatePreviewDetail` à l'ouverture.
 */
export const getUpcomingScheduledPreview = query({
  args: { adminToken: v.string(), days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    checkAdminToken(args.adminToken);
    const days = Math.min(
      Math.max(args.days ?? UPCOMING_PREVIEW_DEFAULT_DAYS, 1),
      UPCOMING_PREVIEW_MAX_DAYS,
    );
    const tomorrow = tomorrowUTC();

    const futureScheduled = await ctx.db
      .query("grids")
      .withIndex("by_date", (q) => q.gte("date", tomorrow))
      .order("asc")
      .take(days + 7);
    const scheduledByDate = new Map(futureScheduled.map((g) => [g.date, g]));

    const available = await ctx.db
      .query("gridCandidates")
      .withIndex("by_status", (q) => q.eq("status", "available"))
      .collect();
    const poolForScheduler = available.map((g) => ({
      _id: g._id as string,
      rows: g.rows,
      cols: g.cols,
      metadata: g.metadata,
    }));

    const recentPublished = await ctx.db
      .query("grids")
      .withIndex("by_date", (q) => q.lt("date", tomorrow))
      .order("desc")
      .take(HISTORY_WINDOW);
    let recentForScheduler = recentPublished.map((g) => ({
      constraintIds: [...g.rows, ...g.cols],
      countryPool: g.countryPool,
    }));

    type UpcomingDay =
      | {
          date: string;
          kind: "scheduled" | "predicted";
          rows: string[];
          cols: string[];
          difficulty: number;
          cellDifficulties: number[] | null;
          candidateId: Id<"gridCandidates"> | null;
        }
      | { date: string; kind: "missing" };

    const upcoming: UpcomingDay[] = [];
    const usedIds = new Set<string>();

    for (let i = 0; i < days; i++) {
      const date = offsetUTC(i + 1);
      const existing = scheduledByDate.get(date);

      if (existing) {
        const candidate = await ctx.db.get(existing.candidateId);
        upcoming.push({
          date,
          kind: "scheduled",
          rows: existing.rows,
          cols: existing.cols,
          difficulty: existing.difficulty,
          cellDifficulties: candidate?.metadata.cellDifficulties ?? null,
          candidateId: existing.candidateId,
        });
        recentForScheduler = [
          {
            constraintIds: [...existing.rows, ...existing.cols],
            countryPool: existing.countryPool,
          },
          ...recentForScheduler,
        ];
        continue;
      }

      const remaining = poolForScheduler.filter((g) => !usedIds.has(g._id));
      const picked = selectNextGrid(remaining, recentForScheduler);
      if (!picked) {
        upcoming.push({ date, kind: "missing" });
        continue;
      }

      upcoming.push({
        date,
        kind: "predicted",
        rows: picked.grid.rows,
        cols: picked.grid.cols,
        difficulty: picked.grid.metadata.difficultyEstimate,
        cellDifficulties: picked.grid.metadata.cellDifficulties,
        candidateId: picked.grid._id as Id<"gridCandidates">,
      });
      usedIds.add(picked.grid._id);
      recentForScheduler = [
        {
          constraintIds: picked.grid.metadata.constraintIds,
          countryPool: picked.grid.metadata.countryPool,
        },
        ...recentForScheduler,
      ];
    }

    return upcoming;
  },
});

/**
 * Returns recent observed feedback metrics for scheduled grids.
 *
 * `ratingCount` = nombre de joueurs ayant noté la difficulté (clic facultatif).
 * `gamesPlayed` = nombre de parties terminées (wins + losses), alimenté par
 * `recordGameEnd`. C'est le dénominateur des moyennes (winRate, avgLivesLeft,
 * avgFilledCells, avgGuessesSubmitted) — sans ça on sous-estime la base de
 * joueurs puisque seul un sous-ensemble note la grille.
 */
export const getGridFeedbackStats = query({
  args: {
    adminToken: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    checkAdminToken(args.adminToken);
    const limit = Math.min(args.limit ?? 60, 180);
    const feedbackRows = await ctx.db
      .query("gridFeedback")
      .withIndex("by_date")
      .order("desc")
      .take(limit);

    return feedbackRows.map((row) => {
      const ratings = row.totalRatings;
      const gamesPlayed = row.wins + row.losses;
      const difficultyObserved100 =
        ratings === 0
          ? null
          : Math.round(
              (row.balancedCount * 50 + row.tooHardCount * 100) / ratings,
            );
      return {
        date: row.date,
        ratingCount: ratings,
        gamesPlayed,
        difficultyObserved100,
        winRate:
          gamesPlayed === 0
            ? null
            : Number((row.wins / gamesPlayed).toFixed(3)),
        avgLivesLeft:
          gamesPlayed === 0
            ? null
            : Number((row.totalLivesLeft / gamesPlayed).toFixed(2)),
        avgFilledCells:
          gamesPlayed === 0
            ? null
            : Number((row.totalFilledCells / gamesPlayed).toFixed(2)),
        avgGuessesSubmitted:
          gamesPlayed === 0
            ? null
            : Number((row.totalGuessesSubmitted / gamesPlayed).toFixed(2)),
        tooEasyCount: row.tooEasyCount,
        balancedCount: row.balancedCount,
        tooHardCount: row.tooHardCount,
        wins: row.wins,
        losses: row.losses,
        lostByLives: row.lostByLivesCount ?? 0,
        lostByBlocked: row.lostByBlockedCount ?? 0,
      };
    });
  },
});

/**
 * Métriques observées par case pour une grille passée.
 *
 * Compose `dailyStats`, `guesses`, `grids` (validAnswers via le satellite) et
 * `gridFeedback` (wins + losses pour les parties terminées ; fillRate via
 * `playersEngaged` = max des totalGuesses sur les 9 cases) pour exposer un rapport
 * case par case : taux de remplissage, top des pays choisis, couverture du
 * pool de réponses valides, pays jamais trouvés, et difficulté estimée vs
 * observée.
 *
 * Renvoie `null` si la grille n'existe pas pour cette date. Lourde (9 dailyStats
 * + 9 guesses) : consommée AU CLIC seulement dans /admin (détail d'un jour) et
 * par les scripts d'export analytics — jamais en masse sur le calendrier.
 */
export const getGridCellMetrics = query({
  args: { date: v.string(), adminToken: v.string() },
  handler: async (ctx, args) => {
    checkAdminToken(args.adminToken);

    const grid = await ctx.db
      .query("grids")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .unique();
    if (!grid) return null;

    const validAnswers = (await getGridAnswers(ctx, grid)) ?? {};

    const candidate = await ctx.db.get(grid.candidateId);
    const cellDifficulties = candidate?.metadata.cellDifficulties ?? null;
    const rows = grid.rows;
    const cols = grid.cols;

    const feedback = await ctx.db
      .query("gridFeedback")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .unique();
    const wins = feedback?.wins ?? 0;
    const losses = feedback?.losses ?? 0;
    const gamesFinished = wins + losses;

    type CellInput = {
      validForCell: string[];
      totalGuesses: number;
      failedAttempts: number;
      guessRows: Array<{ countryCode: string; count: number }>;
      estimatedDifficulty: number | null;
    };
    const cellInputs: CellInput[] = [];

    for (let i = 0; i < CELL_KEYS.length; i++) {
      const cellKey = CELL_KEYS[i] as string;
      const stats = await ctx.db
        .query("dailyStats")
        .withIndex("by_date_and_cell", (q) =>
          q.eq("date", args.date).eq("cellKey", cellKey),
        )
        .unique();
      const guessRows = await ctx.db
        .query("guesses")
        .withIndex("by_date_and_cell", (q) =>
          q.eq("date", args.date).eq("cellKey", cellKey),
        )
        .collect();

      cellInputs.push({
        validForCell: validAnswers[cellKey] ?? [],
        totalGuesses: stats?.totalGuesses ?? 0,
        failedAttempts: stats?.failedAttempts ?? 0,
        guessRows: guessRows
          .filter((g) => g.isReplay !== true)
          .map((g) => ({
            countryCode: g.countryCode,
            count: g.count,
          })),
        estimatedDifficulty: cellDifficulties?.[i] ?? null,
      });
    }

    const playersEngaged = computePlayersEngaged(
      cellInputs.map((c) => c.totalGuesses),
    );

    const cells: Record<
      string,
      ReturnType<typeof computeCellMetric> & {
        failedAttempts: number;
        validAnswers: string[];
        picks: Array<{ countryCode: string; count: number }>;
      }
    > = {};
    for (let i = 0; i < CELL_KEYS.length; i++) {
      const cellKey = CELL_KEYS[i] as string;
      const input = cellInputs[i];
      cells[cellKey] = {
        ...computeCellMetric({
          validForCell: input.validForCell,
          totalGuesses: input.totalGuesses,
          guessRows: input.guessRows,
          playersEngaged,
          estimatedDifficulty: input.estimatedDifficulty,
        }),
        failedAttempts: input.failedAttempts,
        // Liste complète des solutions de la case (pour réafficher les chips
        // côté admin sans seconde query).
        validAnswers: input.validForCell,
        // Distribution complète des choix (countryCode → nb de fois choisi),
        // pour trier les chips et afficher le compte. Non plafonnée (≠ topAnswers).
        picks: input.guessRows,
      };
    }

    return {
      date: args.date,
      rows,
      cols,
      gamesFinished,
      playersEngaged,
      wins,
      losses,
      cells,
    };
  },
});

// ─── Public mutations ─────────────────────────────────────────────────────────

/**
 * Enregistre la fin de partie d'un joueur (gagnée ou perdue). Appelée
 * automatiquement par le client quand `state.status` passe à `won` ou `lost`,
 * idempotente côté client via un flag localStorage. Incrémente les compteurs
 * de parties terminées dans `gridFeedback`, indépendamment du rating.
 */
export const recordGameEnd = mutation({
  args: {
    date: v.string(),
    // Cause de fin de partie ; `won` en est dérivé. Front et back déployés
    // ensemble → requis, pas de hedge de rollout.
    endReason: v.union(
      v.literal("win"),
      v.literal("lives"),
      v.literal("blocked"),
    ),
    livesLeft: v.number(),
    filledCells: v.number(),
    guessesSubmitted: v.number(),
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    await rateLimiter.limit(ctx, "feedback", {
      key: args.clientId,
      throws: true,
    });

    if (
      !Number.isInteger(args.livesLeft) ||
      args.livesLeft < 0 ||
      args.livesLeft > MAX_LIVES
    ) {
      throw new ConvexError("Invalid livesLeft");
    }
    if (
      !Number.isInteger(args.filledCells) ||
      args.filledCells < 0 ||
      args.filledCells > 9
    ) {
      throw new ConvexError("Invalid filledCells");
    }
    if (
      !Number.isInteger(args.guessesSubmitted) ||
      args.guessesSubmitted < 0 ||
      args.guessesSubmitted > MAX_GUESSES_PER_GAME
    ) {
      throw new ConvexError("Invalid guessesSubmitted");
    }
    const won = args.endReason === "win";
    if (won && args.filledCells !== 9) {
      throw new ConvexError("Invalid: win requires 9 filled cells");
    }
    if (won && args.livesLeft <= 0) {
      throw new ConvexError("Invalid: win requires lives left");
    }
    if (args.endReason === "lives" && args.livesLeft > 0) {
      throw new ConvexError("Invalid: 'lives' end requires no lives left");
    }
    if (args.endReason === "blocked" && args.livesLeft <= 0) {
      throw new ConvexError("Invalid: 'blocked' end requires lives left");
    }
    if (args.endReason === "blocked" && args.filledCells === 9) {
      throw new ConvexError("Invalid: 'blocked' end can't have 9 filled");
    }

    const existing = await ctx.db
      .query("gridFeedback")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .unique();

    const winsInc = won ? 1 : 0;
    const lossesInc = won ? 0 : 1;
    const livesLossInc = args.endReason === "lives" ? 1 : 0;
    const blockedLossInc = args.endReason === "blocked" ? 1 : 0;

    if (existing) {
      await ctx.db.patch(existing._id, {
        wins: existing.wins + winsInc,
        losses: existing.losses + lossesInc,
        lostByLivesCount: (existing.lostByLivesCount ?? 0) + livesLossInc,
        lostByBlockedCount: (existing.lostByBlockedCount ?? 0) + blockedLossInc,
        totalLivesLeft: existing.totalLivesLeft + args.livesLeft,
        totalFilledCells: existing.totalFilledCells + args.filledCells,
        totalGuessesSubmitted:
          existing.totalGuessesSubmitted + args.guessesSubmitted,
      });
      return;
    }

    await ctx.db.insert("gridFeedback", {
      date: args.date,
      tooEasyCount: 0,
      balancedCount: 0,
      tooHardCount: 0,
      totalRatings: 0,
      wins: winsInc,
      losses: lossesInc,
      lostByLivesCount: livesLossInc,
      lostByBlockedCount: blockedLossInc,
      totalLivesLeft: args.livesLeft,
      totalFilledCells: args.filledCells,
      totalGuessesSubmitted: args.guessesSubmitted,
    });
  },
});

/**
 * Enregistre la note de difficulté d'un joueur (facultative). Touche
 * uniquement aux compteurs de rating ; les compteurs de parties terminées
 * sont alimentés par `recordGameEnd`.
 */
export const submitGridFeedback = mutation({
  args: {
    date: v.string(),
    rating: v.union(
      v.literal("too_easy"),
      v.literal("balanced"),
      v.literal("too_hard"),
    ),
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    await rateLimiter.limit(ctx, "feedback", {
      key: args.clientId,
      throws: true,
    });

    const existing = await ctx.db
      .query("gridFeedback")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .unique();

    const tooEasyInc = args.rating === "too_easy" ? 1 : 0;
    const balancedInc = args.rating === "balanced" ? 1 : 0;
    const tooHardInc = args.rating === "too_hard" ? 1 : 0;

    if (existing) {
      await ctx.db.patch(existing._id, {
        tooEasyCount: existing.tooEasyCount + tooEasyInc,
        balancedCount: existing.balancedCount + balancedInc,
        tooHardCount: existing.tooHardCount + tooHardInc,
        totalRatings: existing.totalRatings + 1,
      });
      return;
    }

    await ctx.db.insert("gridFeedback", {
      date: args.date,
      tooEasyCount: tooEasyInc,
      balancedCount: balancedInc,
      tooHardCount: tooHardInc,
      totalRatings: 1,
      wins: 0,
      losses: 0,
      totalLivesLeft: 0,
      totalFilledCells: 0,
      totalGuessesSubmitted: 0,
    });
  },
});

// ─── Public actions (admin) ───────────────────────────────────────────────────

/**
 * Regénère le pool : supprime le stock available puis génère un batch complet.
 * Protected by adminToken.
 */
export const refreshPool = action({
  args: { adminToken: v.string() },
  handler: async (
    ctx,
    args,
  ): Promise<GenerationReport & { deletedAvailable: number }> => {
    checkAdminToken(args.adminToken);
    return await refreshPoolImpl(ctx);
  },
});

/**
 * Planifie today + tomorrow (équivalent manuel du cron daily).
 * Protected by adminToken.
 */
export const runEnsureTomorrow = action({
  args: { adminToken: v.string() },
  handler: async (ctx, args) => {
    checkAdminToken(args.adminToken);
    await ctx.runMutation(internal.scheduling.ensureDailyGrids, {});
  },
});

/**
 * Plans a grid for a specific date (admin override of the daily cron).
 * Idempotent : early-return si la date est déjà dans `grids`.
 * Protected by adminToken.
 */
export const scheduleGridForDate = action({
  args: { adminToken: v.string(), date: v.string() },
  handler: async (ctx, args): Promise<{ date: string } | null> => {
    checkAdminToken(args.adminToken);
    return await ctx.runMutation(internal.scheduling.assignGridForDate, {
      date: args.date,
    });
  },
});
