import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";

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
