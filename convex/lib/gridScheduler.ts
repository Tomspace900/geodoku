import {
  BONUS_FRESHNESS_THRESHOLDS,
  BONUS_TIERS,
  HISTORY_WINDOW,
  KNOWN_CONSTRAINT_WINDOW,
  MAX_NEW_CONSTRAINTS_PER_GRID,
  MIN_CONSTRAINT_GAP_DAYS,
  OVERLAP_PENALTY,
  type PoolGridMetadata,
} from "./gridConstants";

type PoolGrid = {
  _id: string;
  rows: string[];
  cols: string[];
  metadata: PoolGridMetadata;
};

type RecentGrid = {
  rows: string[];
  cols: string[];
};

/** Les 9 croisements d'une grille : paires {ligne × colonne}, triées et stables. */
function crossingsOf(rows: string[], cols: string[]): string[] {
  const out: string[] = [];
  for (const r of rows)
    for (const c of cols) out.push(r < c ? `${r}|${c}` : `${c}|${r}`);
  return out;
}

/**
 * Greedy scheduler: picks the available pool grid that is least redundant with
 * the recent ones — so consecutive days don't resemble each other. A constraint
 * may recur often as long as the *grid context* changes; we constrain the grid,
 * not the single constraint.
 *
 * Selection:
 *   1. Cold-start guard (`withinNewConstraintBudget`) — weave newly-added
 *      constraints in one at a time instead of flooding.
 *   2. Hard filters (each with fallback to the previous set if it empties):
 *      a. recency gap — drop grids reusing a constraint seen within the last
 *         MIN_CONSTRAINT_GAP_DAYS days (never the same constraint two days running);
 *      b. crossing — drop grids whose any cell {row × col} reappeared within the
 *         trailing HISTORY_WINDOW (never relive the same cell in the window).
 *   3. Score = freshness bonus − overlap malus, argmax.
 *      - malus = Σ over the HISTORY_WINDOW grids of OVERLAP_PENALTY[shared
 *        constraints] — penalises redundancy with the recent grids;
 *      - bonus = Σ over the grid's 6 constraints of BONUS_TIERS[staleness tier],
 *        the tier rising with days-since-last-seen — rewards long-unseen constraints
 *        and bounds how long any can vanish.
 *      The malus scale dominates the bonus (512 vs 64), so non-redundancy stays the
 *      priority and the bonus only rebalances rotation.
 *
 * `recentGrids` must be most-recent-first and span KNOWN_CONSTRAINT_WINDOW: its whole
 * extent feeds the cold-start guard and the staleness bonus; its first HISTORY_WINDOW
 * entries drive the crossing filter and the overlap malus; its first
 * MIN_CONSTRAINT_GAP_DAYS−1 entries drive the gap filter.
 */
export function selectNextGrid(
  pool: PoolGrid[],
  recentGrids: RecentGrid[],
): { grid: PoolGrid; score: number } | null {
  if (pool.length === 0) return null;

  const idsOf = (g: RecentGrid) => [...g.rows, ...g.cols];

  // Constraints seen too recently for the gap filter (last GAP−1 days).
  const tooRecent = new Set<string>();
  for (const g of recentGrids.slice(0, MIN_CONSTRAINT_GAP_DAYS - 1))
    for (const id of idsOf(g)) tooRecent.add(id);

  // Crossings and constraint-sets within the redundancy window.
  const windowGrids = recentGrids.slice(0, HISTORY_WINDOW);
  const recentCrossings = new Set<string>();
  for (const g of windowGrids)
    for (const x of crossingsOf(g.rows, g.cols)) recentCrossings.add(x);
  const windowSets = windowGrids.map((g) => new Set(idsOf(g)));

  // Days since each constraint last appeared (recentGrids[0] = yesterday → 1),
  // for the freshness bonus. Absent from the whole window → treated as the cap.
  const daysSince: Record<string, number> = {};
  recentGrids.forEach((g, i) => {
    for (const id of idsOf(g))
      if (daysSince[id] === undefined) daysSince[id] = i + 1;
  });
  const staleCap =
    BONUS_FRESHNESS_THRESHOLDS[BONUS_FRESHNESS_THRESHOLDS.length - 1];

  const budgeted = withinNewConstraintBudget(pool, recentGrids);

  // Hard filter a — recency gap.
  const gapOk = budgeted.filter(
    (grid) => !grid.metadata.constraintIds.some((id) => tooRecent.has(id)),
  );
  const afterGap = gapOk.length > 0 ? gapOk : budgeted;

  // Hard filter b — no repeated crossing.
  const crossOk = afterGap.filter(
    (grid) =>
      !crossingsOf(grid.rows, grid.cols).some((x) => recentCrossings.has(x)),
  );
  const candidates = crossOk.length > 0 ? crossOk : afterGap;

  // Score = freshness bonus − overlap malus.
  let best: PoolGrid | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  const maxIdx = OVERLAP_PENALTY.length - 1;

  for (const grid of candidates) {
    const ids = grid.metadata.constraintIds;
    const set = new Set(ids);
    let malus = 0;
    for (const ws of windowSets) {
      let shared = 0;
      for (const id of set) if (ws.has(id)) shared++;
      malus += OVERLAP_PENALTY[Math.min(shared, maxIdx)];
    }
    let bonus = 0;
    for (const id of ids) {
      bonus += BONUS_TIERS[freshnessTier(daysSince[id] ?? staleCap)];
    }
    const score = bonus - malus;
    if (score > bestScore) {
      bestScore = score;
      best = grid;
    }
  }

  return best ? { grid: best, score: bestScore } : null;
}

/** Palier de fraîcheur : nombre de seuils d'ancienneté franchis (0..tiers). */
function freshnessTier(daysSince: number): number {
  let tier = 0;
  for (const threshold of BONUS_FRESHNESS_THRESHOLDS) {
    if (daysSince >= threshold) tier++;
  }
  return tier;
}

/**
 * Restricts the pool to grids introducing at most MAX_NEW_CONSTRAINTS_PER_GRID
 * "newcomer" constraints — those absent from the trailing KNOWN_CONSTRAINT_WINDOW of
 * published grids — so a freshly-added batch is woven in one at a time instead of
 * flooding the schedule. Skipped until the history spans a full KNOWN_CONSTRAINT_WINDOW:
 * a shorter history means from-scratch seeding, where every constraint is legitimately
 * new and must not be throttled. Falls back to the full pool if the cap leaves nothing.
 */
function withinNewConstraintBudget(
  pool: PoolGrid[],
  recentGrids: RecentGrid[],
): PoolGrid[] {
  if (recentGrids.length < KNOWN_CONSTRAINT_WINDOW) return pool;

  const seen = new Set<string>();
  for (const g of recentGrids)
    for (const id of [...g.rows, ...g.cols]) seen.add(id);

  const eligible = pool.filter(
    (grid) =>
      grid.metadata.constraintIds.filter((id) => !seen.has(id)).length <=
      MAX_NEW_CONSTRAINTS_PER_GRID,
  );
  return eligible.length > 0 ? eligible : pool;
}
