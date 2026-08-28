import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { operationResultValidator } from "./operationResults";

export default defineSchema({
  gridCandidates: defineTable({
    rows: v.array(v.string()),
    cols: v.array(v.string()),
    metadata: v.object({
      seedConstraint: v.string(),
      constraintIds: v.array(v.string()),
      categories: v.array(v.string()),
      avgCellSize: v.number(),
      minCellSize: v.number(),
      countryPool: v.array(v.string()),
      // Legacy — difficulté prédite supprimée (2026-06), docs antérieurs uniquement
      difficultyEstimate: v.optional(v.number()),
      difficultyTags: v.optional(
        v.object({
          easy: v.number(),
          medium: v.number(),
          hard: v.number(),
        }),
      ),
      cellDifficulties: v.optional(v.array(v.number())),
    }),
    status: v.union(v.literal("available"), v.literal("used")),
    // Génération de pool. Optionnel pendant la migration : sans pointeur actif,
    // seules les candidates legacy (champ absent) constituent le pool actif.
    generationId: v.optional(v.string()),
    usedAt: v.optional(v.number()),
    usedForDate: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_generation_id_and_status", ["generationId", "status"])
    .index("by_status_and_seed", ["status", "metadata.seedConstraint"]),

  // Singleton opérationnel du pool. Les champs optionnels permettent le
  // cold-start et le fallback legacy sans backfill ni coupure de service.
  poolState: defineTable({
    key: v.literal("singleton"),
    activeGenerationId: v.optional(v.string()),
    jobId: v.optional(v.string()),
    leaseUntil: v.optional(v.number()),
  }).index("by_key", ["key"]),

  grids: defineTable({
    date: v.string(), // "YYYY-MM-DD"
    rows: v.array(v.string()),
    cols: v.array(v.string()),
    // Dénormalisé depuis metadata.countryPool pour éviter de lire le satellite
    // gridAnswers lors des agrégats scheduler/admin.
    countryPool: v.array(v.string()),
    // Legacy — difficulté prédite supprimée (2026-06), docs antérieurs uniquement
    difficulty: v.optional(v.number()),
    candidateId: v.id("gridCandidates"),
  })
    .index("by_date", ["date"])
    .index("by_candidate_id", ["candidateId"]),

  // Satellite : validAnswers extraits de gridCandidates pour alléger les
  // lectures en masse (scheduler, admin stats). 1-to-1 avec gridCandidates.
  gridAnswers: defineTable({
    candidateId: v.id("gridCandidates"),
    validAnswers: v.record(v.string(), v.array(v.string())),
  }).index("by_candidate", ["candidateId"]),

  guesses: defineTable({
    date: v.string(),
    cellKey: v.string(),
    countryCode: v.string(),
    count: v.number(),
    // Amorce rejeu : distingue la cohorte live (absent / false) des futurs
    // rejeux d'anciennes grilles (true). Le chemin d'écriture rejeu n'existe
    // pas encore — quand il arrivera, il devra inclure `isReplay` dans la clé
    // d'upsert (sinon un rejeu incrémenterait la ligne live). Cf. submitGuess.
    isReplay: v.optional(v.boolean()),
  })
    .index("by_date_and_cell_and_country", ["date", "cellKey", "countryCode"])
    .index("by_date_and_cell", ["date", "cellKey"]),

  dailyStats: defineTable({
    date: v.string(),
    cellKey: v.string(),
    totalGuesses: v.number(),
    // Tentatives infructueuses (pays valide mais ne satisfait pas le croisement)
    // par case. Permet de distinguer « case dure, beaucoup d'échecs » de « case
    // abandonnée, jamais tentée » — les deux ont aujourd'hui le même fillRate.
    failedAttempts: v.optional(v.number()),
  }).index("by_date_and_cell", ["date", "cellKey"]),

  gridFeedback: defineTable({
    date: v.string(),
    tooEasyCount: v.number(),
    balancedCount: v.number(),
    tooHardCount: v.number(),
    totalRatings: v.number(),
    wins: v.number(),
    losses: v.number(),
    // Ventilation des défaites par cause (sous-ensemble de `losses`). Optionnel
    // car les lignes gridFeedback créées avant l'ajout d'endReason ne les portent
    // pas (→ « cause inconnue ») ; toute nouvelle partie les renseigne.
    lostByLivesCount: v.optional(v.number()),
    lostByBlockedCount: v.optional(v.number()),
    totalLivesLeft: v.number(),
    totalFilledCells: v.number(),
    totalGuessesSubmitted: v.number(),
  }).index("by_date", ["date"]),

  // Reçus d'idempotence des écritures publiques du jeu. L'identifiant est
  // opaque et propre à une seule opération : aucune clé joueur stable n'est
  // stockée, afin de ne pas relier les choix entre cases ou entre jours.
  operationReceipts: defineTable({
    operationId: v.string(),
    operationType: v.union(
      v.literal("submit_guess"),
      v.literal("failed_guess"),
      v.literal("game_end"),
      v.literal("grid_feedback"),
    ),
    date: v.string(),
    canonicalPayload: v.string(),
    result: operationResultValidator,
    expiresAt: v.number(),
  })
    .index("by_operation_id", ["operationId"])
    .index("by_expires_at", ["expiresAt"]),
});
