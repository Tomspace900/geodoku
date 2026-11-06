import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

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

  // Une ligne par partie de la grille du jour (#70), au format du journal
  // local : ni vies, ni statut, ni score, tout se recalcule (`gameRecord.ts`).
  // Un anonyme est identifié par le hash d'un jeton propre à la partie : rien
  // ne relie deux parties d'un même joueur. Un compte (#155) l'est par son id
  // Better Auth, une partie par jour. `import` : entrée du journal d'un
  // appareil sans ligne serveur, copiée au rattachement ; elle ne compte que
  // pour « Mes stats », jamais dans les cohortes ni l'admin.
  games: defineTable({
    date: v.string(),
    owner: v.union(
      v.object({ kind: v.literal("anon"), tokenHash: v.string() }),
      v.object({ kind: v.literal("user"), userId: v.string() }),
    ),
    cells: v.array(v.union(v.string(), v.null())),
    failed: v.array(v.number()),
    origin: v.union(v.literal("live"), v.literal("import")),
  })
    .index("by_date", ["date"])
    .index("by_owner_token_hash", ["owner.tokenHash"])
    .index("by_owner_user_id_and_date", ["owner.userId", "date"]),

  // Profil d'un compte (#155) : le nom (« pseudo » ici, « nom » à l'écran) et
  // le pays facultatif. L'e-mail et les sessions vivent chez Better Auth.
  // Aucun score : tout se recalcule depuis les parties.
  profiles: defineTable({
    userId: v.string(),
    pseudo: v.string(),
    country: v.optional(v.string()),
  })
    .index("by_user_id", ["userId"])
    .index("by_pseudo", ["pseudo"]),

  // Nombre de joueurs par pays, un document par case et par jour. Seule donnée
  // dérivée stockée, tenue dans la même transaction que le coup : la lire coûte
  // 9 documents au lieu de toutes les parties. Une erreur n'y touche pas.
  cellStats: defineTable({
    date: v.string(),
    cellKey: v.string(),
    counts: v.record(v.string(), v.number()),
  }).index("by_date_and_cell", ["date", "cellKey"]),

  // Surveillance (`server_health_hourly`) : refus du rate limiter par heure UTC
  // ("YYYY-MM-DDTHH"), et la répartition vue au passage précédent du cron.
  healthCounters: defineTable({
    hour: v.string(),
    rateLimited: v.number(),
  }).index("by_hour", ["hour"]),
  healthSnapshots: defineTable({
    key: v.literal("singleton"),
    date: v.string(),
    counts: v.record(v.string(), v.record(v.string(), v.number())),
  }).index("by_key", ["key"]),
});
