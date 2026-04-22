/**
 * Pure TypeScript — grid contextual scoring (phase 2).
 * Compares a candidate grid to recently published grids to reward freshness
 * of constraints and countries, and penalize repetition of pairs and
 * structural similarity.
 *
 * Kept separate from gridGenerator.ts because it depends on runtime history,
 * not on the constraint/country static data.
 */
import { CONSTRAINTS } from "../../src/features/game/logic/constraints";

// ─── Constants ────────────────────────────────────────────────────────────────

export const CONTEXT_HISTORY_WINDOW = 15;

// Pondérations contextScore — somme = 1. `newCountryFraction` dropped
// post-audit (sd×w = 0.019, signal mort : les pays solutions se recouvrent
// beaucoup d'un jour à l'autre, écrasant la variance). Poids redistribué sur
// newConstraintFraction (+0.15) qui est le vrai signal de variété, et pairReuse
// (+0.05) pour renforcer la pénalité de paires exactes déjà vues.
const WEIGHT_PAIR_REUSE = 0.35;
const WEIGHT_STRUCT_SIM = 0.2;
const WEIGHT_NEW_CONSTRAINT = 0.45;

// ─── Types ────────────────────────────────────────────────────────────────────

export type GridContextInput = {
  rows: string[];
  cols: string[];
  validAnswers: Record<string, string[]>;
};

export type GridContextMetrics = {
  /** Proportion des 9 paires row×col déjà vues (↓ = plus frais). */
  criteriaPairReuseRate: number;
  /** Similarité max de signature catégorielle vs historique (↓ = plus frais). */
  structureSimilarity: number;
  /** Proportion des 6 contraintes du candidat absentes de l'historique. */
  newConstraintFraction: number;
  contextScore: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
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
  // Empty history → no signal, we reward maximally. Happens only on cold start.
  if (history.length === 0) {
    return {
      criteriaPairReuseRate: 0,
      structureSimilarity: 0,
      newConstraintFraction: 1,
      contextScore: 100,
    };
  }

  const candidateConstraintSet = new Set<string>([
    ...candidate.rows,
    ...candidate.cols,
  ]);
  const candidatePairs = allPairKeys(candidate);
  const candidateSignature = new Set(categorySignature(candidate));

  // Agrégats historiques.
  const historyConstraints = new Set<string>();
  const historyPairs = new Set<string>();
  for (const h of history) {
    for (const id of h.rows) historyConstraints.add(id);
    for (const id of h.cols) historyConstraints.add(id);
    for (const key of allPairKeys(h)) historyPairs.add(key);
  }

  // Criteria pair reuse : combien des 9 paires row×col exactes existent
  // déjà dans l'historique.
  let reusedPairs = 0;
  for (const key of candidatePairs) {
    if (historyPairs.has(key)) reusedPairs += 1;
  }
  const criteriaPairReuseRate =
    candidatePairs.size === 0 ? 0 : reusedPairs / candidatePairs.size;

  // Structure similarity : max Jaccard de signature catégorielle vs historique.
  let structureSimilarity = 0;
  for (const h of history) {
    const hSig = new Set(categorySignature(h));
    const j = jaccard(candidateSignature, hSig);
    if (j > structureSimilarity) structureSimilarity = j;
  }

  // Nouvelles contraintes : combien des 6 contraintes ne sont jamais apparues
  // dans l'historique. Pousse vers les contraintes orphelines.
  let newConstraints = 0;
  for (const id of candidateConstraintSet) {
    if (!historyConstraints.has(id)) newConstraints += 1;
  }
  const newConstraintFraction =
    candidateConstraintSet.size === 0
      ? 0
      : newConstraints / candidateConstraintSet.size;

  const rawContext =
    WEIGHT_PAIR_REUSE * (1 - clamp01(criteriaPairReuseRate)) +
    WEIGHT_STRUCT_SIM * (1 - clamp01(structureSimilarity)) +
    WEIGHT_NEW_CONSTRAINT * clamp01(newConstraintFraction);

  const contextScore = Math.round(clamp01(rawContext) * 100);

  return {
    criteriaPairReuseRate,
    structureSimilarity,
    newConstraintFraction,
    contextScore,
  };
}
