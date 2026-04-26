/**
 * Historical seed: backfills past + future grids using the new pool architecture.
 * Generates a pool first, then assigns grids sequentially for each date.
 * Invoked manually: `pnpm seed:grids` → `npx convex run seed:seedHistoricalGrids`
 */
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

const SEED_PAST_DAY_COUNT = 15;
const SEED_FUTURE_DAY_COUNT = 7;

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

/** Inclusive range from (today − SEED_PAST_DAY_COUNT + 1) to today. */
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

/** Inclusive range from tomorrow to (today + SEED_FUTURE_DAY_COUNT). */
function datesFromTomorrowToFuture(today: string): string[] {
  const anchor = new Date(`${today}T12:00:00.000Z`);
  const out: string[] = [];
  for (let i = 1; i <= SEED_FUTURE_DAY_COUNT; i++) {
    const d = new Date(anchor);
    d.setUTCDate(anchor.getUTCDate() + i);
    out.push(formatYMD(d));
  }
  return out;
}

export const seedHistoricalGrids = internalAction({
  args: { force: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    if (!args.force && (await ctx.runQuery(internal.gridData.hasAnyGrid))) {
      return {
        skipped: true as const,
        reason: "grids table not empty",
      };
    }

    const today = todayUTC();
    const dates = [
      ...datesFromPastToToday(today),
      ...datesFromTomorrowToFuture(today),
    ];

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
      skipped: false as const,
      seeded: dates.length,
      dates,
      steps,
    };
  },
});
