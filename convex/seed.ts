/**
 * Historical seed: backfills today and the previous 30 calendar days (pool + scheduler).
 * Fails if `grids` is non-empty — use wipe in dev first, or seed only once on empty prod.
 * Invoked manually: `pnpm seed:grids` → `npx convex run seed:seedHistoricalGrids`
 */
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

/** Inclusive span: today plus 30 days back (31 dates). */
const SEED_PAST_DAY_COUNT = 31;

function todayUTC(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatYMD(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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

export const seedHistoricalGrids = internalAction({
  args: {},
  handler: async (ctx) => {
    if (await ctx.runQuery(internal.gridData.hasAnyGrid)) {
      throw new ConvexError(
        "grids table is not empty — run wipe:wipeAllData in dev first, or skip seed if prod is already live",
      );
    }

    const today = todayUTC();
    const dates = datesFromPastToToday(today);

    // Generate a pool first
    const report = await ctx.runAction(internal.grids.generatePoolInternal, {});
    console.log(
      `[seedHistoricalGrids] Pool generated: ${report.totalGenerated} grids in ${report.durationMs}ms`,
    );

    const steps: { date: string; candidateId: string }[] = [];

    for (const date of dates) {
      const result = await ctx.runAction(internal.grids.ensureGridForDate, {
        date,
      });
      if (result) {
        steps.push(result);
        console.log(
          `[seedHistoricalGrids] ${date} → candidate ${result.candidateId}`,
        );
      } else {
        console.warn(`[seedHistoricalGrids] No grid assigned for ${date}`);
      }
    }

    return {
      seeded: dates.length,
      dates,
      steps,
    };
  },
});
