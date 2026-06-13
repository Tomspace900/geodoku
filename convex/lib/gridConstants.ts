// Hard filters — validated empirically, non-negotiable
export const MIN_CELL_SIZE = 3;
export const MAX_CELL_SIZE = 15;
export const MIN_CATEGORIES = 4;
export const MAX_SAME_CATEGORY = 2;

// Pool generation
export const TARGET_GRIDS_PER_SEED = 12;
export const MAX_ATTEMPTS_PER_SEED = 500;
export const MAX_OVERLAP_BETWEEN_GRIDS = 4; // out of 6 constraints

// Scheduler weights
export const HISTORY_WINDOW = 15;
export const FRESH_CONSTRAINT_BONUS = 10;
export const OVERUSE_CONSTRAINT_MALUS = 15;
export const FRESH_COUNTRY_BONUS = 1;

/**
 * Cold-start guard — gradual introduction of newly-added constraints.
 * When a batch of brand-new constraints is added to a mature catalogue, they are the
 * only ones the freshness term has never seen, so grids built mostly of newcomers would
 * otherwise be scheduled back-to-back and the whole batch would land within days. The
 * guard caps each grid to MAX_NEW_CONSTRAINTS_PER_GRID "newcomers" — constraints used
 * fewer than NEWCOMER_GRADUATION_USES times in the trailing KNOWN_CONSTRAINT_WINDOW — so
 * the batch is woven in gradually. Counting *uses* (not mere presence) keeps a just-
 * debuted constraint rate-limited until it has appeared a couple of times, instead of
 * riding along as a passenger in the very next grids. It engages only once the history
 * spans a full KNOWN_CONSTRAINT_WINDOW (a mature catalogue); a shorter history means
 * from-scratch seeding, where every constraint is legitimately new and the cap is skipped.
 */
export const MAX_NEW_CONSTRAINTS_PER_GRID = 1;
export const NEWCOMER_GRADUATION_USES = 2;
/** Trailing published grids that define "already established" (and the maturity gate). */
export const KNOWN_CONSTRAINT_WINDOW = HISTORY_WINDOW * 4;

// Auto-refill thresholds
export const POOL_LOW_THRESHOLD = 50;

export type PoolGridMetadata = {
  seedConstraint: string;
  constraintIds: string[];
  categories: string[];
  avgCellSize: number;
  minCellSize: number;
  countryPool: string[];
};

export type FinalizedPoolGrid = {
  rows: string[];
  cols: string[];
  validAnswers: Record<string, string[]>;
  metadata: PoolGridMetadata;
};

export type GenerationReport = {
  totalGenerated: number;
  seedResults: Array<{
    constraintId: string;
    attempted: number;
    succeeded: number;
    failed: boolean;
  }>;
  constraintCoverage: number;
  countryCoverage: number;
  durationMs: number;
};
