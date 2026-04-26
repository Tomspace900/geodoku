import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  gridCandidates: defineTable({
    rows: v.array(v.string()),
    cols: v.array(v.string()),
    validAnswers: v.record(v.string(), v.array(v.string())),
    metadata: v.object({
      seedConstraint: v.string(),
      constraintIds: v.array(v.string()),
      categories: v.array(v.string()),
      avgCellSize: v.number(),
      minCellSize: v.number(),
      countryPool: v.array(v.string()),
      difficultyEstimate: v.number(),
      difficultyTags: v.object({
        easy: v.number(),
        medium: v.number(),
        hard: v.number(),
      }),
      cellDifficulties: v.array(v.number()),
    }),
    status: v.union(
      v.literal("available"),
      v.literal("used"),
      v.literal("rejected"),
    ),
    usedAt: v.optional(v.number()),
    usedForDate: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_status_and_seed", ["status", "metadata.seedConstraint"]),

  grids: defineTable({
    date: v.string(), // "YYYY-MM-DD"
    rows: v.array(v.string()),
    cols: v.array(v.string()),
    validAnswers: v.record(v.string(), v.array(v.string())),
    difficulty: v.number(),
    candidateId: v.id("gridCandidates"),
  }).index("by_date", ["date"]),

  guesses: defineTable({
    date: v.string(),
    cellKey: v.string(),
    countryCode: v.string(),
    count: v.number(),
  })
    .index("by_date_and_cell_and_country", ["date", "cellKey", "countryCode"])
    .index("by_date_and_cell", ["date", "cellKey"]),

  dailyStats: defineTable({
    date: v.string(),
    cellKey: v.string(),
    totalGuesses: v.number(),
  }).index("by_date_and_cell", ["date", "cellKey"]),

  gridFeedback: defineTable({
    date: v.string(),
    tooEasyCount: v.number(),
    balancedCount: v.number(),
    tooHardCount: v.number(),
    totalRatings: v.number(),
    wins: v.number(),
    losses: v.number(),
    totalLivesLeft: v.number(),
    totalFilledCells: v.number(),
    totalGuessesSubmitted: v.number(),
  }).index("by_date", ["date"]),
});
