/**
 * Internal Convex queries and mutations for grid data access.
 * Called from actions (grids.ts) via ctx.runQuery / ctx.runMutation.
 */
import { ConvexError, v } from "convex/values";
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

// ─── Internal mutations ───────────────────────────────────────────────────────

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
        metadata: v.object({
          minCellSize: v.number(),
          maxCellSize: v.number(),
          avgCellSize: v.number(),
          categoryCount: v.number(),
          avgObscurity: v.number(),
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

    await ctx.db.patch(args.candidateId, {
      status: "used",
      usedAt: Date.now(),
    });
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
