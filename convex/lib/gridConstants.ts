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
export const TARGET_DIFFICULTY = 40;
export const FRESH_CONSTRAINT_BONUS = 10;
export const OVERUSE_CONSTRAINT_MALUS = 15;
export const FRESH_COUNTRY_BONUS = 1;
export const DIFFICULTY_PROXIMITY_WEIGHT = 30;

// Auto-refill thresholds
export const POOL_LOW_THRESHOLD = 50;

export type DifficultyTag = "easy" | "medium" | "hard";

export type PoolGridMetadata = {
  seedConstraint: string;
  constraintIds: string[];
  categories: string[];
  avgCellSize: number;
  minCellSize: number;
  countryPool: string[];
  difficultyEstimate: number;
  difficultyTags: Record<DifficultyTag, number>;
  cellDifficulties: number[];
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
