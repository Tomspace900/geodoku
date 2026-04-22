/**
 * Internal Convex queries and mutations for grid data access.
 * Called from actions (grids.ts) via ctx.runQuery / ctx.runMutation.
 */
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation, internalQuery } from "./_generated/server";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayUTC(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ─── Internal queries ─────────────────────────────────────────────────────────

/** Returns rows+cols of all existing candidates (any status) — used for duplicate checking. */
export const getAllCandidatesForCheck = internalQuery({
  args: {},
  handler: async (ctx): Promise<{ rows: string[]; cols: string[] }[]> => {
    const candidates = await ctx.db.query("gridCandidates").take(500);
    return candidates.map((c) => ({ rows: c.rows, cols: c.cols }));
  },
});

/** Returns rows+cols of all published grids — used for duplicate checking. */
export const getAllGridsForCheck = internalQuery({
  args: {},
  handler: async (ctx): Promise<{ rows: string[]; cols: string[] }[]> => {
    const grids = await ctx.db.query("grids").take(500);
    return grids.map((g) => ({ rows: g.rows, cols: g.cols }));
  },
});

/**
 * Returns the N most-recently published grids (ordered by date desc).
 * Feeds phase 2 contextual scoring.
 */
export const getRecentPublishedGrids = internalQuery({
  args: { limit: v.number() },
  handler: async (
    ctx,
    args,
  ): Promise<
    {
      rows: string[];
      cols: string[];
      validAnswers: Record<string, string[]>;
    }[]
  > => {
    const grids = await ctx.db
      .query("grids")
      .withIndex("by_date")
      .order("desc")
      .take(args.limit);
    return grids.map((g) => ({
      rows: g.rows,
      cols: g.cols,
      validAnswers: g.validAnswers,
    }));
  },
});

/** Returns today's grid doc, or null. */
export const getTodayGridInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const today = todayUTC();
    return await ctx.db
      .query("grids")
      .withIndex("by_date", (q) => q.eq("date", today))
      .unique();
  },
});

/** Returns the oldest approved (FIFO queue), or null. */
export const getOldestApproved = internalQuery({
  args: {},
  handler: async (ctx) => {
    const candidates = await ctx.db
      .query("gridCandidates")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .order("asc")
      .take(1);
    return candidates[0] ?? null;
  },
});

/** Returns the pending candidate with the best score, or null. */
export const getBestPending = internalQuery({
  args: {},
  handler: async (ctx) => {
    const candidates = await ctx.db
      .query("gridCandidates")
      .withIndex("by_status_and_score", (q) => q.eq("status", "pending"))
      .order("desc")
      .take(1);
    return candidates[0] ?? null;
  },
});

/** True if at least one published grid exists (idempotence guard for seed). */
export const hasAnyGrid = internalQuery({
  args: {},
  handler: async (ctx) => {
    const first = await ctx.db.query("grids").first();
    return first !== null;
  },
});

// ─── Internal mutations ───────────────────────────────────────────────────────

/**
 * Inserts a `grids` row from a candidate and marks the candidate as used.
 * No-op if a grid already exists for that date (idempotent).
 */
async function promoteGridFromCandidate(
  ctx: MutationCtx,
  candidateId: Id<"gridCandidates">,
  date: string,
): Promise<boolean> {
  const existing = await ctx.db
    .query("grids")
    .withIndex("by_date", (q) => q.eq("date", date))
    .unique();
  if (existing) return false;

  const candidate = await ctx.db.get(candidateId);
  if (!candidate) throw new ConvexError(`Candidate ${candidateId} not found`);

  await ctx.db.insert("grids", {
    date,
    rows: candidate.rows,
    cols: candidate.cols,
    validAnswers: candidate.validAnswers,
    difficulty: candidate.difficulty,
    candidateId,
  });

  await ctx.db.patch(candidateId, {
    status: "used",
    usedAt: Date.now(),
  });
  return true;
}

/** Inserts a batch of generated candidates with status="pending". */
export const insertCandidates = internalMutation({
  args: {
    candidates: v.array(
      v.object({
        rows: v.array(v.string()),
        cols: v.array(v.string()),
        validAnswers: v.record(v.string(), v.array(v.string())),
        score: v.number(),
        difficulty: v.number(),
        contextScore: v.optional(v.number()),
        metadata: v.object({
          minCellSize: v.number(),
          maxCellSize: v.number(),
          avgCellSize: v.number(),
          categoryCount: v.number(),
          avgNotoriety: v.number(),
          obviousCellCount: v.number(),
          criteriaOverlapScore: v.number(),
          constraintHardnessMean: v.number(),
          maxCellRisk: v.number(),
          avgCellRisk: v.number(),
          easyConstraintCount: v.number(),
          hardConstraintCount: v.number(),
          cellMetrics: v.array(
            v.object({
              cellKey: v.string(),
              solutionCount: v.number(),
              popularCount: v.number(),
              avgPopularity: v.number(),
            }),
          ),
        }),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const candidate of args.candidates) {
      await ctx.db.insert("gridCandidates", {
        ...candidate,
        status: "pending",
        generatedAt: now,
        reviewedAt: null,
        rejectionReason: null,
      });
    }
  },
});

/**
 * Atomically creates a grids row and marks the candidate as "used".
 * No-ops if a grid already exists for that date (idempotent).
 */
export const promoteCandidate = internalMutation({
  args: {
    candidateId: v.id("gridCandidates"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    await promoteGridFromCandidate(ctx, args.candidateId, args.date);
  },
});

/**
 * Promotes the best pending candidate (by score) to a given date.
 * Used by historical seed; throws if no pending candidate exists.
 */
export const promoteBestPendingForDate = internalMutation({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const candidates = await ctx.db
      .query("gridCandidates")
      .withIndex("by_status_and_score", (q) => q.eq("status", "pending"))
      .order("desc")
      .take(1);
    const best = candidates[0];
    if (!best) {
      throw new ConvexError("No pending candidate to promote");
    }
    const promoted = await promoteGridFromCandidate(ctx, best._id, args.date);
    if (!promoted) {
      throw new ConvexError(
        `A grid already exists for ${args.date}; cannot promote pending candidate.`,
      );
    }
    return {
      candidateId: best._id,
      score: best.score,
      contextScore: best.contextScore ?? null,
    };
  },
});

/** Deletes all pending candidates (internal — used by seed action). */
export const purgeAllPendingCandidatesInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    const pending = await ctx.db
      .query("gridCandidates")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    for (const doc of pending) {
      await ctx.db.delete(doc._id);
    }
    return { deleted: pending.length };
  },
});

/**
 * Auto-approves a pending candidate and immediately promotes it to grids.
 * Used as emergency fallback when the approved queue is empty.
 */
export const autoApproveThenPromote = internalMutation({
  args: {
    candidateId: v.id("gridCandidates"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("grids")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .unique();
    if (existing) return;

    const candidate = await ctx.db.get(args.candidateId);
    if (!candidate)
      throw new ConvexError(`Candidate ${args.candidateId} not found`);

    await ctx.db.insert("grids", {
      date: args.date,
      rows: candidate.rows,
      cols: candidate.cols,
      validAnswers: candidate.validAnswers,
      difficulty: candidate.difficulty,
      candidateId: args.candidateId,
    });

    const now = Date.now();
    await ctx.db.patch(args.candidateId, {
      status: "used",
      reviewedAt: now,
      usedAt: now,
    });
  },
});
