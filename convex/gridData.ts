/**
 * Internal Convex queries and mutations for grid data access.
 * Called from actions (grids.ts, seed.ts) via ctx.runQuery / ctx.runMutation.
 */
import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

function todayUTC(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ─── Internal queries ─────────────────────────────────────────────────────────

/** Returns the N most-recently published grids (ordered by date desc). */
export const getRecentPublishedGrids = internalQuery({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
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

/** True if at least one published grid exists (idempotence guard for seed). */
export const hasAnyGrid = internalQuery({
  args: {},
  handler: async (ctx) => {
    return (await ctx.db.query("grids").first()) !== null;
  },
});

/** Returns all available pool grids (feeds the scheduler). */
export const getAvailablePoolGrids = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("gridCandidates")
      .withIndex("by_status", (q) => q.eq("status", "available"))
      .collect();
  },
});

/** True if a grid already exists for the given date. */
export const hasGridForDate = internalQuery({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("grids")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .unique();
    return existing !== null;
  },
});

// ─── Internal mutations ───────────────────────────────────────────────────────

const metadataValidator = v.object({
  seedConstraint: v.string(),
  constraintIds: v.array(v.string()),
  categories: v.array(v.string()),
  avgCellSize: v.number(),
  minCellSize: v.number(),
  countryPool: v.array(v.string()),
  difficultyEstimate: v.number(),
  difficultyTags: v.object({
    easy: v.number(),
    medium: v.number(),
    hard: v.number(),
  }),
  cellDifficulties: v.array(v.number()),
});

/** Inserts a grid into the pool with status="available". Returns the new Id. */
export const insertPoolGrid = internalMutation({
  args: {
    rows: v.array(v.string()),
    cols: v.array(v.string()),
    validAnswers: v.record(v.string(), v.array(v.string())),
    metadata: metadataValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("gridCandidates", {
      ...args,
      status: "available",
    });
  },
});

/** Marks a pool grid as used for a specific date. */
export const markCandidateUsed = internalMutation({
  args: {
    candidateId: v.id("gridCandidates"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.candidateId, {
      status: "used",
      usedAt: Date.now(),
      usedForDate: args.date,
    });
  },
});

/** Inserts a row into the grids table (the published daily grid). */
export const insertGrid = internalMutation({
  args: {
    date: v.string(),
    rows: v.array(v.string()),
    cols: v.array(v.string()),
    validAnswers: v.record(v.string(), v.array(v.string())),
    difficulty: v.number(),
    candidateId: v.id("gridCandidates"),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("grids", args);
  },
});
