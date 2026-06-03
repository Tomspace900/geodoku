/**
 * Internal Convex queries and mutations for grid data access.
 * Called from actions (grids.ts, seed.ts) via ctx.runQuery / ctx.runMutation.
 */
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalMutation, internalQuery } from "./_generated/server";

// ─── Helpers (shared across queries/mutations) ───────────────────────────────

/** Fetch validAnswers for a candidate via the satellite table. */
export async function getCandidateAnswers(
  ctx: QueryCtx | MutationCtx,
  candidateId: Id<"gridCandidates">,
): Promise<Record<string, string[]> | null> {
  const satellite = await ctx.db
    .query("gridAnswers")
    .withIndex("by_candidate", (q) => q.eq("candidateId", candidateId))
    .unique();
  return satellite?.validAnswers ?? null;
}

/**
 * Resolve validAnswers for a published grid. The satellite is keyed on
 * candidateId, so we always go through the candidate.
 */
export async function getGridAnswers(
  ctx: QueryCtx | MutationCtx,
  grid: Doc<"grids">,
): Promise<Record<string, string[]> | null> {
  return await getCandidateAnswers(ctx, grid.candidateId);
}

// ─── Internal queries ─────────────────────────────────────────────────────────

/** True if at least one published grid exists (idempotence guard for seed). */
export const hasAnyGrid = internalQuery({
  args: {},
  handler: async (ctx) => {
    return (await ctx.db.query("grids").first()) !== null;
  },
});

/**
 * Returns all available pool grids (feeds the scheduler).
 *
 * Le doc `gridCandidates` est désormais maigre (validAnswers vit dans
 * `gridAnswers`), donc cette query reste correcte sans changement de code.
 */
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

/** Internal query exposing the satellite fetch (used by actions). */
export const getCandidateAnswersById = internalQuery({
  args: { candidateId: v.id("gridCandidates") },
  handler: async (ctx, args) => {
    return await getCandidateAnswers(ctx, args.candidateId);
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

/**
 * Inserts a grid into the pool with status="available".
 * Crée aussi le doc satellite `gridAnswers` (1-to-1, attaché au candidateId).
 */
export const insertPoolGrid = internalMutation({
  args: {
    rows: v.array(v.string()),
    cols: v.array(v.string()),
    validAnswers: v.record(v.string(), v.array(v.string())),
    metadata: metadataValidator,
  },
  handler: async (ctx, args) => {
    const candidateId = await ctx.db.insert("gridCandidates", {
      rows: args.rows,
      cols: args.cols,
      metadata: args.metadata,
      status: "available",
    });
    await ctx.db.insert("gridAnswers", {
      candidateId,
      validAnswers: args.validAnswers,
    });
    return candidateId;
  },
});

/**
 * Supprime un batch de candidates available (pagination pour refreshPool).
 * Supprime aussi le satellite `gridAnswers` lié.
 */
export const deleteAvailableCandidatesBatch = internalMutation({
  args: { limit: v.number() },
  handler: async (ctx, { limit }) => {
    const docs = await ctx.db
      .query("gridCandidates")
      .withIndex("by_status", (q) => q.eq("status", "available"))
      .take(limit);
    for (const doc of docs) {
      const satellite = await ctx.db
        .query("gridAnswers")
        .withIndex("by_candidate", (q) => q.eq("candidateId", doc._id))
        .unique();
      if (satellite) await ctx.db.delete(satellite._id);
      await ctx.db.delete(doc._id);
    }
    return docs.length;
  },
});
