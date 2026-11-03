import { type ObjectType, v } from "convex/values";
import { REPLAY_WINDOW_DAYS } from "../src/features/game/logic/replayWindow";
import type { QueryCtx } from "./_generated/server";
import { assertReplayableDate } from "./gameWriteValidation";
import { getGridAnswers } from "./gridData";
import { daysAgoUTC, todayUTC } from "./lib/dates";

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
    date: grid.date,
    rows: grid.rows,
    cols: grid.cols,
    validAnswers,
  };
}

const validAnswersValidator = v.record(v.string(), v.array(v.string()));

/**
 * Grille du jour servie au joueur, réponses figées comprises (la saisie est
 * local-first). Réduite à ce que le joueur consomme : aucun identifiant interne.
 */
export const todayGridReturns = v.union(
  v.null(),
  v.object({
    date: v.string(),
    rows: v.array(v.string()),
    cols: v.array(v.string()),
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
