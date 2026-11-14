import { ConvexError } from "convex/values";
import { classifyReplayDate } from "../src/features/game/logic/replayWindow";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { getGridAnswers } from "./gridData";
import { todayUTC } from "./lib/dates";

// Le jeton d'une partie est un UUID v4 tiré par le navigateur : 122 bits
// aléatoires, jamais stocké en clair côté serveur.
const GAME_TOKEN_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CLIENT_ID_PATTERN = /^[A-Za-z0-9:_-]+$/;
const COUNTRY_CODE_PATTERN = /^[A-Z]{3}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const MIN_CLIENT_ID_LENGTH = 8;
const MAX_CLIENT_ID_LENGTH = 128;

export function assertGameToken(token: string): void {
  if (!GAME_TOKEN_PATTERN.test(token)) {
    throw new ConvexError("Invalid game token");
  }
}

export function assertClientId(clientId: string): void {
  if (
    clientId.length < MIN_CLIENT_ID_LENGTH ||
    clientId.length > MAX_CLIENT_ID_LENGTH ||
    !CLIENT_ID_PATTERN.test(clientId)
  ) {
    throw new ConvexError("Invalid clientId");
  }
}

/**
 * Forme seule : un code inconnu reste un coup raté, comme à l'écran, où il
 * coûte une vie. Le refuser bloquerait la suite des coups de la partie.
 */
export function assertCountryCode(countryCode: string): void {
  if (!COUNTRY_CODE_PATTERN.test(countryCode)) {
    throw new ConvexError("Invalid countryCode");
  }
}

export function assertCanonicalDate(date: string): void {
  if (!DATE_PATTERN.test(date)) {
    throw new ConvexError("Invalid date");
  }
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    throw new ConvexError("Invalid date");
  }
}

/**
 * Garde des lectures d'archive (mode entraînement). L'endpoint étant public, ce
 * garde est la **seule** garantie réelle : le frontend classe déjà la date avant
 * d'émettre la requête, mais on ne lui fait pas confiance.
 *
 * Le refus des dates `>= todayUTC()` est le point critique — sans lui, un simple
 * `?date=demain` livrerait la grille du lendemain avec ses réponses valides.
 */
export function assertReplayableDate(date: string): void {
  const verdict = classifyReplayDate(date, todayUTC());
  if (verdict === "malformed") {
    throw new ConvexError("Invalid date");
  }
  if (verdict !== "ok") {
    throw new ConvexError("Date is not replayable");
  }
}

/**
 * Garde des lectures d'un jour fini (« Mes stats », #155) : une date passée,
 * jamais aujourd'hui ni demain, dont la grille et la répartition ne bougent
 * plus. Comme pour l'archive, c'est le serveur qui refuse une date future.
 */
export function assertFinishedDate(date: string): void {
  assertCanonicalDate(date);
  if (date >= todayUTC()) {
    throw new ConvexError("Date is not finished");
  }
}

export async function requireGridForDate(
  ctx: QueryCtx | MutationCtx,
  date: string,
): Promise<Doc<"grids">> {
  const grid = await ctx.db
    .query("grids")
    .withIndex("by_date", (q) => q.eq("date", date))
    .unique();
  if (!grid) {
    throw new ConvexError("Grid unavailable");
  }
  return grid;
}

export async function requireGridSnapshot(
  ctx: QueryCtx | MutationCtx,
  date: string,
): Promise<{
  grid: Doc<"grids">;
  validAnswers: Record<string, string[]>;
}> {
  const grid = await requireGridForDate(ctx, date);
  const validAnswers = await getGridAnswers(ctx, grid);
  if (!validAnswers) {
    // Une grille publiée sans son satellite est une indisponibilité de données,
    // jamais une erreur du joueur.
    throw new ConvexError("Grid answers unavailable");
  }
  return { grid, validAnswers };
}
