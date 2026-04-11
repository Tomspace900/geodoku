import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  gridCandidates: defineTable({
    rows: v.array(v.string()), // 3 constraint IDs
    cols: v.array(v.string()), // 3 constraint IDs
    validAnswers: v.record(v.string(), v.array(v.string())), // "0,0" → ISO3[]
    score: v.number(),
    difficulty: v.number(), // 0-100
    metadata: v.object({
      minCellSize: v.number(),
      maxCellSize: v.number(),
      avgCellSize: v.number(),
      categoryCount: v.number(),
      avgObscurity: v.number(),
    }),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("used"), // promoted to grids table
    ),
    generatedAt: v.number(),
    reviewedAt: v.union(v.number(), v.null()),
    rejectionReason: v.union(v.string(), v.null()),
    usedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_status_and_score", ["status", "score"]),

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
    cellKey: v.string(), // "0,0" to "2,2"
    countryCode: v.string(), // ISO3
    count: v.number(),
  })
    .index("by_date_and_cell_and_country", ["date", "cellKey", "countryCode"])
    .index("by_date_and_cell", ["date", "cellKey"]),

  dailyStats: defineTable({
    date: v.string(),
    cellKey: v.string(),
    totalGuesses: v.number(),
  }).index("by_date_and_cell", ["date", "cellKey"]),
});
