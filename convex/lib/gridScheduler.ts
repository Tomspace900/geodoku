import {
  FRESH_CONSTRAINT_BONUS,
  FRESH_COUNTRY_BONUS,
  HISTORY_WINDOW,
  KNOWN_CONSTRAINT_WINDOW,
  MAX_NEW_CONSTRAINTS_PER_GRID,
  NEWCOMER_GRADUATION_USES,
  OVERUSE_CONSTRAINT_MALUS,
  type PoolGridMetadata,
} from "./gridConstants";

type PoolGrid = {
  _id: string;
  rows: string[];
  cols: string[];
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
 *
 * Cold-start guard: candidate grids are first restricted so a freshly-added batch of
 * constraints is woven in gradually instead of flooding the schedule — see
 * `withinNewConstraintBudget`. `recentGrids` must be most-recent first and span the full
 * KNOWN_CONSTRAINT_WINDOW: its whole extent feeds the guard ("already published"), while
 * only its first HISTORY_WINDOW entries drive freshness/overuse.
 */
export function selectNextGrid(
  pool: PoolGrid[],
  recentGrids: RecentGrid[],
): { grid: PoolGrid; score: number } | null {
  if (pool.length === 0) return null;

  const recent = recentGrids.slice(0, HISTORY_WINDOW);
  const constraintUsage = countUsage(recent.flatMap((g) => g.constraintIds));
  const countryUsage = countUsage(recent.flatMap((g) => g.countryPool));

  const candidates = withinNewConstraintBudget(pool, recentGrids);

  let best: PoolGrid | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const grid of candidates) {
    const ids = grid.metadata.constraintIds;

    const fresh = ids.filter((id) => (constraintUsage[id] ?? 0) === 0).length;
    const overuse = ids.reduce(
      (s, id) => s + Math.max(0, (constraintUsage[id] ?? 0) - 2),
      0,
    );

    const newCountries = grid.metadata.countryPool.filter(
      (c) => (countryUsage[c] ?? 0) === 0,
    ).length;

    const score =
      fresh * FRESH_CONSTRAINT_BONUS -
      overuse * OVERUSE_CONSTRAINT_MALUS +
      newCountries * FRESH_COUNTRY_BONUS;

    if (score > bestScore) {
      bestScore = score;
      best = grid;
    }
  }

  return best ? { grid: best, score: bestScore } : null;
}

/**
 * Restricts the pool to grids introducing at most MAX_NEW_CONSTRAINTS_PER_GRID
 * "newcomer" constraints — those used fewer than NEWCOMER_GRADUATION_USES times across
 * the trailing KNOWN_CONSTRAINT_WINDOW — so a freshly-added batch is woven in gradually
 * instead of flooding the schedule. Counting uses (not mere presence) keeps a just-
 * debuted constraint budgeted until it graduates, stopping it from recurring as a
 * passenger in the days right after its debut. Skipped until the history spans a full
 * KNOWN_CONSTRAINT_WINDOW: a shorter history means from-scratch seeding, where every
 * constraint is legitimately new and must not be throttled. Falls back to the full pool
 * if the cap leaves nothing schedulable.
 */
function withinNewConstraintBudget(
  pool: PoolGrid[],
  recentGrids: RecentGrid[],
): PoolGrid[] {
  if (recentGrids.length < KNOWN_CONSTRAINT_WINDOW) return pool;

  const usage = countUsage(recentGrids.flatMap((g) => g.constraintIds));
  const isNewcomer = (id: string) =>
    (usage[id] ?? 0) < NEWCOMER_GRADUATION_USES;

  const eligible = pool.filter(
    (g) =>
      g.metadata.constraintIds.filter(isNewcomer).length <=
      MAX_NEW_CONSTRAINTS_PER_GRID,
  );
  return eligible.length > 0 ? eligible : pool;
}

function countUsage(items: string[]): Record<string, number> {
  const usage: Record<string, number> = {};
  for (const item of items) {
    usage[item] = (usage[item] ?? 0) + 1;
  }
  return usage;
}
