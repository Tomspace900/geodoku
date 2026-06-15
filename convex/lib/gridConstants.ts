// Hard filters — validated empirically, non-negotiable
export const MIN_CELL_SIZE = 3;
export const MAX_CELL_SIZE = 15;
export const MIN_CATEGORIES = 4;
export const MAX_SAME_CATEGORY = 2;

/**
 * Anti-redundancy filter — keep a grid thematically varied.
 *
 * MAX_CONSTRAINT_OVERLAP: max overlap coefficient |A∩B|/min(|A|,|B|) allowed
 * between any two constraints of a grid. Bans quasi-synonym pairs where one
 * constraint nearly implies another ("Caribbean countries" × "bordered by the
 * Caribbean sea" ≈ 1.0, or nested thresholds like "larger than Mexico" ×
 * "larger than France"), which collapse a grid into a single theme. Unlike
 * MAX_SAME_CATEGORY (caps same *category*), this catches cross-category nesting
 * (subregion ⊆ continent, ocean ⊆ continent…). This is intra-grid redundancy —
 * unrelated to the pool-share throttling tried & reverted (see generateDiversePool).
 *
 * Symmetric by construction: it only forbids the *co-occurrence* of two near-
 * synonyms in one grid, never favouring one over the other — "larger than Mexico"
 * and "larger than France" each still seed their full quota of grids and the
 * scheduler alternates them. A grid-level countryPool floor was considered and
 * rejected (2026-06): it biased representation against *narrow* constraints
 * (whose grids naturally have smaller answer pools — India lost ~22% of its
 * grids) for a marginal gain, since this overlap cap alone already keeps pools
 * healthy. Equity between near-synonyms is the point — that's the challenge.
 *
 * Calibrated at 0.85 (not lower): it bans the genuine near-synonyms (Caribbean ×
 * Caribbean-coast = 1.0, Caribbean × North-America = 1.0, nested area/density/pop
 * thresholds = 1.0) while sparing merely-correlated-but-distinct axes (Caribbean
 * × island = 0.846, Portuguese × Atlantic = 0.78, Russian × Asia = 0.75).
 * Stricter values (0.7) over-starved narrow constraints — Caribbean, Portuguese,
 * Russian, polar dropped to 0–3 grids and the cold-start rollout could no longer
 * weave them in. Validate any change with `pnpm simulate:scheduling` (failed
 * seeds + cold-start checks).
 */
export const MAX_CONSTRAINT_OVERLAP = 0.85;

// Pool generation
export const TARGET_GRIDS_PER_SEED = 12;
export const MAX_ATTEMPTS_PER_SEED = 500;
export const MAX_OVERLAP_BETWEEN_GRIDS = 4; // out of 6 constraints
/**
 * Below this many grids, a seed is treated as structurally orphaned (failed):
 * the generator warns, the report flags it, and the simulation counts it as a
 * failed seed. Seeds with this many or more grids but fewer than a comfortable
 * yield are merely "low-yield" (informational). Single source of truth for the
 * failed/low-yield split across generator, report and simulation.
 */
export const MIN_VIABLE_GRIDS_PER_SEED = 5;

// Scheduler weights
export const HISTORY_WINDOW = 15;
export const FRESH_CONSTRAINT_BONUS = 10;
export const OVERUSE_CONSTRAINT_MALUS = 15;
export const FRESH_COUNTRY_BONUS = 1;
/**
 * Overuse onset — a constraint earns the OVERUSE_CONSTRAINT_MALUS only once it
 * has appeared more than this many times within HISTORY_WINDOW. This carves the
 * freshness score into three zones: usage 0 → FRESH_CONSTRAINT_BONUS, usage
 * 1..OVERUSE_THRESHOLD → neutral (a recent constraint is allowed to recur a
 * little without penalty), usage > OVERUSE_THRESHOLD → malus per extra
 * appearance. See `selectNextGrid`.
 */
export const OVERUSE_THRESHOLD = 2;

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
