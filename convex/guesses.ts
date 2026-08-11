import { ConvexError, v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { CELL_KEYS, type CellKey, cellKeyValidator } from "./cellKeys";
import {
  assertCanonicalDate,
  assertClientId,
  assertCountryCode,
  assertOperationId,
  requireGridForDate,
  requireGridSnapshot,
} from "./gameWriteValidation";
import { todayUTC } from "./lib/dates";
import {
  readOperationReceipt,
  writeOperationReceipt,
} from "./operationReceipts";
import { rateLimiter } from "./rateLimit";

// 9 cases × ~200 pays × cohortes live/replay, sous la limite Convex de 4096.
const MAX_GUESS_ROWS_PER_DATE = 4096;

type AcceptedGuess = {
  kind: "accepted";
  count: number;
  total: number;
  rarity: number;
};

type GuessResult =
  | AcceptedGuess
  | { kind: "domain_rejected"; reason: "invalid_guess" };

async function getDistribution(
  ctx: QueryCtx,
  date: string,
): Promise<
  Record<
    CellKey,
    { totalGuesses: number; rarityByCountry: Record<string, number> }
  >
> {
  const [statsRows, guessRows] = await Promise.all([
    ctx.db
      .query("dailyStats")
      .withIndex("by_date_and_cell", (q) => q.eq("date", date))
      .take(CELL_KEYS.length),
    ctx.db
      .query("guesses")
      .withIndex("by_date_and_cell", (q) => q.eq("date", date))
      .take(MAX_GUESS_ROWS_PER_DATE),
  ]);

  const statsByCell = new Map(
    statsRows.map((row) => [row.cellKey, row.totalGuesses]),
  );
  const rowsByCell = new Map<string, typeof guessRows>();
  guessRows.forEach((row) => {
    if (row.isReplay === true) return;
    const rows = rowsByCell.get(row.cellKey) ?? [];
    rows.push(row);
    rowsByCell.set(row.cellKey, rows);
  });

  return Object.fromEntries(
    CELL_KEYS.map((cellKey) => {
      const totalGuesses = statsByCell.get(cellKey) ?? 0;
      const rarityByCountry: Record<string, number> = {};
      if (totalGuesses > 0) {
        (rowsByCell.get(cellKey) ?? []).forEach((row) => {
          rarityByCountry[row.countryCode] = row.count / totalGuesses;
        });
      }
      return [cellKey, { totalGuesses, rarityByCountry }];
    }),
  ) as Record<
    CellKey,
    { totalGuesses: number; rarityByCountry: Record<string, number> }
  >;
}

async function incrementAcceptedGuess(
  ctx: MutationCtx,
  date: string,
  cellKey: CellKey,
  countryCode: string,
): Promise<AcceptedGuess> {
  const existing = await ctx.db
    .query("guesses")
    .withIndex("by_date_and_cell_and_country", (q) =>
      q.eq("date", date).eq("cellKey", cellKey).eq("countryCode", countryCode),
    )
    .unique();

  const count = (existing?.count ?? 0) + 1;
  if (existing) {
    await ctx.db.patch(existing._id, { count });
  } else {
    await ctx.db.insert("guesses", {
      date,
      cellKey,
      countryCode,
      count,
      isReplay: false,
    });
  }

  const stats = await ctx.db
    .query("dailyStats")
    .withIndex("by_date_and_cell", (q) =>
      q.eq("date", date).eq("cellKey", cellKey),
    )
    .unique();
  const total = (stats?.totalGuesses ?? 0) + 1;
  if (stats) {
    await ctx.db.patch(stats._id, { totalGuesses: total });
  } else {
    await ctx.db.insert("dailyStats", {
      date,
      cellKey,
      totalGuesses: total,
    });
  }

  return { kind: "accepted", count, total, rarity: count / total };
}

async function incrementFailedGuess(
  ctx: MutationCtx,
  date: string,
  cellKey: CellKey,
): Promise<void> {
  const stats = await ctx.db
    .query("dailyStats")
    .withIndex("by_date_and_cell", (q) =>
      q.eq("date", date).eq("cellKey", cellKey),
    )
    .unique();

  if (stats) {
    await ctx.db.patch(stats._id, {
      failedAttempts: (stats.failedAttempts ?? 0) + 1,
    });
    return;
  }
  await ctx.db.insert("dailyStats", {
    date,
    cellKey,
    totalGuesses: 0,
    failedAttempts: 1,
  });
}

/** Distribution live de la grille du jour. */
export const getTodayGuessDistribution = query({
  args: {},
  handler: async (ctx) => {
    const date = todayUTC();
    await requireGridForDate(ctx, date);
    return await getDistribution(ctx, date);
  },
});

/**
 * Rareté figée d'une grille passée : le mode entraînement (`/archive`) s'en sert
 * pour colorer les cases sur la cohorte close du jour concerné. Anciennement
 * legacy, cet endpoint fait désormais partie du parcours joueur. La lecture
 * historique reste bornée à une vraie grille et une date canonique.
 */
export const getGuessDistributionForDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    assertCanonicalDate(args.date);
    await requireGridForDate(ctx, args.date);
    return await getDistribution(ctx, args.date);
  },
});

/**
 * Soumet un pays sur la grille du jour. `validAnswers`, figé lors de la
 * publication, est l'unique autorité : les prédicats live ne peuvent pas
 * invalider a posteriori une réponse publiée.
 */
export const submitTodayGuess = mutation({
  args: {
    operationId: v.string(),
    cellKey: cellKeyValidator,
    countryCode: v.string(),
    clientId: v.string(),
  },
  handler: async (ctx, args): Promise<GuessResult> => {
    assertOperationId(args.operationId);
    assertClientId(args.clientId);
    assertCountryCode(args.countryCode);

    const date = todayUTC();
    const identity = {
      operationId: args.operationId,
      operationType: "submit_guess" as const,
      date,
      canonicalPayload: JSON.stringify({
        cellKey: args.cellKey,
        countryCode: args.countryCode,
      }),
    };
    const receipt = await readOperationReceipt(ctx, identity);
    if (receipt) {
      if (receipt.kind === "accepted" || receipt.kind === "domain_rejected") {
        return receipt;
      }
      throw new ConvexError("Invalid operation receipt");
    }

    await rateLimiter.limit(ctx, "guess", {
      key: args.clientId,
      throws: true,
    });

    const { validAnswers } = await requireGridSnapshot(ctx, date);
    if (!validAnswers[args.cellKey]?.includes(args.countryCode)) {
      const result = {
        kind: "domain_rejected" as const,
        reason: "invalid_guess" as const,
      };
      await writeOperationReceipt(ctx, identity, result);
      return result;
    }

    const result = await incrementAcceptedGuess(
      ctx,
      date,
      args.cellKey,
      args.countryCode,
    );
    await writeOperationReceipt(ctx, identity, result);
    return result;
  },
});

/** Enregistre un vrai pays qui ne satisfait pas le snapshot de la case. */
export const recordTodayFailedGuess = mutation({
  args: {
    operationId: v.string(),
    cellKey: cellKeyValidator,
    countryCode: v.string(),
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    assertOperationId(args.operationId);
    assertClientId(args.clientId);
    assertCountryCode(args.countryCode);

    const date = todayUTC();
    const identity = {
      operationId: args.operationId,
      operationType: "failed_guess" as const,
      date,
      canonicalPayload: JSON.stringify({
        cellKey: args.cellKey,
        countryCode: args.countryCode,
      }),
    };
    const receipt = await readOperationReceipt(ctx, identity);
    if (receipt) {
      if (receipt.kind === "recorded") return receipt;
      throw new ConvexError("Invalid operation receipt");
    }

    await rateLimiter.limit(ctx, "guess", {
      key: args.clientId,
      throws: true,
    });
    const { validAnswers } = await requireGridSnapshot(ctx, date);
    if (validAnswers[args.cellKey]?.includes(args.countryCode)) {
      throw new ConvexError("A valid answer cannot be recorded as failed");
    }

    await incrementFailedGuess(ctx, date, args.cellKey);
    const result = { kind: "recorded" as const };
    await writeOperationReceipt(ctx, identity, result);
    return result;
  },
});
