/**
 * One-shot migration helpers for the validAnswers split (widen → narrow).
 *
 * Backfills `gridAnswers` satellites for existing `gridCandidates` docs that
 * still embed `validAnswers` inline, and dénormalise `countryPool` on `grids`.
 *
 * After 100 % migrated, run the narrow step (retirer `validAnswers` du schéma
 * de gridCandidates et grids, rendre countryPool obligatoire).
 *
 * Usage prod : action `migrations.runBackfill` avec ADMIN_TOKEN.
 */
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  type MutationCtx,
  action,
  internalMutation,
} from "./_generated/server";
import { checkAdminToken } from "./auth";

const BACKFILL_BATCH_SIZE = 256;

type BackfillCandidatesResult = {
  scanned: number;
  satellitesCreated: number;
  inlineCleared: number;
  continueCursor: string;
  isDone: boolean;
};

type BackfillGridsResult = {
  scanned: number;
  countryPoolPatched: number;
  inlineCleared: number;
  continueCursor: string;
  isDone: boolean;
};

async function ensureCandidateSatellite(
  ctx: MutationCtx,
  candidateId: Id<"gridCandidates">,
  validAnswers: Record<string, string[]>,
): Promise<boolean> {
  const existing = await ctx.db
    .query("gridAnswers")
    .withIndex("by_candidate", (q) => q.eq("candidateId", candidateId))
    .unique();
  if (existing) return false;
  await ctx.db.insert("gridAnswers", { candidateId, validAnswers });
  return true;
}

/** Backfill paginé : gridCandidates → gridAnswers + clear inline. */
export const backfillCandidatesBatch = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
    limit: v.number(),
  },
  handler: async (
    ctx,
    { cursor, limit },
  ): Promise<BackfillCandidatesResult> => {
    const page = await ctx.db
      .query("gridCandidates")
      .paginate({ numItems: limit, cursor });
    let satellitesCreated = 0;
    let inlineCleared = 0;
    for (const candidate of page.page) {
      if (candidate.validAnswers) {
        const created = await ensureCandidateSatellite(
          ctx,
          candidate._id,
          candidate.validAnswers,
        );
        if (created) satellitesCreated += 1;
        await ctx.db.patch(candidate._id, { validAnswers: undefined });
        inlineCleared += 1;
      }
    }
    return {
      scanned: page.page.length,
      satellitesCreated,
      inlineCleared,
      continueCursor: page.continueCursor,
      isDone: page.isDone,
    };
  },
});

/** Backfill paginé : grids → countryPool dénormalisé + clear inline validAnswers. */
export const backfillGridsBatch = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
    limit: v.number(),
  },
  handler: async (ctx, { cursor, limit }): Promise<BackfillGridsResult> => {
    const page = await ctx.db
      .query("grids")
      .paginate({ numItems: limit, cursor });
    let countryPoolPatched = 0;
    let inlineCleared = 0;
    for (const grid of page.page) {
      const patch: {
        countryPool?: string[];
        validAnswers?: Record<string, string[]> | undefined;
      } = {};

      if (!grid.countryPool) {
        // Source de vérité : metadata.countryPool de la candidate liée
        const candidate = await ctx.db.get(grid.candidateId);
        const fromMeta = candidate?.metadata.countryPool;
        const fromInline = grid.validAnswers
          ? Array.from(new Set(Object.values(grid.validAnswers).flat()))
          : null;
        const countryPool = fromMeta ?? fromInline ?? [];
        patch.countryPool = countryPool;
        countryPoolPatched += 1;
      }

      if (grid.validAnswers) {
        // S'assurer que la candidate satellite porte les answers (cas où la
        // grid existait avant que la candidate ait été backfillée).
        await ensureCandidateSatellite(
          ctx,
          grid.candidateId,
          grid.validAnswers,
        );
        patch.validAnswers = undefined;
        inlineCleared += 1;
      }

      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(grid._id, patch);
      }
    }
    return {
      scanned: page.page.length,
      countryPoolPatched,
      inlineCleared,
      continueCursor: page.continueCursor,
      isDone: page.isDone,
    };
  },
});

/**
 * Action admin : run backfill complet (candidates puis grids).
 * Idempotent : skip les docs déjà migrés.
 */
export const runBackfill = action({
  args: { adminToken: v.string() },
  handler: async (
    ctx,
    args,
  ): Promise<{
    candidates: {
      scanned: number;
      satellitesCreated: number;
      inlineCleared: number;
    };
    grids: {
      scanned: number;
      countryPoolPatched: number;
      inlineCleared: number;
    };
  }> => {
    checkAdminToken(args.adminToken);

    const candidates = {
      scanned: 0,
      satellitesCreated: 0,
      inlineCleared: 0,
    };
    {
      let cursor: string | null = null;
      for (;;) {
        const batch: BackfillCandidatesResult = await ctx.runMutation(
          internal.migrations.backfillCandidatesBatch,
          { cursor, limit: BACKFILL_BATCH_SIZE },
        );
        candidates.scanned += batch.scanned;
        candidates.satellitesCreated += batch.satellitesCreated;
        candidates.inlineCleared += batch.inlineCleared;
        if (batch.isDone) break;
        cursor = batch.continueCursor;
      }
    }

    const grids = {
      scanned: 0,
      countryPoolPatched: 0,
      inlineCleared: 0,
    };
    {
      let cursor: string | null = null;
      for (;;) {
        const batch: BackfillGridsResult = await ctx.runMutation(
          internal.migrations.backfillGridsBatch,
          { cursor, limit: BACKFILL_BATCH_SIZE },
        );
        grids.scanned += batch.scanned;
        grids.countryPoolPatched += batch.countryPoolPatched;
        grids.inlineCleared += batch.inlineCleared;
        if (batch.isDone) break;
        cursor = batch.continueCursor;
      }
    }

    return { candidates, grids };
  },
});
