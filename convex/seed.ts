/**
 * Historical seed: backfills 15 + 7 days of grids (T-14 … T, then T+1 … T+7) using the same
 * pipeline as prod. 22 date iterations in total. Invoked manually: `pnpm seed:grids` →
 * `npx convex run seed:seedHistoricalGrids`
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

/** Inclusive range from (today − 14) to today, length 15. */
function datesFromMinus14ToToday(today: string): string[] {
  const anchor = new Date(`${today}T12:00:00.000Z`);
  const out: string[] = [];
  for (let i = 0; i < SEED_PAST_DAY_COUNT; i++) {
    const d = new Date(anchor);
    d.setUTCDate(anchor.getUTCDate() - (SEED_PAST_DAY_COUNT - 1 - i));
    out.push(formatYMD(d));
  }
  return out;
}

/** Inclusive range from tomorrow to (today + 7), length 7 (T+1 … T+7). */
function datesFromTomorrowToPlus7(today: string): string[] {
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
      ...datesFromMinus14ToToday(today),
      ...datesFromTomorrowToPlus7(today),
    ];
    const steps: {
      date: string;
      candidateId: string;
      score: number;
      contextScore: number | null;
    }[] = [];

    for (const date of dates) {
      await ctx.runAction(internal.grids.generateDailyCandidates, {});
      const promoted = await ctx.runMutation(
        internal.gridData.promoteBestPendingForDate,
        { date },
      );
      await ctx.runMutation(
        internal.gridData.purgeAllPendingCandidatesInternal,
        {},
      );
      steps.push({
        date,
        candidateId: promoted.candidateId,
        score: promoted.score,
        contextScore: promoted.contextScore,
      });
      console.log(
        `[seedHistoricalGrids] ${date} → candidate ${promoted.candidateId} score=${promoted.score} context=${promoted.contextScore}`,
      );
    }

    return {
      skipped: false as const,
      seeded: dates.length,
      dates,
      steps,
    };
  },
});
