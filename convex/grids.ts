import { ConvexError, v } from "convex/values";
import { CONSTRAINTS } from "../src/features/game/logic/constraints";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, internalAction, mutation, query } from "./_generated/server";
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayUTC(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function tomorrowUTC(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysAgoUTC(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function checkAdminToken(provided: string): void {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || provided !== expected) {
    throw new ConvexError("Unauthorized");
  }
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
  args: { date: v.string() },
  handler: async (ctx, args) => {
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
  args: {},
  handler: async (ctx) => {
    const cutoff = daysAgoUTC(30);
    return await ctx.db
      .query("grids")
      .withIndex("by_date", (q) => q.gte("date", cutoff))
      .order("asc")
      .take(500);
  },
});

/** Pool stats for the admin dashboard. */
export const getPoolStats = query({
  args: {},
  handler: async (ctx) => {
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

    const seedCounts: Record<string, number> = {};
    for (const g of available) {
      const seed = g.metadata.seedConstraint;
      seedCounts[seed] = (seedCounts[seed] ?? 0) + 1;
    }

    return {
      available: available.length,
      used: used.length,
      rejected: rejected.length,
      total: available.length + used.length + rejected.length,
      daysOfRunway: available.length,
      constraintCoverage: Object.entries(seedCounts).map(([id, count]) => ({
        id,
        gridsInPool: count,
      })),
    };
  },
});

/** Paginated list of available pool grids for the admin browse view. */
export const getPoolGrids = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 20, 100);
    return await ctx.db
      .query("gridCandidates")
      .withIndex("by_status", (q) => q.eq("status", "available"))
      .take(limit);
  },
});

/** Returns recent observed feedback metrics for scheduled grids. */
export const getGridFeedbackStats = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
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

// ─── Public mutations (admin) ─────────────────────────────────────────────────

/** Rejects a pool grid (admin blacklist). */
export const rejectPoolGrid = mutation({
  args: {
    candidateId: v.id("gridCandidates"),
    adminToken: v.string(),
  },
  handler: async (ctx, args) => {
    checkAdminToken(args.adminToken);
    const candidate = await ctx.db.get(args.candidateId);
    if (!candidate) throw new ConvexError("Candidate not found");
    if (candidate.status !== "available") {
      throw new ConvexError(
        `Cannot reject: candidate status is "${candidate.status}"`,
      );
    }
    await ctx.db.patch(args.candidateId, { status: "rejected" });
  },
});

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
  },
  handler: async (ctx, args) => {
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
