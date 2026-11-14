import { v } from "convex/values";
import { buildCohort } from "../src/features/game/logic/cohort";
import { toGuessDistribution } from "../src/features/game/logic/distribution";
import { blockableAnswers } from "../src/features/stats/logic/finishedDay";
import { query } from "./_generated/server";
import { cellCountsValidator, readCellCounts } from "./cellStats";
import { readGamesForDate } from "./games";
import { assertFinishedDate } from "./gameWriteValidation";
import { getGridAnswers } from "./gridData";

/**
 * Un jour fini, pour « Mes stats » (#155) : ses 6 contraintes, sa répartition
 * finale, les réponses des seules cases qui peuvent se bloquer (8 réponses
 * ou moins), qui disent si une partie passée s'est finie par blocage, et
 * l'histogramme des scores des parties finies ce jour-là (imports exclus),
 * qui place le joueur dans le tiroir du jour (« Mieux que X % »).
 *
 * Sans identité et pour un jour qui ne change plus : le résultat est le même
 * pour tous les joueurs, partagé en cache côté serveur, et le navigateur le
 * garde. Une date d'aujourd'hui ou future est refusée (`assertFinishedDate`) ;
 * une grille absente renvoie `null`, simple trou de données.
 */
export const getFinishedDay = query({
  args: { date: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      date: v.string(),
      rows: v.array(v.string()),
      cols: v.array(v.string()),
      counts: cellCountsValidator,
      blockableAnswers: v.record(v.string(), v.array(v.string())),
      histogram: v.array(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    assertFinishedDate(args.date);
    const grid = await ctx.db
      .query("grids")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .unique();
    if (!grid) return null;
    const [validAnswers, counts, games] = await Promise.all([
      getGridAnswers(ctx, grid),
      readCellCounts(ctx, args.date),
      readGamesForDate(ctx, args.date),
    ]);
    const answers = validAnswers ?? {};
    return {
      date: grid.date,
      rows: grid.rows,
      cols: grid.cols,
      counts,
      blockableAnswers: blockableAnswers(answers),
      histogram: buildCohort(games, answers, toGuessDistribution(counts))
        .histogram,
    };
  },
});
