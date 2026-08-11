import { ConvexError, type ObjectType, v } from "convex/values";
import { REPLAY_WINDOW_DAYS } from "../src/features/game/logic/replayWindow";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  assertClientId,
  assertOperationId,
  assertReplayableDate,
  assertValidGameEnd,
  type GameEndInput,
  requireGridForDate,
} from "./gameWriteValidation";
import { getGridAnswers } from "./gridData";
import { daysAgoUTC, todayUTC } from "./lib/dates";
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

type Rating = ObjectType<typeof submitTodayGridFeedbackArgs>["rating"];
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

const validAnswersValidator = v.record(v.string(), v.array(v.string()));

/** Grille du jour servie au joueur, réponses figées comprises. */
export const todayGridReturns = v.union(
  v.null(),
  v.object({
    _id: v.id("grids"),
    _creationTime: v.number(),
    date: v.string(),
    rows: v.array(v.string()),
    cols: v.array(v.string()),
    candidateId: v.id("gridCandidates"),
    validAnswers: validAnswersValidator,
  }),
);

/**
 * Liste de l'archive. **Sans `validAnswers`** : ce validateur est ce qui rend
 * l'invariant mécanique — ajouter le champ au handler ferait désormais échouer
 * la fonction à l'exécution au lieu de livrer silencieusement les réponses.
 */
export const replayableGridsReturns = v.array(
  v.object({
    date: v.string(),
    rows: v.array(v.string()),
    cols: v.array(v.string()),
  }),
);

/** Grille passée rejouable : réduite à ce que le joueur consomme. */
export const replayGridReturns = v.union(
  v.null(),
  v.object({
    date: v.string(),
    rows: v.array(v.string()),
    cols: v.array(v.string()),
    validAnswers: validAnswersValidator,
  }),
);

export const getReplayGridArgs = { date: v.string() };
type GetReplayGridArgs = ObjectType<typeof getReplayGridArgs>;

/**
 * Read model d'une grille passée rejouable en entraînement. Le client la rejoue
 * avec le même moteur que la grille du jour. `assertReplayableDate` borne la
 * lecture à J-1..J-7 : une date future (ou aujourd'hui) est refusée.
 *
 * Volontairement réduit à ce que le joueur consomme — pas de `_id`, ni de
 * `candidateId`, qui n'exposeraient qu'un identifiant interne de pool.
 *
 * Deux régimes d'échec distincts, comme pour la grille du jour : une date hors
 * fenêtre **lève** (c'est une demande illégitime), une grille absente renvoie
 * `null` (simple trou de données, que l'UI présente calmement).
 */
export async function getReplayGridHandler(
  ctx: QueryCtx,
  args: GetReplayGridArgs,
) {
  assertReplayableDate(args.date);
  const grid = await ctx.db
    .query("grids")
    .withIndex("by_date", (q) => q.eq("date", args.date))
    .unique();
  if (!grid) return null;
  const validAnswers = await getGridAnswers(ctx, grid);
  if (!validAnswers) return null;
  return {
    date: grid.date,
    rows: grid.rows,
    cols: grid.cols,
    validAnswers,
  };
}

/**
 * Liste de l'archive : les grilles publiées de J-1 à J-7, de la plus récente à
 * la plus ancienne. Volontairement **sans `validAnswers`** — la liste ne doit
 * rien révéler, les réponses ne partent qu'à l'ouverture d'une grille.
 */
export async function getReplayableGridsHandler(ctx: QueryCtx) {
  const today = todayUTC();
  const grids = await ctx.db
    .query("grids")
    .withIndex("by_date", (q) =>
      q.gte("date", daysAgoUTC(REPLAY_WINDOW_DAYS)).lt("date", today),
    )
    .order("desc")
    .take(REPLAY_WINDOW_DAYS);

  return grids.map((grid) => ({
    date: grid.date,
    rows: grid.rows,
    cols: grid.cols,
  }));
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
