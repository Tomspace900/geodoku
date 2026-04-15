/**
 * Pure TypeScript — grid contextual scoring (phase 2).
 * Compares a candidate grid to recently published grids to penalize
 * repetition of constraints, constraint pairs, and structural similarity.
 *
 * Kept separate from gridGenerator.ts because it depends on runtime history,
 * not on the constraint/country static data.
 */
import { CONSTRAINTS } from "../../src/features/game/logic/constraints";

// ─── Constants ────────────────────────────────────────────────────────────────

export const CONTEXT_HISTORY_WINDOW = 15;

// ─── Types ────────────────────────────────────────────────────────────────────

export type GridContextInput = {
  rows: string[];
  cols: string[];
  validAnswers: Record<string, string[]>;
};

export type GridContextMetrics = {
  countryReuseRate: number;
  criteriaReuseRate: number;
  criteriaPairReuseRate: number;
  structureSimilarity: number;
  criteriaTypeDiversity: number;
  contextScore: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function unionCountries(grid: GridContextInput): Set<string> {
  const set = new Set<string>();
  for (const codes of Object.values(grid.validAnswers)) {
    for (const code of codes) set.add(code);
  }
  return set;
}

/**
 * Unordered pair key "a|b" where a < b lexicographically. Ensures that
 * "Asie × Enclavé" and "Enclavé × Asie" are considered the same combo.
 */
function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function allPairKeys(grid: GridContextInput): Set<string> {
  const keys = new Set<string>();
  for (const r of grid.rows) {
    for (const c of grid.cols) {
      keys.add(pairKey(r, c));
    }
  }
  return keys;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) {
    if (b.has(x)) inter += 1;
  }
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

// Pre-build constraint → category lookup once at module load.
const CATEGORY_BY_ID: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const c of CONSTRAINTS) map[c.id] = c.category;
  return map;
})();

const DISTINCT_CATEGORY_COUNT = (() => {
  const s = new Set<string>();
  for (const c of CONSTRAINTS) s.add(c.category);
  return s.size;
})();

function categorySignature(grid: GridContextInput): string[] {
  const cats = [...grid.rows, ...grid.cols].map(
    (id) => CATEGORY_BY_ID[id] ?? "unknown",
  );
  return cats.sort();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Computes contextual metrics for a candidate grid against published history.
 * History should be the N most-recently published grids (CONTEXT_HISTORY_WINDOW).
 */
export function computeGridContext(
  candidate: GridContextInput,
  history: GridContextInput[],
): GridContextMetrics {
  // Empty history → no signal, we reward maximally. This happens only on cold start.
  if (history.length === 0) {
    const distinctCats = new Set(categorySignature(candidate)).size;
    const minCategories = 4;
    const criteriaTypeDiversity = clamp01(
      (distinctCats - minCategories) /
        Math.max(1, DISTINCT_CATEGORY_COUNT - minCategories),
    );
    return {
      countryReuseRate: 0,
      criteriaReuseRate: 0,
      criteriaPairReuseRate: 0,
      structureSimilarity: 0,
      criteriaTypeDiversity,
      contextScore: Math.round(
        clamp01(
          0.35 * 1 + 0.25 * 1 + 0.2 * 1 + 0.1 * 1 + 0.1 * criteriaTypeDiversity,
        ) * 100,
      ),
    };
  }

  const candidateCountries = unionCountries(candidate);
  const candidateConstraintSet = new Set<string>([
    ...candidate.rows,
    ...candidate.cols,
  ]);
  const candidatePairs = allPairKeys(candidate);
  const candidateSignature = new Set(categorySignature(candidate));

  // Country reuse: moyenne sur l'historique du ratio d'intersection.
  let countryReuseSum = 0;
  for (const h of history) {
    const hCountries = unionCountries(h);
    if (candidateCountries.size === 0) continue;
    let shared = 0;
    for (const code of candidateCountries) {
      if (hCountries.has(code)) shared += 1;
    }
    countryReuseSum += shared / candidateCountries.size;
  }
  const countryReuseRate = countryReuseSum / history.length;

  // Criteria reuse: combien des 6 contraintes apparaissent dans au moins une
  // grille d'historique.
  const historyConstraints = new Set<string>();
  for (const h of history) {
    for (const id of h.rows) historyConstraints.add(id);
    for (const id of h.cols) historyConstraints.add(id);
  }
  let reusedConstraints = 0;
  for (const id of candidateConstraintSet) {
    if (historyConstraints.has(id)) reusedConstraints += 1;
  }
  const criteriaReuseRate = reusedConstraints / candidateConstraintSet.size;

  // Criteria pair reuse: combien des 9 paires row×col exactes existent
  // dans une grille d'historique.
  const historyPairs = new Set<string>();
  for (const h of history) {
    for (const key of allPairKeys(h)) historyPairs.add(key);
  }
  let reusedPairs = 0;
  for (const key of candidatePairs) {
    if (historyPairs.has(key)) reusedPairs += 1;
  }
  const criteriaPairReuseRate =
    candidatePairs.size === 0 ? 0 : reusedPairs / candidatePairs.size;

  // Structure similarity: max Jaccard de signature catégorielle vs historique.
  let structureSimilarity = 0;
  for (const h of history) {
    const hSig = new Set(categorySignature(h));
    const j = jaccard(candidateSignature, hSig);
    if (j > structureSimilarity) structureSimilarity = j;
  }

  // Type diversity: nombre de catégories distinctes parmi les 6 contraintes.
  const distinctCats = candidateSignature.size;
  const minCategories = 4;
  const criteriaTypeDiversity = clamp01(
    (distinctCats - minCategories) /
      Math.max(1, DISTINCT_CATEGORY_COUNT - minCategories),
  );

  const rawContext =
    0.35 * (1 - clamp01(criteriaPairReuseRate)) +
    0.25 * (1 - clamp01(structureSimilarity)) +
    0.2 * (1 - clamp01(criteriaReuseRate)) +
    0.1 * (1 - clamp01(countryReuseRate)) +
    0.1 * criteriaTypeDiversity;

  const contextScore = Math.round(clamp01(rawContext) * 100);

  return {
    countryReuseRate,
    criteriaReuseRate,
    criteriaPairReuseRate,
    structureSimilarity,
    criteriaTypeDiversity,
    contextScore,
  };
}
