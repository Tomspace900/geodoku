import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  gridCandidates: defineTable({
    rows: v.array(v.string()), // 3 constraint IDs
    cols: v.array(v.string()), // 3 constraint IDs
    validAnswers: v.record(v.string(), v.array(v.string())), // "0,0" → ISO3[]
    score: v.number(), // qualityScore 0-100 (intrinsèque)
    difficulty: v.number(), // 0-100, dérivé des cellMetrics
    contextScore: v.optional(v.number()), // 0-100, renseigné en phase 2
    metadata: v.object({
      // Agrégats cellule
      minCellSize: v.number(),
      maxCellSize: v.number(),
      avgCellSize: v.number(),
      // Catégories & notoriété
      categoryCount: v.number(),
      avgNotoriety: v.number(),
      // Dérivés des cellMetrics
      obviousCellCount: v.number(),
      criteriaOverlapScore: v.number(),
      constraintHardnessMean: v.number(),
      maxCellRisk: v.number(),
      avgCellRisk: v.number(),
      // Mix difficulté éditoriale (tags constraints, sur 6)
      easyConstraintCount: v.number(),
      hardConstraintCount: v.number(),
      // Granularité cellule : 9 entrées
      cellMetrics: v.array(
        v.object({
          cellKey: v.string(),
          solutionCount: v.number(),
          popularCount: v.number(),
          avgPopularity: v.number(),
        }),
      ),
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

  gridFeedback: defineTable({
    date: v.string(), // "YYYY-MM-DD"
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
