import { ConvexError } from "convex/values";
import { isCountryCode } from "../content/countries/countryCodes";
import {
  GRID_CELL_COUNT,
  STARTING_LIVES,
} from "../src/features/game/logic/gridTopology";
import { classifyReplayDate } from "../src/features/game/logic/replayWindow";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { getGridAnswers } from "./gridData";
import { todayUTC } from "./lib/dates";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CLIENT_ID_PATTERN = /^[A-Za-z0-9:_-]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const MIN_CLIENT_ID_LENGTH = 8;
const MAX_CLIENT_ID_LENGTH = 128;

export { GRID_CELL_COUNT, STARTING_LIVES };

export type GameEndReason = "win" | "lives" | "blocked";
export type GameEndInput = {
  endReason: GameEndReason;
  livesLeft: number;
  filledCells: number;
  guessesSubmitted: number;
};

export function assertOperationId(operationId: string): void {
  if (!UUID_PATTERN.test(operationId)) {
    throw new ConvexError("Invalid operationId");
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

export function assertCountryCode(countryCode: string): void {
  if (!isCountryCode(countryCode)) {
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

export function assertValidGameEnd(input: GameEndInput): void {
  if (
    !Number.isInteger(input.livesLeft) ||
    input.livesLeft < 0 ||
    input.livesLeft > STARTING_LIVES
  ) {
    throw new ConvexError("Invalid livesLeft");
  }
  if (
    !Number.isInteger(input.filledCells) ||
    input.filledCells < 0 ||
    input.filledCells > GRID_CELL_COUNT
  ) {
    throw new ConvexError("Invalid filledCells");
  }
  const expectedGuesses =
    input.filledCells + (STARTING_LIVES - input.livesLeft);
  if (
    !Number.isInteger(input.guessesSubmitted) ||
    input.guessesSubmitted !== expectedGuesses
  ) {
    throw new ConvexError("Invalid guessesSubmitted");
  }

  if (input.endReason === "win") {
    if (input.filledCells !== GRID_CELL_COUNT || input.livesLeft <= 0) {
      throw new ConvexError("Invalid win state");
    }
    return;
  }
  if (input.filledCells >= GRID_CELL_COUNT) {
    throw new ConvexError("Invalid loss state");
  }
  if (input.endReason === "lives" && input.livesLeft !== 0) {
    throw new ConvexError("Invalid lives loss state");
  }
  if (input.endReason === "blocked" && input.livesLeft <= 0) {
    throw new ConvexError("Invalid blocked loss state");
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
