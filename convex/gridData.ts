/**
 * Internal Convex queries and mutations for grid data access.
 * Called from actions (grids.ts, seed.ts) via ctx.runQuery / ctx.runMutation.
 */
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalMutation, internalQuery } from "./_generated/server";
import {
  POOL_CLEANUP_BATCH_SIZE,
  POOL_GENERATION_LEASE_MS,
  POOL_LOW_THRESHOLD,
} from "./lib/gridConstants";
import { isPoolGenerationActive } from "./lib/poolReconciliation";

const POOL_STATE_KEY = "singleton" as const;
const MAX_GENERATION_SIZE = 2_000;

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

export async function getPoolState(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"poolState"> | null> {
  return await ctx.db
    .query("poolState")
    .withIndex("by_key", (q) => q.eq("key", POOL_STATE_KEY))
    .unique();
}

async function getCandidatesForGeneration(
  ctx: QueryCtx | MutationCtx,
  generationId: string | null,
  status: "available" | "used",
  limit?: number,
): Promise<Doc<"gridCandidates">[]> {
  const query = ctx.db
    .query("gridCandidates")
    .withIndex("by_generation_id_and_status", (q) =>
      q.eq("generationId", generationId ?? undefined).eq("status", status),
    );
  return await query.take(limit ?? MAX_GENERATION_SIZE);
}

/**
 * Candidates du pool actif. Sans pointeur, seul le stock legacy (generationId
 * absent) est visible ; une génération en construction reste donc inactive.
 */
export async function getActivePoolCandidatesByStatus(
  ctx: QueryCtx | MutationCtx,
  status: "available" | "used",
): Promise<Doc<"gridCandidates">[]> {
  const state = await getPoolState(ctx);
  return await getCandidatesForGeneration(
    ctx,
    state?.activeGenerationId ?? null,
    status,
  );
}

export async function isCandidateInActivePool(
  ctx: QueryCtx | MutationCtx,
  candidate: Doc<"gridCandidates">,
): Promise<boolean> {
  const state = await getPoolState(ctx);
  return isPoolGenerationActive(
    state?.activeGenerationId ?? null,
    candidate.generationId,
  );
}

// ─── Internal queries ─────────────────────────────────────────────────────────

/** True if at least one published grid exists (idempotence guard for seed). */
export const hasAnyGrid = internalQuery({
  args: {},
  returns: v.boolean(),
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
    return await getActivePoolCandidatesByStatus(ctx, "available");
  },
});

/** True if a grid already exists for the given date. */
export const hasGridForDate = internalQuery({
  args: { date: v.string() },
  returns: v.boolean(),
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

/**
 * Pages de grilles strictement postérieures à `afterDate`, avec leur snapshot
 * de réponses. L'action de réconciliation lit toutes les pages avant d'écrire,
 * afin que ses remplacements ne déplacent pas le curseur en cours de parcours.
 */
export const paginateScheduledGridContentAfterDate = internalQuery({
  args: {
    afterDate: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("grids")
      .withIndex("by_date", (q) => q.gt("date", args.afterDate))
      .order("asc")
      .paginate(args.paginationOpts);
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (grid) => ({
          date: grid.date,
          candidateId: grid.candidateId,
          rows: grid.rows,
          cols: grid.cols,
          validAnswers: (await getGridAnswers(ctx, grid)) ?? {},
        })),
      ),
    };
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
});

/**
 * Inserts a grid into the pool with status="available".
 * Crée aussi le doc satellite `gridAnswers` (1-to-1, attaché au candidateId).
 */
export const insertPoolGrid = internalMutation({
  args: {
    generationId: v.optional(v.string()),
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
      generationId: args.generationId,
    });
    await ctx.db.insert("gridAnswers", {
      candidateId,
      validAnswers: args.validAnswers,
    });
    return candidateId;
  },
});

/**
 * Tente de prendre le lease de génération. Le test de stock est borné au seuil
 * utile : au-delà de POOL_LOW_THRESHOLD, connaître le total exact n'apporte rien.
 */
export const claimPoolGeneration = internalMutation({
  args: { jobId: v.string(), force: v.boolean() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const state = await getPoolState(ctx);
    if (state?.jobId && (state.leaseUntil ?? 0) > now) {
      return { acquired: false as const, reason: "leased" as const };
    }

    const activeGenerationId = state?.activeGenerationId ?? null;
    const active = await getCandidatesForGeneration(
      ctx,
      activeGenerationId,
      "available",
      POOL_LOW_THRESHOLD,
    );
    // Sans pointeur, un stock legacy non vide reste la source active jusqu'au
    // refresh admin explicite. Le cron ne devient ainsi jamais une migration.
    let skipReason: "healthy" | "legacy_migration_required" | null = null;
    if (!args.force && activeGenerationId === null && active.length > 0) {
      skipReason = "legacy_migration_required";
    } else if (!args.force && active.length >= POOL_LOW_THRESHOLD) {
      skipReason = "healthy";
    }
    if (skipReason) {
      if (state?.jobId) {
        await ctx.db.patch(state._id, {
          jobId: undefined,
          leaseUntil: undefined,
        });
        await ctx.scheduler.runAfter(
          0,
          internal.gridData.deleteInactiveGenerationBatch,
          { generationId: state.jobId },
        );
      }
      return { acquired: false as const, reason: skipReason };
    }

    const staleGenerationId = state?.jobId;
    if (state) {
      await ctx.db.patch(state._id, {
        jobId: args.jobId,
        leaseUntil: now + POOL_GENERATION_LEASE_MS,
      });
    } else {
      await ctx.db.insert("poolState", {
        key: POOL_STATE_KEY,
        jobId: args.jobId,
        leaseUntil: now + POOL_GENERATION_LEASE_MS,
      });
    }

    return staleGenerationId
      ? {
          acquired: true as const,
          previousActiveGenerationId: activeGenerationId,
          staleGenerationId,
        }
      : {
          acquired: true as const,
          previousActiveGenerationId: activeGenerationId,
        };
  },
});

/** Bascule atomiquement le pointeur une fois la génération complète. */
export const activatePoolGeneration = internalMutation({
  args: { jobId: v.string(), expectedCount: v.number() },
  returns: v.null(),
  handler: async (ctx, args): Promise<void> => {
    const state = await getPoolState(ctx);
    if (!state || state.jobId !== args.jobId) {
      throw new Error("Pool generation lease lost before activation");
    }
    if (
      !Number.isInteger(args.expectedCount) ||
      args.expectedCount < POOL_LOW_THRESHOLD ||
      args.expectedCount > MAX_GENERATION_SIZE
    ) {
      throw new Error("Invalid generated pool size");
    }
    const generated = await getCandidatesForGeneration(
      ctx,
      args.jobId,
      "available",
      args.expectedCount + 1,
    );
    if (generated.length !== args.expectedCount) {
      throw new Error("Generated pool is incomplete");
    }

    const previousActiveGenerationId = state.activeGenerationId ?? null;
    await ctx.db.patch(state._id, {
      activeGenerationId: args.jobId,
      jobId: undefined,
      leaseUntil: undefined,
    });
    if (previousActiveGenerationId !== args.jobId) {
      await ctx.scheduler.runAfter(
        0,
        internal.gridData.deleteInactiveGenerationBatch,
        { generationId: previousActiveGenerationId },
      );
    }
  },
});

/** Libère uniquement le lease encore détenu par ce job. */
export const releasePoolGeneration = internalMutation({
  args: { jobId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const state = await getPoolState(ctx);
    if (!state || state.jobId !== args.jobId) return false;
    await ctx.db.patch(state._id, {
      jobId: undefined,
      leaseUntil: undefined,
    });
    return true;
  },
});

/**
 * Nettoyage batché d'une génération désormais inactive, satellite compris.
 * `null` représente le pool legacy. Le garde interdit de supprimer le pointeur
 * actif, même si un ancien job de cleanup est rejoué tardivement.
 */
export const deleteInactiveGenerationBatch = internalMutation({
  args: { generationId: v.union(v.string(), v.null()) },
  returns: v.number(),
  handler: async (ctx, args): Promise<number> => {
    const state = await getPoolState(ctx);
    if ((state?.activeGenerationId ?? null) === args.generationId) return 0;

    const docs = await getCandidatesForGeneration(
      ctx,
      args.generationId,
      "available",
      POOL_CLEANUP_BATCH_SIZE,
    );
    for (const doc of docs) {
      const satellite = await ctx.db
        .query("gridAnswers")
        .withIndex("by_candidate", (q) => q.eq("candidateId", doc._id))
        .unique();
      if (satellite) await ctx.db.delete(satellite._id);
      await ctx.db.delete(doc._id);
    }
    if (docs.length === POOL_CLEANUP_BATCH_SIZE) {
      await ctx.scheduler.runAfter(
        0,
        internal.gridData.deleteInactiveGenerationBatch,
        args,
      );
    }
    return docs.length;
  },
});
