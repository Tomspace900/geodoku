import { v } from "convex/values";
import type { CellCounts } from "../src/features/game/logic/distribution";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { query } from "./_generated/server";
import { CELL_KEYS, type CellKey } from "./cellKeys";
import { todayUTC } from "./lib/dates";

/**
 * Répartition d'une grille : `v.record` et non `v.object` indexé par
 * `CELL_KEYS`, car Convex refuse à la publication un validateur d'objet dont
 * les clés ne sont pas des identifiants (« 0,0 » n'en est pas un).
 */
export const cellCountsValidator = v.record(
  v.string(),
  v.record(v.string(), v.number()),
);

/** Les 9 documents d'une date, une case absente valant une répartition vide. */
export async function readCellCounts(
  ctx: QueryCtx | MutationCtx,
  date: string,
): Promise<CellCounts> {
  const rows = await ctx.db
    .query("cellStats")
    .withIndex("by_date_and_cell", (q) => q.eq("date", date))
    .take(CELL_KEYS.length);
  const byCell = new Map(rows.map((row) => [row.cellKey, row.counts]));
  return Object.fromEntries(
    CELL_KEYS.map((cellKey) => [cellKey, byCell.get(cellKey) ?? {}]),
  );
}

/** Compte un pays posé ; renvoie sa part pour l'event `guess_submitted`. */
export async function incrementCellStat(
  ctx: MutationCtx,
  date: string,
  cellKey: CellKey,
  countryCode: string,
): Promise<{ count: number; total: number }> {
  const row = await ctx.db
    .query("cellStats")
    .withIndex("by_date_and_cell", (q) =>
      q.eq("date", date).eq("cellKey", cellKey),
    )
    .unique();
  const counts = { ...(row?.counts ?? {}) };
  counts[countryCode] = (counts[countryCode] ?? 0) + 1;
  if (row) {
    await ctx.db.patch(row._id, { counts });
  } else {
    await ctx.db.insert("cellStats", { date, cellKey, counts });
  }
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  return { count: counts[countryCode], total };
}

/**
 * Répartition live de la grille du jour, abonnée pendant la partie pour les
 * badges de rareté. Sans argument ni identité : un seul calcul en cache pour
 * tous les joueurs, invalidé par les seuls coups réussis.
 */
export const getToday = query({
  args: {},
  returns: cellCountsValidator,
  handler: async (ctx) => await readCellCounts(ctx, todayUTC()),
});
