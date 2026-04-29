import { ConvexError, v } from "convex/values";
import { CONSTRAINTS } from "../src/features/game/logic/constraints";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, internalAction, mutation, query } from "./_generated/server";
import { checkAdminToken } from "./auth";
import {
  type GenerationReport,
  HISTORY_WINDOW,
  POOL_LOW_THRESHOLD,
} from "./lib/gridConstants";
import {
  buildConstraintMatches,
  finalizeGrid,
  generateDiversePool,
  tryBuildGridWithSeed,
} from "./lib/gridGenerator";
import { selectNextGrid } from "./lib/gridScheduler";
import { rateLimiter } from "./rateLimit";

// Nombre max de jours simulés/affichés par getUpcomingScheduledPreview
const UPCOMING_PREVIEW_MAX_DAYS = 14;
const UPCOMING_PREVIEW_DEFAULT_DAYS = 7;

/**
 * Borne haute défensive sur les soumissions par grille (9 succès + N échecs).
 * Trois vies max, donc 9 + 3 = 12 en théorie ; on autorise une marge x4 pour
 * absorber les variations futures sans bloquer les vrais joueurs.
 */
const MAX_GUESSES_PER_GAME = 50;

/** Doit rester aligné avec STARTING_LIVES dans src/features/game/logic/constants.ts. */
const MAX_LIVES = 3;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function offsetUTC(deltaDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + deltaDays);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayUTC(): string {
  return offsetUTC(0);
}

function tomorrowUTC(): string {
  return offsetUTC(1);
}

function daysAgoUTC(n: number): string {
  return offsetUTC(-n);
}

// ─── Internal actions (crons + seed) ─────────────────────────────────────────

/**
 * Generates a full diverse pool and inserts all grids into gridCandidates.
 * Called by the admin action (with token check) and by the weekly cron.
 */
export const generatePoolInternal = internalAction({
  args: {},
  handler: async (ctx): Promise<GenerationReport> => {
    const existing = await ctx.runQuery(
      internal.gridData.getAvailablePoolGrids,
    );
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

    console.log(
      `[generatePoolInternal] Generated ${report.totalGenerated} grids ` +
        `(${Math.round(report.constraintCoverage * 100)}% constraint coverage, ` +
        `${report.countryCoverage} countries, ${report.durationMs}ms)`,
    );
    return report;
  },
});

/**
 * Assigns a grid from the pool to a specific date.
 * Uses the scheduler to pick the best available grid.
 * Falls back to emergency generation if the pool is empty.
 */
export const ensureGridForDate = internalAction({
  args: { date: v.string() },
  handler: async (
    ctx,
    args,
  ): Promise<{ date: string; candidateId: string } | null> => {
    const exists = await ctx.runQuery(internal.gridData.hasGridForDate, {
      date: args.date,
    });
    if (exists) {
      console.log(`[ensureGridForDate] Grid for ${args.date} already exists`);
      return null;
    }

    const available = await ctx.runQuery(
      internal.gridData.getAvailablePoolGrids,
    );
    const recentGrids = await ctx.runQuery(
      internal.gridData.getRecentPublishedGrids,
      { limit: HISTORY_WINDOW },
    );

    const poolForScheduler = available.map((g) => ({
      _id: g._id as string,
      rows: g.rows,
      cols: g.cols,
      validAnswers: g.validAnswers,
      metadata: g.metadata,
    }));

    const recentForScheduler = recentGrids.map((g) => ({
      constraintIds: [...g.rows, ...g.cols],
      countryPool: Object.values(g.validAnswers).flat(),
    }));

    const selected = selectNextGrid(poolForScheduler, recentForScheduler);

    if (!selected) {
      // FALLBACK: emergency generation with a random seed — no overlap check
      console.error(
        `[ensureGridForDate] POOL EMPTY: no grid for ${args.date}, using emergency fallback`,
      );
      const matches = buildConstraintMatches();
      const randomSeed =
        CONSTRAINTS[Math.floor(Math.random() * CONSTRAINTS.length)];
      const gridResult = tryBuildGridWithSeed(randomSeed.id, "row", matches);
      if (!gridResult) {
        console.error(
          `[ensureGridForDate] Emergency grid generation failed for ${args.date}`,
        );
        return null;
      }
      const finalized = finalizeGrid(
        gridResult.rows,
        gridResult.cols,
        randomSeed.id,
        matches,
      );
      if (!finalized) {
        console.error(
          `[ensureGridForDate] Emergency grid finalization failed for ${args.date}`,
        );
        return null;
      }
      const candidateId = await ctx.runMutation(
        internal.gridData.insertPoolGrid,
        {
          rows: finalized.rows,
          cols: finalized.cols,
          validAnswers: finalized.validAnswers,
          metadata: finalized.metadata,
        },
      );
      await ctx.runMutation(internal.gridData.markCandidateUsed, {
        candidateId,
        date: args.date,
      });
      await ctx.runMutation(internal.gridData.insertGrid, {
        date: args.date,
        rows: finalized.rows,
        cols: finalized.cols,
        validAnswers: finalized.validAnswers,
        difficulty: finalized.metadata.difficultyEstimate,
        candidateId,
      });
      return { date: args.date, candidateId };
    }

    await ctx.runMutation(internal.gridData.markCandidateUsed, {
      candidateId: selected.grid._id as Id<"gridCandidates">,
      date: args.date,
    });
    await ctx.runMutation(internal.gridData.insertGrid, {
      date: args.date,
      rows: selected.grid.rows,
      cols: selected.grid.cols,
      validAnswers: selected.grid.validAnswers,
      difficulty: selected.grid.metadata.difficultyEstimate,
      candidateId: selected.grid._id as Id<"gridCandidates">,
    });

    const remaining = available.length - 1;
    if (remaining < POOL_LOW_THRESHOLD) {
      console.warn(
        `[ensureGridForDate] POOL LOW: ${remaining} grids remaining after assignment for ${args.date}`,
      );
    }

    return { date: args.date, candidateId: selected.grid._id };
  },
});

/**
 * Ensures tomorrow's grid exists. Called by daily cron at 23:30 UTC.
 */
export const ensureTomorrowGrid = internalAction({
  args: {},
  handler: async (ctx) => {
    const tomorrow = tomorrowUTC();
    await ctx.runAction(internal.grids.ensureGridForDate, { date: tomorrow });
  },
});

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
      console.log(
        `[autoRefillPool] Pool healthy (${available.length} available), no refill needed`,
      );
      return;
    }
    const report = await ctx.runAction(internal.grids.generatePoolInternal, {});
    console.log(
      `[autoRefillPool] POOL REFILL: generated ${report.totalGenerated} new grids, ` +
        `pool now at ${available.length + report.totalGenerated}`,
    );
  },
});

// ─── Public queries ───────────────────────────────────────────────────────────

/** Returns today's grid, or null if not yet generated. */
export const getTodayGrid = query({
  args: {},
  handler: async (ctx) => {
    const today = todayUTC();
    return await ctx.db
      .query("grids")
      .withIndex("by_date", (q) => q.eq("date", today))
      .unique();
  },
});

/**
 * Returns a scheduled grid and its linked candidate's metadata.
 * Used by the admin planning panel.
 */
export const getGridDetailByDate = query({
  args: { date: v.string(), adminToken: v.string() },
  handler: async (ctx, args) => {
    checkAdminToken(args.adminToken);
    const grid = await ctx.db
      .query("grids")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .unique();
    if (!grid) return null;

    const candidate = await ctx.db.get(grid.candidateId);
    return {
      date: grid.date,
      rows: grid.rows,
      cols: grid.cols,
      validAnswers: grid.validAnswers,
      difficulty: grid.difficulty,
      candidateId: grid.candidateId,
      metadata: candidate?.metadata ?? null,
    };
  },
});

/**
 * Returns all grids scheduled from the past 30 days onwards.
 * Used by the admin calendar.
 */
export const getScheduledGrids = query({
  args: { adminToken: v.string() },
  handler: async (ctx, args) => {
    checkAdminToken(args.adminToken);
    const cutoff = daysAgoUTC(30);
    return await ctx.db
      .query("grids")
      .withIndex("by_date", (q) => q.gte("date", cutoff))
      .order("asc")
      .take(500);
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
    const rejected = await ctx.db
      .query("gridCandidates")
      .withIndex("by_status", (q) => q.eq("status", "rejected"))
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
      rejected: rejected.length,
      total: available.length + used.length + rejected.length,
      daysOfRunway: available.length,
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

/** Exposition passée vs. prochaine des contraintes et pays, pour l'admin dashboard. */
export const getExposureStats = query({
  args: { adminToken: v.string() },
  handler: async (ctx, args) => {
    checkAdminToken(args.adminToken);
    const tomorrow = tomorrowUTC();

    const pastGrids = await ctx.db
      .query("grids")
      .withIndex("by_date", (q) => q.lt("date", tomorrow))
      .order("desc")
      .take(HISTORY_WINDOW);

    const upcomingGrids = await ctx.db
      .query("grids")
      .withIndex("by_date", (q) => q.gte("date", tomorrow))
      .order("asc")
      .take(UPCOMING_PREVIEW_MAX_DAYS);

    function aggregate(
      grids: Array<{
        rows: string[];
        cols: string[];
        validAnswers: Record<string, string[]>;
      }>,
    ) {
      const constraintCounts: Record<string, number> = {};
      const countryCounts: Record<string, number> = {};
      for (const g of grids) {
        for (const id of [...g.rows, ...g.cols]) {
          constraintCounts[id] = (constraintCounts[id] ?? 0) + 1;
        }
        // Count each country once per grid (even if valid in multiple cells)
        const unique = new Set(Object.values(g.validAnswers).flat());
        for (const code of unique) {
          countryCounts[code] = (countryCounts[code] ?? 0) + 1;
        }
      }
      return { constraintCounts, countryCounts };
    }

    return {
      pastGridCount: pastGrids.length,
      upcomingGridCount: upcomingGrids.length,
      past: aggregate(pastGrids),
      upcoming: aggregate(upcomingGrids),
    };
  },
});

/**
 * Aperçu lecture seule des `days` prochains jours :
 * - `kind: "scheduled"` si la grille est déjà inscrite dans `grids` (assignée par le cron) ;
 * - `kind: "predicted"` si on simule le scheduler à partir du pool actuel (lecture seule, rien n'est écrit) ;
 * - `kind: "missing"` si le pool est vide pour ce jour-là.
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
      validAnswers: g.validAnswers,
      metadata: g.metadata,
    }));

    const recentPublished = await ctx.db
      .query("grids")
      .withIndex("by_date", (q) => q.lt("date", tomorrow))
      .order("desc")
      .take(HISTORY_WINDOW);
    let recentForScheduler = recentPublished.map((g) => ({
      constraintIds: [...g.rows, ...g.cols],
      countryPool: Object.values(g.validAnswers).flat(),
    }));

    type UpcomingDay =
      | {
          date: string;
          kind: "scheduled" | "predicted";
          rows: string[];
          cols: string[];
          validAnswers: Record<string, string[]>;
          difficulty: number;
          cellDifficulties: number[] | null;
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
          validAnswers: existing.validAnswers,
          difficulty: existing.difficulty,
          cellDifficulties: candidate?.metadata.cellDifficulties ?? null,
        });
        recentForScheduler = [
          {
            constraintIds: [...existing.rows, ...existing.cols],
            countryPool: Object.values(existing.validAnswers).flat(),
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
        validAnswers: picked.grid.validAnswers,
        difficulty: picked.grid.metadata.difficultyEstimate,
        cellDifficulties: picked.grid.metadata.cellDifficulties,
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

/** Returns recent observed feedback metrics for scheduled grids. */
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
      const total = row.totalRatings;
      const difficultyObserved100 =
        total === 0
          ? null
          : Math.round(
              (row.balancedCount * 50 + row.tooHardCount * 100) / total,
            );
      return {
        date: row.date,
        ratingCount: row.totalRatings,
        difficultyObserved100,
        winRate: total === 0 ? null : Number((row.wins / total).toFixed(3)),
        avgLivesLeft:
          total === 0 ? null : Number((row.totalLivesLeft / total).toFixed(2)),
        avgFilledCells:
          total === 0
            ? null
            : Number((row.totalFilledCells / total).toFixed(2)),
        avgGuessesSubmitted:
          total === 0
            ? null
            : Number((row.totalGuessesSubmitted / total).toFixed(2)),
      };
    });
  },
});

// ─── Public mutations ─────────────────────────────────────────────────────────

/** Saves end-of-game feedback and aggregates lightweight session metrics. */
export const submitGridFeedback = mutation({
  args: {
    date: v.string(),
    rating: v.union(
      v.literal("too_easy"),
      v.literal("balanced"),
      v.literal("too_hard"),
    ),
    won: v.boolean(),
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
    if (args.won && args.filledCells !== 9) {
      throw new ConvexError("Invalid: won requires 9 filled cells");
    }
    if (args.won && args.livesLeft <= 0) {
      throw new ConvexError("Invalid: won requires lives left");
    }
    if (!args.won && args.livesLeft > 0 && args.filledCells === 9) {
      throw new ConvexError(
        "Invalid: 9 filled with lives left should be a win",
      );
    }

    const existing = await ctx.db
      .query("gridFeedback")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .unique();

    const tooEasyInc = args.rating === "too_easy" ? 1 : 0;
    const balancedInc = args.rating === "balanced" ? 1 : 0;
    const tooHardInc = args.rating === "too_hard" ? 1 : 0;
    const winsInc = args.won ? 1 : 0;
    const lossesInc = args.won ? 0 : 1;

    if (existing) {
      await ctx.db.patch(existing._id, {
        tooEasyCount: existing.tooEasyCount + tooEasyInc,
        balancedCount: existing.balancedCount + balancedInc,
        tooHardCount: existing.tooHardCount + tooHardInc,
        totalRatings: existing.totalRatings + 1,
        wins: existing.wins + winsInc,
        losses: existing.losses + lossesInc,
        totalLivesLeft: existing.totalLivesLeft + args.livesLeft,
        totalFilledCells: existing.totalFilledCells + args.filledCells,
        totalGuessesSubmitted:
          existing.totalGuessesSubmitted + args.guessesSubmitted,
      });
      return;
    }

    await ctx.db.insert("gridFeedback", {
      date: args.date,
      tooEasyCount: tooEasyInc,
      balancedCount: balancedInc,
      tooHardCount: tooHardInc,
      totalRatings: 1,
      wins: winsInc,
      losses: lossesInc,
      totalLivesLeft: args.livesLeft,
      totalFilledCells: args.filledCells,
      totalGuessesSubmitted: args.guessesSubmitted,
    });
  },
});

// ─── Public action (admin) ────────────────────────────────────────────────────

/**
 * Generates a full pool and stores results in gridCandidates.
 * Protected by adminToken.
 */
export const generatePool = action({
  args: { adminToken: v.string() },
  handler: async (ctx, args): Promise<GenerationReport> => {
    checkAdminToken(args.adminToken);
    return await ctx.runAction(internal.grids.generatePoolInternal, {});
  },
});
