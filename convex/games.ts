import { v } from "convex/values";
import { buildCohort } from "../src/features/game/logic/cohort";
import { toGuessDistribution } from "../src/features/game/logic/distribution";
import {
  applyMove,
  emptyGameRecord,
  type GameRecord,
  recordMoveCount,
} from "../src/features/game/logic/gameRecord";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { cellKeyValidator } from "./cellKeys";
import {
  cellCountsValidator,
  incrementCellStat,
  readCellCounts,
} from "./cellStats";
import { ratingValidator } from "./gameValidators";
import {
  assertCanonicalDate,
  assertClientId,
  assertCountryCode,
  assertGameToken,
  assertReplayableDate,
  requireGridSnapshot,
} from "./gameWriteValidation";
import { getGridAnswers } from "./gridData";
import { recordRateLimited } from "./health";
import { todayUTC } from "./lib/dates";
import { rateLimiter } from "./rateLimit";

/**
 * Plafond de lecture d'une cohorte. Au-delà, la cohorte est tronquée : le jour
 * où le trafic s'en approche, un instantané recalculé par cron prendra le relais
 * (plan du chantier, #70).
 */
const MAX_COHORT_GAMES = 8000;

const rejectionReason = v.union(
  v.literal("date_mismatch"),
  v.literal("unknown_game"),
  v.literal("out_of_order"),
  v.literal("game_over"),
  v.literal("cell_unavailable"),
  v.literal("rate_limited"),
);
type RejectionReason = typeof rejectionReason.type;

const playMoveResult = v.union(
  v.object({
    kind: v.literal("applied"),
    outcome: v.literal("success"),
    count: v.number(),
    total: v.number(),
  }),
  v.object({ kind: v.literal("applied"), outcome: v.literal("failure") }),
  /** Coup déjà appliqué (renvoi après un accusé perdu) : rien n'est réécrit. */
  v.object({ kind: v.literal("duplicate") }),
  v.object({ kind: v.literal("rejected"), reason: rejectionReason }),
);
type PlayMoveResult = typeof playMoveResult.type;

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function findGame(
  ctx: QueryCtx | MutationCtx,
  tokenHash: string,
): Promise<Doc<"games"> | null> {
  return await ctx.db
    .query("games")
    .withIndex("by_owner_token_hash", (q) => q.eq("owner.tokenHash", tokenHash))
    .unique();
}

async function limit(
  ctx: MutationCtx,
  name: "createGamePerMinute" | "createGamePerDay" | "move",
  key: string,
): Promise<boolean> {
  const { ok } = await rateLimiter.limit(ctx, name, { key });
  // Pas d'exception : elle annulerait aussi le compteur de surveillance.
  if (!ok) await recordRateLimited(ctx);
  return ok;
}

function rejected(reason: RejectionReason): PlayMoveResult {
  return { kind: "rejected", reason };
}

/**
 * Un coup de la grille du jour. La saisie reste locale et instantanée : le
 * client envoie ses coups en arrière-plan, dans l'ordre, et le serveur les
 * rejoue sur la ligne de la partie avec la même règle (`applyMove`).
 *
 * `moveIndex` est le rang du coup (0 pour le premier). Le rang attendu se lit
 * dans la ligne (cases remplies + erreurs) : un coup déjà appliqué renvoie
 * `duplicate` sans rien écrire, un coup en avance est refusé. La ligne d'un
 * anonyme naît au premier coup, avec le hash du jeton tiré par le navigateur.
 */
export const playMove = mutation({
  args: {
    date: v.string(),
    token: v.string(),
    clientId: v.string(),
    moveIndex: v.number(),
    cellKey: cellKeyValidator,
    countryCode: v.string(),
  },
  returns: playMoveResult,
  handler: async (ctx, args): Promise<PlayMoveResult> => {
    assertCanonicalDate(args.date);
    assertGameToken(args.token);
    assertClientId(args.clientId);
    assertCountryCode(args.countryCode);
    if (!Number.isInteger(args.moveIndex) || args.moveIndex < 0) {
      return rejected("out_of_order");
    }

    const tokenHash = await hashToken(args.token);
    const game = await findGame(ctx, tokenHash);
    if (game && game.date !== args.date) return rejected("unknown_game");

    const record: GameRecord = game
      ? { cells: game.cells, failed: game.failed }
      : emptyGameRecord();
    const expected = recordMoveCount(record);
    if (args.moveIndex < expected) return { kind: "duplicate" };
    if (args.moveIndex > expected) {
      return rejected(game ? "out_of_order" : "unknown_game");
    }
    // Après la recherche des doublons : un coup d'hier déjà compté reste acquitté.
    if (args.date !== todayUTC()) return rejected("date_mismatch");

    const allowed = game
      ? await limit(ctx, "move", tokenHash)
      : (await limit(ctx, "createGamePerMinute", args.clientId)) &&
        (await limit(ctx, "createGamePerDay", args.clientId));
    if (!allowed) return rejected("rate_limited");

    const { validAnswers } = await requireGridSnapshot(ctx, args.date);
    const outcome = applyMove(
      record,
      args.cellKey,
      args.countryCode,
      validAnswers,
    );
    if (outcome.kind === "refused") return rejected(outcome.reason);

    if (game) {
      await ctx.db.patch(game._id, outcome.record);
    } else {
      await ctx.db.insert("games", {
        date: args.date,
        owner: { kind: "anon", tokenHash },
        ...outcome.record,
        origin: "live",
      });
    }
    if (outcome.kind === "failure") {
      return { kind: "applied", outcome: "failure" };
    }
    const stat = await incrementCellStat(
      ctx,
      args.date,
      args.cellKey,
      args.countryCode,
    );
    return { kind: "applied", outcome: "success", ...stat };
  },
});

/** Note de difficulté de la partie du jour, gardée sur sa ligne. Première note retenue. */
export const rateTodayGame = mutation({
  args: { date: v.string(), token: v.string(), rating: ratingValidator },
  returns: v.union(
    v.object({ kind: v.literal("recorded") }),
    v.object({
      kind: v.literal("rejected"),
      reason: v.union(
        v.literal("date_mismatch"),
        v.literal("unknown_game"),
        v.literal("rate_limited"),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    assertCanonicalDate(args.date);
    assertGameToken(args.token);
    const tokenHash = await hashToken(args.token);
    const game = await findGame(ctx, tokenHash);
    if (!game || game.date !== args.date) {
      return { kind: "rejected" as const, reason: "unknown_game" as const };
    }
    if (game.rating) return { kind: "recorded" as const };
    if (args.date !== todayUTC()) {
      return { kind: "rejected" as const, reason: "date_mismatch" as const };
    }
    if (!(await limit(ctx, "move", tokenHash))) {
      return { kind: "rejected" as const, reason: "rate_limited" as const };
    }
    await ctx.db.patch(game._id, { rating: args.rating });
    return { kind: "recorded" as const };
  },
});

async function readGridAnswers(
  ctx: QueryCtx,
  date: string,
): Promise<Record<string, string[]> | null> {
  const grid = await ctx.db
    .query("grids")
    .withIndex("by_date", (q) => q.eq("date", date))
    .unique();
  return grid ? await getGridAnswers(ctx, grid) : null;
}

export async function readGamesForDate(
  ctx: QueryCtx,
  date: string,
): Promise<Doc<"games">[]> {
  return await ctx.db
    .query("games")
    .withIndex("by_date", (q) => q.eq("date", date))
    .take(MAX_COHORT_GAMES);
}

const cohortValidator = v.object({
  histogram: v.array(v.number()),
  failedPlayers: v.array(v.number()),
});

/**
 * « Toi et les autres » : scores des parties finies du jour (101 seaux de 10
 * points) et joueurs qui se sont trompés sur chaque case. Lue à la demande par
 * le client, sans argument ni identité : le résultat est partagé en cache.
 */
export const getTodayCohort = query({
  args: {},
  returns: v.union(v.null(), cohortValidator),
  handler: async (ctx) => {
    const date = todayUTC();
    const validAnswers = await readGridAnswers(ctx, date);
    if (!validAnswers) return null;
    const [games, counts] = await Promise.all([
      readGamesForDate(ctx, date),
      readCellCounts(ctx, date),
    ]);
    return buildCohort(games, validAnswers, toGuessDistribution(counts));
  },
});

/**
 * Cohorte figée d'une grille rejouable (J-1 à J-7), pour l'entraînement : la
 * répartition (rareté et calque « Meilleur score ») et les erreurs par case
 * (calque « Erreurs »). Même garde de date que `getReplayGrid`.
 */
export const getReplayStats = query({
  args: { date: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      counts: cellCountsValidator,
      failedPlayers: v.array(v.number()),
      finishedGames: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    assertReplayableDate(args.date);
    const validAnswers = await readGridAnswers(ctx, args.date);
    if (!validAnswers) return null;
    const [games, counts] = await Promise.all([
      readGamesForDate(ctx, args.date),
      readCellCounts(ctx, args.date),
    ]);
    const { histogram, failedPlayers } = buildCohort(
      games,
      validAnswers,
      toGuessDistribution(counts),
    );
    return {
      counts,
      failedPlayers,
      finishedGames: histogram.reduce((sum, n) => sum + n, 0),
    };
  },
});
