import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalAction, mutation, query } from "./_generated/server";
import {
  CONTEXT_HISTORY_WINDOW,
  type GridContextInput,
  computeGridContext,
} from "./lib/gridContext";
import {
  BATCH_GENERATE_N,
  BATCH_STORE_N,
  generateBatch,
} from "./lib/gridGenerator";

// Phase 2 pool: on garde la moitié haute du batch pour laisser du jeu
// au scoring contextuel (= 15 candidates sur 30 générées).
const PHASE_2_POOL_SIZE = Math.floor(BATCH_GENERATE_N / 2);

// Pondération finalScore = alpha * quality + (1 - alpha) * context.
const FINAL_SCORE_QUALITY_WEIGHT = 0.6;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayUTC(): string {
  const d = new Date();
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

// ─── Internal actions (called by crons) ───────────────────────────────────────

/**
 * Two-phase candidate generation:
 *   1. Generate BATCH_GENERATE_N intrinsically-scored candidates (pure backtracking).
 *   2. Score the top PHASE_2_POOL_SIZE against the recent published history,
 *      then pick BATCH_STORE_N with the best finalScore = 0.6 × quality + 0.4 × context.
 * Cron: every day at 23:00 UTC.
 */
export const generateDailyCandidates = internalAction({
  args: {},
  handler: async (ctx) => {
    const existing: { rows: string[]; cols: string[] }[] = await ctx.runQuery(
      internal.gridData.getAllCandidatesForCheck,
    );
    const publishedGrids: { rows: string[]; cols: string[] }[] =
      await ctx.runQuery(internal.gridData.getAllGridsForCheck);

    const allExisting = [...existing, ...publishedGrids];
    const batch = generateBatch(BATCH_GENERATE_N, allExisting);

    if (batch.length === 0) {
      console.log(
        "[generateDailyCandidates] No new candidates generated (space saturated?)",
      );
      return;
    }

    // Phase 2 — contextual scoring against recent published history.
    const history: GridContextInput[] = await ctx.runQuery(
      internal.gridData.getRecentPublishedGrids,
      { limit: CONTEXT_HISTORY_WINDOW },
    );

    const pool = batch.slice(0, PHASE_2_POOL_SIZE);
    const scored = pool.map((candidate) => {
      const ctxMetrics = computeGridContext(
        {
          rows: candidate.rows,
          cols: candidate.cols,
          validAnswers: candidate.validAnswers,
        },
        history,
      );
      const finalScore =
        FINAL_SCORE_QUALITY_WEIGHT * candidate.score +
        (1 - FINAL_SCORE_QUALITY_WEIGHT) * ctxMetrics.contextScore;
      return { candidate, contextScore: ctxMetrics.contextScore, finalScore };
    });

    scored.sort((a, b) => b.finalScore - a.finalScore);
    const selected = scored.slice(0, BATCH_STORE_N);

    await ctx.runMutation(internal.gridData.insertCandidates, {
      candidates: selected.map(({ candidate, contextScore }) => ({
        rows: candidate.rows,
        cols: candidate.cols,
        validAnswers: candidate.validAnswers,
        score: candidate.score,
        difficulty: candidate.difficulty,
        contextScore,
        metadata: candidate.metadata,
      })),
    });

    console.log(
      `[generateDailyCandidates] Generated ${batch.length}, pool ${pool.length}, stored ${selected.length}`,
    );
  },
});

/**
 * Ensures today's grid exists, promoting the oldest approved candidate.
 * Falls back to auto-approving the best pending candidate if the queue is empty.
 * Cron: every day at 23:30 UTC.
 */
export const ensureTodayGrid = internalAction({
  args: {},
  handler: async (ctx) => {
    const today = todayUTC();

    const existing = await ctx.runQuery(internal.gridData.getTodayGridInternal);
    if (existing) {
      console.log(`[ensureTodayGrid] Grid for ${today} already exists`);
      return;
    }

    const approved = await ctx.runQuery(internal.gridData.getOldestApproved);
    if (approved) {
      await ctx.runMutation(internal.gridData.promoteCandidate, {
        candidateId: approved._id,
        date: today,
      });
      console.log(
        `[ensureTodayGrid] Promoted candidate ${approved._id} for ${today}`,
      );
      return;
    }

    // FALLBACK: auto-approve the best pending candidate
    const best = await ctx.runQuery(internal.gridData.getBestPending);
    if (!best) {
      console.warn(
        `[ensureTodayGrid] QUEUE EMPTY: no approved or pending candidates for ${today}`,
      );
      return;
    }
    console.warn(
      `[ensureTodayGrid] QUEUE EMPTY: auto-approved candidate ${best._id} for ${today}`,
    );
    await ctx.runMutation(internal.gridData.autoApproveThenPromote, {
      candidateId: best._id,
      date: today,
    });
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
 * Returns a scheduled grid + its linked candidate's cellMetrics and scores.
 * Used by the admin GridDetail panel to surface per-cell signals for a
 * grid that's already been promoted to the `grids` table.
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
    if (!candidate) {
      return {
        date: grid.date,
        rows: grid.rows,
        cols: grid.cols,
        validAnswers: grid.validAnswers,
        difficulty: grid.difficulty,
        qualityScore: null,
        contextScore: null,
        metadata: null,
      };
    }

    return {
      date: grid.date,
      rows: grid.rows,
      cols: grid.cols,
      validAnswers: grid.validAnswers,
      difficulty: grid.difficulty,
      qualityScore: candidate.score,
      contextScore: candidate.contextScore ?? null,
      metadata: candidate.metadata,
    };
  },
});

/**
 * Returns all grids scheduled from the past 30 days onwards.
 * Used by the admin calendar to visualise scheduled grids and their difficulties.
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

/** Returns a paginated list of candidates filtered by status. */
export const getCandidates = query({
  args: {
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("used"),
    ),
    limit: v.optional(v.number()),
    sortBy: v.optional(v.union(v.literal("score"), v.literal("date"))),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 20, 50);
    const sortBy = args.sortBy ?? "score";

    if (sortBy === "score") {
      return await ctx.db
        .query("gridCandidates")
        .withIndex("by_status_and_score", (q) => q.eq("status", args.status))
        .order("desc")
        .take(limit);
    }

    return await ctx.db
      .query("gridCandidates")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("desc")
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

/**
 * Approves a pending candidate. If scheduledDate is provided, immediately
 * creates the grids row for that date.
 */
export const approveCandidate = mutation({
  args: {
    candidateId: v.id("gridCandidates"),
    scheduledDate: v.optional(v.string()), // "YYYY-MM-DD"
    adminToken: v.string(),
  },
  handler: async (ctx, args) => {
    checkAdminToken(args.adminToken);

    const candidate = await ctx.db.get(args.candidateId);
    if (!candidate) throw new ConvexError("Candidate not found");
    if (candidate.status !== "pending")
      throw new ConvexError(`Candidate is already "${candidate.status}"`);

    const now = Date.now();

    if (args.scheduledDate) {
      // Check no grid exists for that date
      const existingGrid = await ctx.db
        .query("grids")
        .withIndex("by_date", (q) => q.eq("date", args.scheduledDate!))
        .unique();
      if (existingGrid)
        throw new ConvexError(
          `A grid already exists for ${args.scheduledDate}`,
        );

      // Create the grid row and mark the candidate as used
      await ctx.db.insert("grids", {
        date: args.scheduledDate,
        rows: candidate.rows,
        cols: candidate.cols,
        validAnswers: candidate.validAnswers,
        difficulty: candidate.difficulty,
        candidateId: args.candidateId,
      });

      await ctx.db.patch(args.candidateId, {
        status: "used",
        reviewedAt: now,
        usedAt: now,
      });
    } else {
      // Joins the FIFO queue — will be picked by ensureTodayGrid
      await ctx.db.patch(args.candidateId, {
        status: "approved",
        reviewedAt: now,
      });
    }
  },
});

/**
 * Déprogramme une grille d'une date donnée : supprime la ligne dans grids
 * et remet le candidat en statut "approved" pour qu'il puisse être replanifié.
 */
export const unscheduleGrid = mutation({
  args: {
    date: v.string(), // "YYYY-MM-DD"
    adminToken: v.string(),
  },
  handler: async (ctx, args) => {
    checkAdminToken(args.adminToken);

    const grid = await ctx.db
      .query("grids")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .unique();

    if (!grid) throw new ConvexError(`Aucune grille trouvée pour ${args.date}`);

    // Remettre le candidat dans la queue approuvée
    await ctx.db.patch(grid.candidateId, { status: "approved" });

    // Supprimer la grille planifiée
    await ctx.db.delete(grid._id);
  },
});

/** Rejects a pending candidate with a required reason. */
export const rejectCandidate = mutation({
  args: {
    candidateId: v.id("gridCandidates"),
    reason: v.string(),
    adminToken: v.string(),
  },
  handler: async (ctx, args) => {
    checkAdminToken(args.adminToken);

    const candidate = await ctx.db.get(args.candidateId);
    if (!candidate) throw new ConvexError("Candidate not found");
    if (candidate.status !== "pending")
      throw new ConvexError(`Candidate is already "${candidate.status}"`);

    await ctx.db.patch(args.candidateId, {
      status: "rejected",
      reviewedAt: Date.now(),
      rejectionReason: args.reason,
    });
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

    const tooEasyIncrement = args.rating === "too_easy" ? 1 : 0;
    const balancedIncrement = args.rating === "balanced" ? 1 : 0;
    const tooHardIncrement = args.rating === "too_hard" ? 1 : 0;
    const winsIncrement = args.won ? 1 : 0;
    const lossesIncrement = args.won ? 0 : 1;

    if (existing) {
      await ctx.db.patch(existing._id, {
        tooEasyCount: existing.tooEasyCount + tooEasyIncrement,
        balancedCount: existing.balancedCount + balancedIncrement,
        tooHardCount: existing.tooHardCount + tooHardIncrement,
        totalRatings: existing.totalRatings + 1,
        wins: existing.wins + winsIncrement,
        losses: existing.losses + lossesIncrement,
        totalLivesLeft: existing.totalLivesLeft + args.livesLeft,
        totalFilledCells: existing.totalFilledCells + args.filledCells,
        totalGuessesSubmitted:
          existing.totalGuessesSubmitted + args.guessesSubmitted,
      });
      return;
    }

    await ctx.db.insert("gridFeedback", {
      date: args.date,
      tooEasyCount: tooEasyIncrement,
      balancedCount: balancedIncrement,
      tooHardCount: tooHardIncrement,
      totalRatings: 1,
      wins: winsIncrement,
      losses: lossesIncrement,
      totalLivesLeft: args.livesLeft,
      totalFilledCells: args.filledCells,
      totalGuessesSubmitted: args.guessesSubmitted,
    });
  },
});

/**
 * Deletes candidate rows that are not referenced by any scheduled/past grid.
 * Useful after generator formula updates to rebuild the queue from scratch.
 */
export const purgeUnlinkedCandidates = mutation({
  args: {
    adminToken: v.string(),
  },
  handler: async (ctx, args) => {
    checkAdminToken(args.adminToken);

    const linkedIds = new Set<string>();
    const grids = await ctx.db.query("grids").take(500);
    for (const grid of grids) {
      linkedIds.add(grid.candidateId);
    }

    const candidates = await ctx.db.query("gridCandidates").take(500);
    let deleted = 0;
    let keptLinked = 0;

    for (const candidate of candidates) {
      if (linkedIds.has(candidate._id)) {
        keptLinked += 1;
        continue;
      }
      await ctx.db.delete(candidate._id);
      deleted += 1;
    }

    return {
      scannedCandidates: candidates.length,
      deleted,
      keptLinked,
    };
  },
});

// ─── Public action (manual trigger) ──────────────────────────────────────────

/**
 * Manually triggers candidate generation (e.g. from Convex dashboard).
 * Accepts an admin token for safety.
 */
export const triggerGeneration = action({
  args: { adminToken: v.string() },
  handler: async (ctx, args) => {
    checkAdminToken(args.adminToken);
    await ctx.runAction(internal.grids.generateDailyCandidates);
  },
});
