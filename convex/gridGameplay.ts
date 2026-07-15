import { ConvexError, type ObjectType, v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  type GameEndInput,
  assertClientId,
  assertOperationId,
  assertTodayDate,
  assertValidGameEnd,
  requireGridForDate,
} from "./gameWriteValidation";
import { getGridAnswers } from "./gridData";
import { todayUTC } from "./lib/dates";
import {
  readOperationReceipt,
  writeOperationReceipt,
} from "./operationReceipts";
import { rateLimiter } from "./rateLimit";

export const endReasonValidator = v.union(
  v.literal("win"),
  v.literal("lives"),
  v.literal("blocked"),
);

export const ratingValidator = v.union(
  v.literal("too_easy"),
  v.literal("balanced"),
  v.literal("too_hard"),
);

export const recordGameEndArgs = {
  date: v.string(),
  endReason: endReasonValidator,
  livesLeft: v.number(),
  filledCells: v.number(),
  guessesSubmitted: v.number(),
  clientId: v.string(),
};

export const submitGridFeedbackArgs = {
  date: v.string(),
  rating: ratingValidator,
  clientId: v.string(),
};

export const recordTodayGameEndArgs = {
  operationId: v.string(),
  endReason: endReasonValidator,
  livesLeft: v.number(),
  filledCells: v.number(),
  guessesSubmitted: v.number(),
  clientId: v.string(),
};

export const submitTodayGridFeedbackArgs = {
  operationId: v.string(),
  rating: ratingValidator,
  clientId: v.string(),
};

type Rating = ObjectType<typeof submitGridFeedbackArgs>["rating"];
type RecordGameEndArgs = ObjectType<typeof recordGameEndArgs>;
type SubmitGridFeedbackArgs = ObjectType<typeof submitGridFeedbackArgs>;
type RecordTodayGameEndArgs = ObjectType<typeof recordTodayGameEndArgs>;
type SubmitTodayGridFeedbackArgs = ObjectType<
  typeof submitTodayGridFeedbackArgs
>;

/** Read model joueur de la grille quotidienne publiée. */
export async function getTodayGridHandler(ctx: QueryCtx) {
  const today = todayUTC();
  const grid = await ctx.db
    .query("grids")
    .withIndex("by_date", (q) => q.eq("date", today))
    .unique();
  if (!grid) {
    console.error(`[CRITICAL] no grid for today ${today}`);
    return null;
  }
  const validAnswers = (await getGridAnswers(ctx, grid)) ?? {};
  return {
    _id: grid._id,
    _creationTime: grid._creationTime,
    date: grid.date,
    rows: grid.rows,
    cols: grid.cols,
    candidateId: grid.candidateId,
    validAnswers,
  };
}

async function incrementGameEnd(
  ctx: MutationCtx,
  date: string,
  input: GameEndInput,
): Promise<void> {
  const existing = await ctx.db
    .query("gridFeedback")
    .withIndex("by_date", (q) => q.eq("date", date))
    .unique();
  const won = input.endReason === "win";
  const winsInc = won ? 1 : 0;
  const lossesInc = won ? 0 : 1;
  const livesLossInc = input.endReason === "lives" ? 1 : 0;
  const blockedLossInc = input.endReason === "blocked" ? 1 : 0;

  if (existing) {
    await ctx.db.patch(existing._id, {
      wins: existing.wins + winsInc,
      losses: existing.losses + lossesInc,
      lostByLivesCount: (existing.lostByLivesCount ?? 0) + livesLossInc,
      lostByBlockedCount: (existing.lostByBlockedCount ?? 0) + blockedLossInc,
      totalLivesLeft: existing.totalLivesLeft + input.livesLeft,
      totalFilledCells: existing.totalFilledCells + input.filledCells,
      totalGuessesSubmitted:
        existing.totalGuessesSubmitted + input.guessesSubmitted,
    });
    return;
  }

  await ctx.db.insert("gridFeedback", {
    date,
    tooEasyCount: 0,
    balancedCount: 0,
    tooHardCount: 0,
    totalRatings: 0,
    wins: winsInc,
    losses: lossesInc,
    lostByLivesCount: livesLossInc,
    lostByBlockedCount: blockedLossInc,
    totalLivesLeft: input.livesLeft,
    totalFilledCells: input.filledCells,
    totalGuessesSubmitted: input.guessesSubmitted,
  });
}

async function incrementGridFeedback(
  ctx: MutationCtx,
  date: string,
  rating: Rating,
): Promise<void> {
  const existing = await ctx.db
    .query("gridFeedback")
    .withIndex("by_date", (q) => q.eq("date", date))
    .unique();
  const tooEasyInc = rating === "too_easy" ? 1 : 0;
  const balancedInc = rating === "balanced" ? 1 : 0;
  const tooHardInc = rating === "too_hard" ? 1 : 0;

  if (existing) {
    await ctx.db.patch(existing._id, {
      tooEasyCount: existing.tooEasyCount + tooEasyInc,
      balancedCount: existing.balancedCount + balancedInc,
      tooHardCount: existing.tooHardCount + tooHardInc,
      totalRatings: existing.totalRatings + 1,
    });
    return;
  }

  await ctx.db.insert("gridFeedback", {
    date,
    tooEasyCount: tooEasyInc,
    balancedCount: balancedInc,
    tooHardCount: tooHardInc,
    totalRatings: 1,
    wins: 0,
    losses: 0,
    totalLivesLeft: 0,
    totalFilledCells: 0,
    totalGuessesSubmitted: 0,
  });
}

/** Écriture legacy conservée temporairement pendant le rollout. */
export async function recordGameEndHandler(
  ctx: MutationCtx,
  args: RecordGameEndArgs,
): Promise<void> {
  assertTodayDate(args.date);
  assertClientId(args.clientId);
  assertValidGameEnd(args);
  await rateLimiter.limit(ctx, "feedback", {
    key: args.clientId,
    throws: true,
  });
  await requireGridForDate(ctx, args.date);
  await incrementGameEnd(ctx, args.date, args);
}

/** Écriture legacy conservée temporairement pendant le rollout. */
export async function submitGridFeedbackHandler(
  ctx: MutationCtx,
  args: SubmitGridFeedbackArgs,
): Promise<void> {
  assertTodayDate(args.date);
  assertClientId(args.clientId);
  await rateLimiter.limit(ctx, "feedback", {
    key: args.clientId,
    throws: true,
  });
  await requireGridForDate(ctx, args.date);
  await incrementGridFeedback(ctx, args.date, args.rating);
}

/** Fin de partie idempotente de la grille du jour. */
export async function recordTodayGameEndHandler(
  ctx: MutationCtx,
  args: RecordTodayGameEndArgs,
) {
  assertOperationId(args.operationId);
  assertClientId(args.clientId);
  assertValidGameEnd(args);

  const date = todayUTC();
  const identity = {
    operationId: args.operationId,
    operationType: "game_end" as const,
    date,
    canonicalPayload: JSON.stringify({
      endReason: args.endReason,
      livesLeft: args.livesLeft,
      filledCells: args.filledCells,
      guessesSubmitted: args.guessesSubmitted,
    }),
  };
  const receipt = await readOperationReceipt(ctx, identity);
  if (receipt) {
    if (receipt.kind === "recorded") return receipt;
    throw new ConvexError("Invalid operation receipt");
  }

  await rateLimiter.limit(ctx, "feedback", {
    key: args.clientId,
    throws: true,
  });
  await requireGridForDate(ctx, date);
  await incrementGameEnd(ctx, date, args);
  const result = { kind: "recorded" as const };
  await writeOperationReceipt(ctx, identity, result);
  return result;
}

/** Rating idempotent de la grille du jour. */
export async function submitTodayGridFeedbackHandler(
  ctx: MutationCtx,
  args: SubmitTodayGridFeedbackArgs,
) {
  assertOperationId(args.operationId);
  assertClientId(args.clientId);

  const date = todayUTC();
  const identity = {
    operationId: args.operationId,
    operationType: "grid_feedback" as const,
    date,
    canonicalPayload: JSON.stringify({ rating: args.rating }),
  };
  const receipt = await readOperationReceipt(ctx, identity);
  if (receipt) {
    if (receipt.kind === "recorded") return receipt;
    throw new ConvexError("Invalid operation receipt");
  }

  await rateLimiter.limit(ctx, "feedback", {
    key: args.clientId,
    throws: true,
  });
  await requireGridForDate(ctx, date);
  await incrementGridFeedback(ctx, date, args.rating);
  const result = { kind: "recorded" as const };
  await writeOperationReceipt(ctx, identity, result);
  return result;
}
