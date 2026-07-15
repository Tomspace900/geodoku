import { type ObjectType, v } from "convex/values";
import { gridPopularity } from "../src/features/countries/logic/popularity";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { ActionCtx, QueryCtx } from "./_generated/server";
import { readGridCellMetrics, readPoolStats } from "./adminReadModel";
import { checkAdminToken } from "./auth";
import {
  getActivePoolCandidatesByStatus,
  getCandidateAnswers,
  getGridAnswers,
} from "./gridData";
import { daysAgoUTC, offsetUTC, todayUTC, tomorrowUTC } from "./lib/dates";
import { KNOWN_CONSTRAINT_WINDOW } from "./lib/gridConstants";
import { selectNextGrid } from "./lib/gridScheduler";
import {
  type PoolFinalizationResult,
  refreshPoolImpl,
  retryPoolFinalizationImpl,
} from "./poolOperations";

const UPCOMING_PREVIEW_MAX_DAYS = 14;
const UPCOMING_PREVIEW_DEFAULT_DAYS = 7;

export const adminTokenArgs = { adminToken: v.string() };
export const scheduledGridPreviewDetailArgs = {
  adminToken: v.string(),
  date: v.string(),
};
export const candidatePreviewDetailArgs = {
  adminToken: v.string(),
  candidateId: v.id("gridCandidates"),
};
export const upcomingScheduledPreviewArgs = {
  adminToken: v.string(),
  days: v.optional(v.number()),
};
export const gridFeedbackStatsArgs = {
  adminToken: v.string(),
  limit: v.optional(v.number()),
};
export const gridCellMetricsArgs = {
  date: v.string(),
  adminToken: v.string(),
};
export const scheduleGridForDateArgs = {
  adminToken: v.string(),
  date: v.string(),
};
export const scheduleCandidateForDateArgs = {
  adminToken: v.string(),
  date: v.string(),
  candidateId: v.id("gridCandidates"),
};
export const deletePoolCandidateArgs = {
  adminToken: v.string(),
  candidateId: v.id("gridCandidates"),
};

type AdminTokenArgs = ObjectType<typeof adminTokenArgs>;
type ScheduledGridPreviewDetailArgs = ObjectType<
  typeof scheduledGridPreviewDetailArgs
>;
type CandidatePreviewDetailArgs = ObjectType<typeof candidatePreviewDetailArgs>;
type UpcomingScheduledPreviewArgs = ObjectType<
  typeof upcomingScheduledPreviewArgs
>;
type GridFeedbackStatsArgs = ObjectType<typeof gridFeedbackStatsArgs>;
type GridCellMetricsArgs = ObjectType<typeof gridCellMetricsArgs>;
type ScheduleGridForDateArgs = ObjectType<typeof scheduleGridForDateArgs>;
type ScheduleCandidateForDateArgs = ObjectType<
  typeof scheduleCandidateForDateArgs
>;
type DeletePoolCandidateArgs = ObjectType<typeof deletePoolCandidateArgs>;

/** Calendrier admin des grilles récentes et futures. */
export async function getScheduledGridsHandler(
  ctx: QueryCtx,
  args: AdminTokenArgs,
) {
  checkAdminToken(args.adminToken);
  const cutoff = daysAgoUTC(30);
  const today = todayUTC();
  const grids = await ctx.db
    .query("grids")
    .withIndex("by_date", (q) => q.gte("date", cutoff))
    .order("asc")
    .take(500);

  return await Promise.all(
    grids.map(async (grid) => {
      const candidate = await ctx.db.get(grid.candidateId);
      const gridPopTop3 =
        grid.date >= today
          ? gridPopularity((await getGridAnswers(ctx, grid)) ?? {})
          : null;
      return {
        date: grid.date,
        rows: grid.rows,
        cols: grid.cols,
        candidateId: grid.candidateId,
        metadata: candidate?.metadata ?? null,
        gridPopTop3,
      };
    }),
  );
}

/** Charge le snapshot d'une grille planifiée à la demande. */
export async function getScheduledGridPreviewDetailHandler(
  ctx: QueryCtx,
  args: ScheduledGridPreviewDetailArgs,
) {
  checkAdminToken(args.adminToken);
  const grid = await ctx.db
    .query("grids")
    .withIndex("by_date", (q) => q.eq("date", args.date))
    .unique();
  if (!grid) return null;
  const validAnswers = (await getGridAnswers(ctx, grid)) ?? {};
  return {
    date: grid.date,
    rows: grid.rows,
    cols: grid.cols,
    validAnswers,
  };
}

/** Charge le snapshot d'une candidate du pool à la demande. */
export async function getCandidatePreviewDetailHandler(
  ctx: QueryCtx,
  args: CandidatePreviewDetailArgs,
) {
  checkAdminToken(args.adminToken);
  const candidate = await ctx.db.get(args.candidateId);
  if (!candidate) return null;
  const validAnswers = (await getCandidateAnswers(ctx, candidate._id)) ?? {};
  return {
    rows: candidate.rows,
    cols: candidate.cols,
    validAnswers,
  };
}

/** Santé du stock actif. */
export async function getPoolStatsHandler(ctx: QueryCtx, args: AdminTokenArgs) {
  checkAdminToken(args.adminToken);
  return await readPoolStats(ctx);
}

/** Calendrier futur combinant planification réelle et prédiction du scheduler. */
export async function getUpcomingScheduledPreviewHandler(
  ctx: QueryCtx,
  args: UpcomingScheduledPreviewArgs,
) {
  checkAdminToken(args.adminToken);
  const days = Math.min(
    Math.max(args.days ?? UPCOMING_PREVIEW_DEFAULT_DAYS, 1),
    UPCOMING_PREVIEW_MAX_DAYS,
  );
  const tomorrow = tomorrowUTC();

  const futureScheduled = await ctx.db
    .query("grids")
    .withIndex("by_date", (q) => q.gte("date", tomorrow))
    .order("asc")
    .take(days + 7);
  const scheduledByDate = new Map(
    futureScheduled.map((grid) => [grid.date, grid]),
  );

  const available = await getActivePoolCandidatesByStatus(ctx, "available");
  const poolForScheduler = available.map((grid) => ({
    _id: grid._id as string,
    rows: grid.rows,
    cols: grid.cols,
    metadata: grid.metadata,
  }));

  const recentPublished = await ctx.db
    .query("grids")
    .withIndex("by_date", (q) => q.lt("date", tomorrow))
    .order("desc")
    .take(KNOWN_CONSTRAINT_WINDOW);
  let recentForScheduler = recentPublished.map((grid) => ({
    rows: grid.rows,
    cols: grid.cols,
  }));

  type UpcomingDay =
    | {
        date: string;
        kind: "scheduled" | "predicted";
        rows: string[];
        cols: string[];
        candidateId: Id<"gridCandidates"> | null;
        gridPopTop3: number | null;
      }
    | { date: string; kind: "missing" };

  const upcoming: UpcomingDay[] = [];
  const usedIds = new Set<string>();

  for (let i = 0; i < days; i++) {
    const date = offsetUTC(i + 1);
    const existing = scheduledByDate.get(date);

    if (existing) {
      upcoming.push({
        date,
        kind: "scheduled",
        rows: existing.rows,
        cols: existing.cols,
        candidateId: existing.candidateId,
        gridPopTop3: gridPopularity(
          (await getGridAnswers(ctx, existing)) ?? {},
        ),
      });
      recentForScheduler = [
        { rows: existing.rows, cols: existing.cols },
        ...recentForScheduler,
      ];
      continue;
    }

    const remaining = poolForScheduler.filter((grid) => !usedIds.has(grid._id));
    const picked = selectNextGrid(remaining, recentForScheduler);
    if (!picked) {
      upcoming.push({ date, kind: "missing" });
      continue;
    }

    upcoming.push({
      date,
      kind: "predicted",
      rows: picked.grid.rows,
      cols: picked.grid.cols,
      candidateId: picked.grid._id as Id<"gridCandidates">,
      gridPopTop3: gridPopularity(
        (await getCandidateAnswers(
          ctx,
          picked.grid._id as Id<"gridCandidates">,
        )) ?? {},
      ),
    });
    usedIds.add(picked.grid._id);
    recentForScheduler = [
      { rows: picked.grid.rows, cols: picked.grid.cols },
      ...recentForScheduler,
    ];
  }

  return upcoming;
}

/** Agrégats observés des grilles récentes. */
export async function getGridFeedbackStatsHandler(
  ctx: QueryCtx,
  args: GridFeedbackStatsArgs,
) {
  checkAdminToken(args.adminToken);
  const limit = Math.min(args.limit ?? 60, 180);
  const feedbackRows = await ctx.db
    .query("gridFeedback")
    .withIndex("by_date")
    .order("desc")
    .take(limit);

  return feedbackRows.map((row) => {
    const ratings = row.totalRatings;
    const gamesPlayed = row.wins + row.losses;
    const difficultyObserved100 =
      ratings === 0
        ? null
        : Math.round(
            (row.balancedCount * 50 + row.tooHardCount * 100) / ratings,
          );
    return {
      date: row.date,
      ratingCount: ratings,
      gamesPlayed,
      difficultyObserved100,
      winRate:
        gamesPlayed === 0 ? null : Number((row.wins / gamesPlayed).toFixed(3)),
      avgLivesLeft:
        gamesPlayed === 0
          ? null
          : Number((row.totalLivesLeft / gamesPlayed).toFixed(2)),
      avgFilledCells:
        gamesPlayed === 0
          ? null
          : Number((row.totalFilledCells / gamesPlayed).toFixed(2)),
      avgGuessesSubmitted:
        gamesPlayed === 0
          ? null
          : Number((row.totalGuessesSubmitted / gamesPlayed).toFixed(2)),
      tooEasyCount: row.tooEasyCount,
      balancedCount: row.balancedCount,
      tooHardCount: row.tooHardCount,
      wins: row.wins,
      losses: row.losses,
      lostByLives: row.lostByLivesCount ?? 0,
      lostByBlocked: row.lostByBlockedCount ?? 0,
    };
  });
}

/** Read model détaillé d'une journée, chargé au clic dans l'admin. */
export async function getGridCellMetricsHandler(
  ctx: QueryCtx,
  args: GridCellMetricsArgs,
) {
  checkAdminToken(args.adminToken);
  return await readGridCellMetrics(ctx, args.date);
}

export async function refreshPoolHandler(ctx: ActionCtx, args: AdminTokenArgs) {
  checkAdminToken(args.adminToken);
  return await refreshPoolImpl(ctx);
}

export async function retryPoolFinalizationHandler(
  ctx: ActionCtx,
  args: AdminTokenArgs,
): Promise<PoolFinalizationResult> {
  checkAdminToken(args.adminToken);
  return await retryPoolFinalizationImpl(ctx);
}

export async function runEnsureTomorrowHandler(
  ctx: ActionCtx,
  args: AdminTokenArgs,
): Promise<void> {
  checkAdminToken(args.adminToken);
  await ctx.runMutation(internal.scheduling.ensureDailyGrids, {});
}

export async function scheduleGridForDateHandler(
  ctx: ActionCtx,
  args: ScheduleGridForDateArgs,
): Promise<{ date: string } | null> {
  checkAdminToken(args.adminToken);
  return await ctx.runMutation(internal.scheduling.assignGridForDate, {
    date: args.date,
  });
}

export async function scheduleCandidateForDateHandler(
  ctx: ActionCtx,
  args: ScheduleCandidateForDateArgs,
): Promise<{ date: string } | null> {
  checkAdminToken(args.adminToken);
  return await ctx.runMutation(internal.scheduling.scheduleCandidateForDate, {
    date: args.date,
    candidateId: args.candidateId,
  });
}

export async function unscheduleGridHandler(
  ctx: ActionCtx,
  args: ScheduleGridForDateArgs,
): Promise<{ date: string } | null> {
  checkAdminToken(args.adminToken);
  return await ctx.runMutation(internal.scheduling.unscheduleGridForDate, {
    date: args.date,
  });
}

export async function deleteScheduledGridHandler(
  ctx: ActionCtx,
  args: ScheduleGridForDateArgs,
): Promise<{ date: string } | null> {
  checkAdminToken(args.adminToken);
  return await ctx.runMutation(internal.scheduling.deleteScheduledGridForDate, {
    date: args.date,
  });
}

export async function deletePoolCandidateHandler(
  ctx: ActionCtx,
  args: DeletePoolCandidateArgs,
): Promise<{ candidateId: Id<"gridCandidates"> } | null> {
  checkAdminToken(args.adminToken);
  return await ctx.runMutation(internal.scheduling.deletePoolCandidate, {
    candidateId: args.candidateId,
  });
}
