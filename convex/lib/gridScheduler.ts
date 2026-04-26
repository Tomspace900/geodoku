import {
  DIFFICULTY_PROXIMITY_WEIGHT,
  FRESH_CONSTRAINT_BONUS,
  FRESH_COUNTRY_BONUS,
  HISTORY_WINDOW,
  OVERUSE_CONSTRAINT_MALUS,
  type PoolGridMetadata,
  TARGET_DIFFICULTY,
} from "./gridConstants";

type PoolGrid = {
  _id: string;
  rows: string[];
  cols: string[];
  validAnswers: Record<string, string[]>;
  metadata: PoolGridMetadata;
};

type RecentGrid = {
  constraintIds: string[];
  countryPool: string[];
};

/**
 * Greedy scheduler: picks the available pool grid that best completes
 * the recent 15-day constraint/country diversity.
 *
 * Score = fresh_constraints × bonus
 *       - overused_constraints × malus
 *       + new_countries × bonus
 *       + difficulty_proximity × weight
 */
export function selectNextGrid(
  pool: PoolGrid[],
  recentGrids: RecentGrid[],
): { grid: PoolGrid; score: number } | null {
  if (pool.length === 0) return null;

  const recent = recentGrids.slice(0, HISTORY_WINDOW);
  const constraintUsage = countUsage(recent.flatMap((g) => g.constraintIds));
  const countryUsage = countUsage(recent.flatMap((g) => g.countryPool));

  let best: PoolGrid | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const grid of pool) {
    const ids = grid.metadata.constraintIds;

    const fresh = ids.filter((id) => (constraintUsage[id] ?? 0) === 0).length;
    const overuse = ids.reduce(
      (s, id) => s + Math.max(0, (constraintUsage[id] ?? 0) - 2),
      0,
    );

    const newCountries = grid.metadata.countryPool.filter(
      (c) => (countryUsage[c] ?? 0) === 0,
    ).length;

    const diff = grid.metadata.difficultyEstimate;
    const proximity = 1 - Math.abs(diff - TARGET_DIFFICULTY) / 100;

    const score =
      fresh * FRESH_CONSTRAINT_BONUS -
      overuse * OVERUSE_CONSTRAINT_MALUS +
      newCountries * FRESH_COUNTRY_BONUS +
      proximity * DIFFICULTY_PROXIMITY_WEIGHT;

    if (score > bestScore) {
      bestScore = score;
      best = grid;
    }
  }

  return best ? { grid: best, score: bestScore } : null;
}

function countUsage(items: string[]): Record<string, number> {
  const usage: Record<string, number> = {};
  for (const item of items) {
    usage[item] = (usage[item] ?? 0) + 1;
  }
  return usage;
}
