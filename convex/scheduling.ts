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
 * Si le pool est vide (rare), on planifie la **génération lourde** (action
 * `autoRefillPool`) via le scheduler — jamais de génération inline ici, pour
 * garder ce module léger.
 */
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation } from "./_generated/server";
import { todayUTC, tomorrowUTC } from "./lib/dates";
import { KNOWN_CONSTRAINT_WINDOW } from "./lib/gridConstants";
import { selectNextGrid } from "./lib/gridScheduler";

/**
 * Assigne la grille d'une date depuis le pool si elle n'existe pas encore.
 * Idempotent (early-return si déjà présente), atomique (patch + insert dans la
 * même transaction). Retourne `true` si une grille existe/est créée pour la
 * date, `false` si le pool est vide (refill planifié).
 */
async function assignForDate(ctx: MutationCtx, date: string): Promise<boolean> {
  const existing = await ctx.db
    .query("grids")
    .withIndex("by_date", (q) => q.eq("date", date))
    .unique();
  if (existing) return true;

  const available = await ctx.db
    .query("gridCandidates")
    .withIndex("by_status", (q) => q.eq("status", "available"))
    .collect();
  const recent = await ctx.db
    .query("grids")
    .withIndex("by_date")
    .order("desc")
    .take(KNOWN_CONSTRAINT_WINDOW);

  const pool = available.map((g) => ({
    _id: g._id as string,
    rows: g.rows,
    cols: g.cols,
    metadata: g.metadata,
  }));
  const recentForScheduler = recent.map((g) => ({
    constraintIds: [...g.rows, ...g.cols],
    countryPool: g.countryPool,
  }));

  const selected = selectNextGrid(pool, recentForScheduler);
  if (!selected) {
    // Pool vide : planifier le refill lourd (action) sans bloquer ce module.
    // `autoRefillPool` régénère quand le stock est sous le seuil (donc à vide).
    console.error(`[CRITICAL] pool empty, scheduling refill for ${date}`);
    await ctx.scheduler.runAfter(0, internal.grids.autoRefillPool, {});
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
    await assignForDate(ctx, todayUTC());
    await assignForDate(ctx, tomorrowUTC());
  },
});

/** Assigne une date précise (override admin / seed). */
export const assignGridForDate = internalMutation({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const ok = await assignForDate(ctx, args.date);
    return ok ? { date: args.date } : null;
  },
});
