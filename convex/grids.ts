import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalAction, mutation, query } from "./_generated/server";
import { generateBatch } from "./lib/gridGenerator";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayUTC(): string {
  const d = new Date();
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
 * Generates 5 new grid candidates and saves them as "pending".
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
    const batch = generateBatch(5, allExisting);

    if (batch.length === 0) {
      console.log(
        "[generateDailyCandidates] No new candidates generated (space saturated?)",
      );
      return;
    }

    await ctx.runMutation(internal.gridData.insertCandidates, {
      candidates: batch.map((c) => ({
        rows: c.rows,
        cols: c.cols,
        validAnswers: c.validAnswers,
        score: c.score,
        difficulty: c.difficulty,
        metadata: c.metadata,
      })),
    });

    console.log(
      `[generateDailyCandidates] Inserted ${batch.length} candidates`,
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

/** Returns queue health stats for the admin dashboard. */
export const getQueueStats = query({
  args: {},
  handler: async (ctx) => {
    const today = todayUTC();

    const pending = await ctx.db
      .query("gridCandidates")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(500);

    const approved = await ctx.db
      .query("gridCandidates")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .take(500);

    const futureGrids = await ctx.db
      .query("grids")
      .withIndex("by_date", (q) => q.gt("date", today))
      .take(500);

    const approvedQueued = approved.length;
    const scheduledFuture = futureGrids.length;
    const daysOfRunway = approvedQueued + scheduledFuture;

    return {
      pending: pending.length,
      approvedQueued,
      scheduledFuture,
      daysOfRunway,
    };
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
