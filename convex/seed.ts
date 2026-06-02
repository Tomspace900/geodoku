/**
 * Historical seed: backfills today and the previous 30 calendar days (pool + scheduler).
 * - seedHistoricalGrids : throws si grids non vide (usage manuel, dev/prod initial)
 * - autoSeedIfEmpty    : no-op si déjà peuplé, seed sinon (appelé au deploy preview via --run)
 * Invoked manually: `pnpm seed:grids` → `npx convex run --internal seed:seedHistoricalGrids`
 */
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import { internalAction } from "./_generated/server";
import { ensureGridForDateImpl, generatePoolImpl } from "./grids";
import { formatYMD, todayUTC, tomorrowUTC } from "./lib/dates";

/** Inclusive span: today plus 30 days back (31 dates). */
const SEED_PAST_DAY_COUNT = 31;

/** Inclusive range from (today − 30) to today. */
function datesFromPastToToday(today: string): string[] {
  const anchor = new Date(`${today}T12:00:00.000Z`);
  const out: string[] = [];
  for (let i = 0; i < SEED_PAST_DAY_COUNT; i++) {
    const d = new Date(anchor);
    d.setUTCDate(anchor.getUTCDate() - (SEED_PAST_DAY_COUNT - 1 - i));
    out.push(formatYMD(d));
  }
  return out;
}

type SeedHistoricalResult = {
  seeded: number;
  dates: string[];
  steps: { date: string; candidateId: string }[];
};

type AutoSeedResult = { skipped: true } | SeedHistoricalResult;

/**
 * Helper direct (pas une action) du seed historique. Appelé in-process par le
 * wrapper `seedHistoricalGrids` (script CLI) et par `autoSeedIfEmpty` (deploy),
 * jamais via `ctx.runAction` (anti-pattern action→action des guidelines Convex).
 */
async function seedHistoricalGridsImpl(
  ctx: ActionCtx,
): Promise<SeedHistoricalResult> {
  if (await ctx.runQuery(internal.gridData.hasAnyGrid)) {
    throw new ConvexError(
      "grids table is not empty — run wipe:wipeAllData in dev first, or skip seed if prod is already live",
    );
  }

  const today = todayUTC();
  const dates = datesFromPastToToday(today);

  // Generate a pool first (helper direct, pas de ctx.runAction imbriqué)
  const report = await generatePoolImpl(ctx);
  console.log(
    `[seedHistoricalGrids] Pool generated: ${report.totalGenerated} grids in ${report.durationMs}ms`,
  );

  const steps: { date: string; candidateId: string }[] = [];

  for (const date of dates) {
    // Appel DIRECT au helper (pas de ctx.runAction imbriqué).
    const result = await ensureGridForDateImpl(ctx, date);
    if (result) {
      steps.push(result);
      console.log(
        `[seedHistoricalGrids] ${date} → candidate ${result.candidateId}`,
      );
    } else {
      console.warn(`[seedHistoricalGrids] No grid assigned for ${date}`);
    }
  }

  // today est déjà couvert par la boucle ; on ajoute demain.
  await ensureGridForDateImpl(ctx, tomorrowUTC());

  return { seeded: dates.length, dates, steps };
}

/** Thin wrapper exposé pour le script CLI `pnpm seed:grids`. */
export const seedHistoricalGrids = internalAction({
  args: {},
  handler: async (ctx): Promise<SeedHistoricalResult> =>
    seedHistoricalGridsImpl(ctx),
});

/**
 * Idempotent seed pour les déploiements preview automatiques.
 * No-op si grids non vide (develop, prod) ; seed complet si vide (nouvelle branche WIP).
 * Appelé par la build command Vercel : `convex deploy --preview-run seed:autoSeedIfEmpty`
 */
export const autoSeedIfEmpty = internalAction({
  args: {},
  handler: async (ctx): Promise<AutoSeedResult> => {
    if (await ctx.runQuery(internal.gridData.hasAnyGrid)) {
      console.log("[autoSeedIfEmpty] grids déjà peuplées — seed ignoré");
      return { skipped: true };
    }
    console.log("[autoSeedIfEmpty] grids vides — démarrage du seed historique");
    // Helper direct (pas de ctx.runAction imbriqué).
    return seedHistoricalGridsImpl(ctx);
  },
});
