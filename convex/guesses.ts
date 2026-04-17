import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

const CELL_KEYS = [
  "0,0",
  "0,1",
  "0,2",
  "1,0",
  "1,1",
  "1,2",
  "2,0",
  "2,1",
  "2,2",
] as const;

/**
 * Pour chaque case : nombre total de tentatives et part (0..1) par pays parmi
 * les joueurs du jour — pour afficher la « rareté » d’une réponse de référence.
 */
export const getGuessDistributionForDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const out: Record<
      string,
      { totalGuesses: number; rarityByCountry: Record<string, number> }
    > = {};

    for (const cellKey of CELL_KEYS) {
      const stats = await ctx.db
        .query("dailyStats")
        .withIndex("by_date_and_cell", (q) =>
          q.eq("date", args.date).eq("cellKey", cellKey),
        )
        .unique();

      const totalGuesses = stats?.totalGuesses ?? 0;

      const rows = await ctx.db
        .query("guesses")
        .withIndex("by_date_and_cell", (q) =>
          q.eq("date", args.date).eq("cellKey", cellKey),
        )
        .collect();

      const rarityByCountry: Record<string, number> = {};
      if (totalGuesses > 0) {
        for (const row of rows) {
          rarityByCountry[row.countryCode] = row.count / totalGuesses;
        }
      }

      out[cellKey] = { totalGuesses, rarityByCountry };
    }

    return out;
  },
});

export const submitGuess = mutation({
  args: {
    date: v.string(),
    cellKey: v.string(),
    countryCode: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Load grid by date
    const grid = await ctx.db
      .query("grids")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .unique();
    if (!grid) throw new Error(`Grid not found for date: ${args.date}`);

    // 2. Verify the guess is a valid answer for this cell
    const validForCell = grid.validAnswers[args.cellKey];
    if (!validForCell?.includes(args.countryCode)) {
      throw new ConvexError("Invalid guess");
    }

    // 3. Upsert guess count
    const existing = await ctx.db
      .query("guesses")
      .withIndex("by_date_and_cell_and_country", (q) =>
        q
          .eq("date", args.date)
          .eq("cellKey", args.cellKey)
          .eq("countryCode", args.countryCode),
      )
      .unique();

    let count: number;
    if (existing) {
      count = existing.count + 1;
      await ctx.db.patch(existing._id, { count });
    } else {
      count = 1;
      await ctx.db.insert("guesses", {
        date: args.date,
        cellKey: args.cellKey,
        countryCode: args.countryCode,
        count: 1,
      });
    }

    // 4. Upsert daily stats
    const stats = await ctx.db
      .query("dailyStats")
      .withIndex("by_date_and_cell", (q) =>
        q.eq("date", args.date).eq("cellKey", args.cellKey),
      )
      .unique();

    let total: number;
    if (stats) {
      total = stats.totalGuesses + 1;
      await ctx.db.patch(stats._id, { totalGuesses: total });
    } else {
      total = 1;
      await ctx.db.insert("dailyStats", {
        date: args.date,
        cellKey: args.cellKey,
        totalGuesses: 1,
      });
    }

    return { count, total, rarity: count / total };
  },
});
