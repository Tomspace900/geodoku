/**
 * Planification quotidienne des grilles — en **MUTATION** et dans un **module
 * léger** (aucun import du générateur ni de countries.json).
 *
 * C'est le fix de l'incident « no available workers » : le cron ne réveille plus
 * un worker d'**action** dont le module lourd (countries.json + générateur) met
 * trop de temps à cold-starter sur un déploiement idle. Ici, une mutation
 * triviale à charger, dans le pool de mutations. Le hot-path n'a besoin que de
 * `selectNextGrid` (léger) + un patch/insert transactionnel.
 *
 * Si le pool est vide (rare), on planifie le workflow lourd
 * `reconcilePoolAndSchedule` — jamais de génération inline ici.
 */
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation } from "./_generated/server";
import {
  getActivePoolCandidatesByStatus,
  isCandidateInActivePool,
} from "./gridData";
import { todayUTC, tomorrowUTC } from "./lib/dates";
import { KNOWN_CONSTRAINT_WINDOW } from "./lib/gridConstants";
import { selectNextGrid } from "./lib/gridScheduler";

/**
 * Assigne la grille d'une date depuis le pool si elle n'existe pas encore.
 * Idempotent (early-return si déjà présente), atomique (patch + insert dans la
 * même transaction). Retourne `true` si une grille existe/est créée pour la
 * date, `false` si le pool actif est vide.
 */
async function assignForDate(ctx: MutationCtx, date: string): Promise<boolean> {
  const existing = await ctx.db
    .query("grids")
    .withIndex("by_date", (q) => q.eq("date", date))
    .unique();
  if (existing) return true;

  const available = await getActivePoolCandidatesByStatus(ctx, "available");
  const recent = await ctx.db
    .query("grids")
    .withIndex("by_date", (q) => q.lt("date", date))
    .order("desc")
    .take(KNOWN_CONSTRAINT_WINDOW);

  const pool = available.map((g) => ({
    _id: g._id as string,
    rows: g.rows,
    cols: g.cols,
    metadata: g.metadata,
  }));
  const recentForScheduler = recent.map((g) => ({
    rows: g.rows,
    cols: g.cols,
  }));

  const selected = selectNextGrid(pool, recentForScheduler);
  if (!selected) {
    console.error(`[CRITICAL] active pool empty for ${date}`);
    return false;
  }

  const candidateId = selected.grid._id as Id<"gridCandidates">;
  await ctx.db.patch(candidateId, {
    status: "used",
    usedAt: Date.now(),
    usedForDate: date,
  });
  await ctx.db.insert("grids", {
    date,
    rows: selected.grid.rows,
    cols: selected.grid.cols,
    countryPool: selected.grid.metadata.countryPool,
    candidateId,
  });
  return true;
}

/** Cron target : aujourd'hui + demain. Idempotent et léger. */
export const ensureDailyGrids = internalMutation({
  args: {},
  handler: async (ctx) => {
    const todayAssigned = await assignForDate(ctx, todayUTC());
    const tomorrowAssigned = await assignForDate(ctx, tomorrowUTC());
    if (!todayAssigned || !tomorrowAssigned) {
      await ctx.scheduler.runAfter(
        0,
        internal.grids.reconcilePoolAndSchedule,
        {},
      );
    }
  },
});

/** Assigne une date précise (override admin / seed). */
export const assignGridForDate = internalMutation({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const ok = await assignForDate(ctx, args.date);
    if (!ok) {
      await ctx.scheduler.runAfter(
        0,
        internal.grids.reconcilePoolAndSchedule,
        {},
      );
    }
    return ok ? { date: args.date } : null;
  },
});

/**
 * Programme une candidate **précise** sur une date future (override admin
 * « Planifier » depuis l'aperçu prédit). Contrairement à `assignGridForDate`,
 * qui laisse le scheduler choisir, on verrouille la candidate affichée
 * (WYSIWYG). Idempotent : early-return si la date est déjà programmée.
 */
export const scheduleCandidateForDate = internalMutation({
  args: { date: v.string(), candidateId: v.id("gridCandidates") },
  handler: async (ctx, args) => {
    if (args.date < todayUTC()) {
      throw new ConvexError("Cannot schedule a past grid");
    }
    const existing = await ctx.db
      .query("grids")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .unique();
    if (existing) return null;

    const candidate = await ctx.db.get(args.candidateId);
    if (
      // biome-ignore lint/complexity/useOptionalChain: le `!candidate` narrow le type pour isCandidateInActivePool juste en dessous
      !candidate ||
      candidate.status !== "available" ||
      !(await isCandidateInActivePool(ctx, candidate))
    ) {
      throw new ConvexError("Candidate is not available");
    }

    await ctx.db.patch(args.candidateId, {
      status: "used",
      usedAt: Date.now(),
      usedForDate: args.date,
    });
    await ctx.db.insert("grids", {
      date: args.date,
      rows: candidate.rows,
      cols: candidate.cols,
      countryPool: candidate.metadata.countryPool,
      candidateId: args.candidateId,
    });
    return { date: args.date };
  },
});

/** Supprime une candidate du pool ainsi que son satellite `gridAnswers` (1-to-1). */
async function deleteCandidateAndSatellite(
  ctx: MutationCtx,
  candidateId: Id<"gridCandidates">,
): Promise<void> {
  const satellite = await ctx.db
    .query("gridAnswers")
    .withIndex("by_candidate", (q) => q.eq("candidateId", candidateId))
    .unique();
  if (satellite) await ctx.db.delete(satellite._id);
  await ctx.db.delete(candidateId);
}

/** Ne supprime jamais le snapshot d'une candidate encore publiée ailleurs. */
async function deleteCandidateAndSatelliteIfUnreferenced(
  ctx: MutationCtx,
  candidateId: Id<"gridCandidates">,
): Promise<boolean> {
  const remainingGrid = await ctx.db
    .query("grids")
    .withIndex("by_candidate_id", (q) => q.eq("candidateId", candidateId))
    .first();
  if (remainingGrid) return false;
  await deleteCandidateAndSatellite(ctx, candidateId);
  return true;
}

/**
 * Remplace une grille future dont le snapshot a été déclaré incompatible par
 * l'action de contrôle. Le candidateId attendu protège contre une modification
 * admin concurrente ; toute absence de remplaçante annule la transaction.
 */
export const replaceFutureGridCandidate = internalMutation({
  args: {
    date: v.string(),
    expectedCandidateId: v.id("gridCandidates"),
  },
  handler: async (ctx, args) => {
    if (args.date <= todayUTC()) {
      throw new ConvexError("Cannot replace a past or active grid");
    }
    const existing = await ctx.db
      .query("grids")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .unique();
    if (!existing || existing.candidateId !== args.expectedCandidateId) {
      return { kind: "changed" as const };
    }

    await ctx.db.delete(existing._id);
    await deleteCandidateAndSatelliteIfUnreferenced(ctx, existing.candidateId);
    if (!(await assignForDate(ctx, args.date))) {
      throw new ConvexError("Cannot replace future grid: active pool is empty");
    }
    return { kind: "replaced" as const };
  },
});

/**
 * Déprogramme la grille d'une date **future** : retire la ligne `grids` et remet
 * la candidate dans le pool actif. Une candidate d'une ancienne génération est
 * supprimée, puisqu'elle ne doit plus redevenir sélectionnable. Refuse les dates
 * passées ou active (aujourd'hui) — une partie peut être en cours.
 */
export const unscheduleGridForDate = internalMutation({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    if (args.date <= todayUTC()) {
      throw new ConvexError("Cannot unschedule a past or active grid");
    }
    const grid = await ctx.db
      .query("grids")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .unique();
    if (!grid) return null;
    const candidate = await ctx.db.get(grid.candidateId);
    await ctx.db.delete(grid._id);
    if (candidate && (await isCandidateInActivePool(ctx, candidate))) {
      await ctx.db.patch(grid.candidateId, {
        status: "available",
        usedAt: undefined,
        usedForDate: undefined,
      });
    } else if (candidate) {
      await deleteCandidateAndSatelliteIfUnreferenced(ctx, candidate._id);
    }
    return { date: args.date };
  },
});

/**
 * Supprime définitivement la grille programmée d'une date **future** : ligne
 * `grids` + candidate + satellite. La candidate ne reviendra jamais dans le
 * pool. Refuse les dates passées ou active.
 */
export const deleteScheduledGridForDate = internalMutation({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    if (args.date <= todayUTC()) {
      throw new ConvexError("Cannot delete a past or active grid");
    }
    const grid = await ctx.db
      .query("grids")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .unique();
    if (!grid) return null;
    await ctx.db.delete(grid._id);
    await deleteCandidateAndSatelliteIfUnreferenced(ctx, grid.candidateId);
    return { date: args.date };
  },
});

/**
 * Supprime une candidate « disponible » du pool (grille prédite jamais
 * programmée) + son satellite. Refuse une candidate `used` : passer par
 * `deleteScheduledGridForDate` pour retirer une grille déjà programmée.
 */
export const deletePoolCandidate = internalMutation({
  args: { candidateId: v.id("gridCandidates") },
  handler: async (ctx, args) => {
    const candidate = await ctx.db.get(args.candidateId);
    if (!candidate) return null;
    if (
      candidate.status !== "available" ||
      !(await isCandidateInActivePool(ctx, candidate))
    ) {
      throw new ConvexError("Candidate is not available");
    }
    await deleteCandidateAndSatellite(ctx, args.candidateId);
    return { candidateId: args.candidateId };
  },
});
