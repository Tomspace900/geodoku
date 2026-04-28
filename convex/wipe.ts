/**
 * Dev-only helpers for clearing tuning iteration data.
 *
 * Usage : `pnpm wipe:db` then `pnpm seed:grids` (seed refuses non-empty `grids`).
 *
 * The action is internal and paginates deletes to avoid Convex transaction
 * limits on tables with thousands of documents (e.g. `guesses`).
 */
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";

const DELETE_BATCH_SIZE = 512;

type WipeTable =
  | "grids"
  | "gridCandidates"
  | "guesses"
  | "dailyStats"
  | "gridFeedback";

const WIPE_TABLES: WipeTable[] = [
  "grids",
  "gridCandidates",
  "guesses",
  "dailyStats",
  "gridFeedback",
];

export const deleteBatch = internalMutation({
  args: {
    table: v.union(
      v.literal("grids"),
      v.literal("gridCandidates"),
      v.literal("guesses"),
      v.literal("dailyStats"),
      v.literal("gridFeedback"),
    ),
    limit: v.number(),
  },
  handler: async (ctx, { table, limit }) => {
    const docs = await ctx.db.query(table).take(limit);
    for (const doc of docs) {
      await ctx.db.delete(doc._id);
    }
    return docs.length;
  },
});

export const wipeAllData = internalAction({
  args: {},
  handler: async (ctx) => {
    const summary: Record<string, number> = {};
    for (const table of WIPE_TABLES) {
      let totalDeleted = 0;
      for (;;) {
        const deleted = await ctx.runMutation(internal.wipe.deleteBatch, {
          table,
          limit: DELETE_BATCH_SIZE,
        });
        totalDeleted += deleted;
        if (deleted < DELETE_BATCH_SIZE) break;
      }
      summary[table] = totalDeleted;
      console.log(`[wipeAllData] ${table}: ${totalDeleted} docs deleted`);
    }
    return summary;
  },
});
