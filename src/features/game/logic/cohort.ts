import type { CellGuessDistribution } from "../types";
import { ESTIMATED_MAX_TOTAL } from "./constants";
import {
  type GameRecord,
  recordCells,
  recordLivesRemaining,
  recordStatus,
} from "./gameRecord";
import { GRID_CELL_COUNT } from "./gridTopology";
import { computeScore, computeScoreBreakdown } from "./scoreVariant";

/**
 * « Toi et les autres » (#70). Le serveur recalcule le score de chaque partie
 * finie du jour et renvoie un histogramme de 101 seaux de 10 points (0 à 1000)
 * avec le nombre de joueurs qui se sont trompés au moins une fois sur chaque
 * case. Le client se place lui-même dans l'histogramme ; le nombre de joueurs
 * ne s'affiche jamais.
 */

export const SCORE_BUCKET_SIZE = 10;
/** 0, 10… 1000 : le score maximal a son propre seau. */
export const SCORE_BUCKET_COUNT = 101;
/** Largeur d'une barre du graphique, en seaux (50 points). */
export const CHART_BUCKETS_PER_BAR = 5;
export const CHART_BAR_COUNT = Math.floor(
  SCORE_BUCKET_COUNT / CHART_BUCKETS_PER_BAR,
);
export const SCORE_MAX = (SCORE_BUCKET_COUNT - 1) * SCORE_BUCKET_SIZE;

/**
 * Sous ce nombre de parties finies, la comparaison ne veut rien dire : même
 * seuil que la rareté provisoire (marqueur « ≈ »).
 */
export const THIN_COHORT_MAX = ESTIMATED_MAX_TOTAL;

export type Cohort = {
  histogram: number[];
  /** Joueurs ayant fini qui se sont trompés au moins une fois, par case. */
  failedPlayers: number[];
};

export function emptyCohort(): Cohort {
  return {
    histogram: Array.from({ length: SCORE_BUCKET_COUNT }, () => 0),
    failedPlayers: Array.from({ length: GRID_CELL_COUNT }, () => 0),
  };
}

export function scoreBucket(total: number): number {
  return Math.max(
    0,
    Math.min(SCORE_BUCKET_COUNT - 1, Math.floor(total / SCORE_BUCKET_SIZE)),
  );
}

/** Score d'une partie quotidienne, sur la répartition courante. */
export function scoreRecord(
  record: GameRecord,
  validAnswers: Record<string, string[]>,
  distribution: Record<string, CellGuessDistribution>,
): number {
  const breakdown = computeScoreBreakdown(
    {
      mode: "daily",
      cells: recordCells(record, validAnswers),
      lives: { kind: "limited", remaining: recordLivesRemaining(record) },
    },
    distribution,
  );
  // Une part manquante (case sans répartition) ne rapporte rien : côté
  // serveur, chaque case remplie a toujours été comptée dans `cellStats`.
  return (
    computeScore({ ...breakdown, shares: breakdown.shares ?? [] }).total ?? 0
  );
}

/** Agrège les parties finies ; une partie en cours n'entre pas dans la cohorte. */
export function buildCohort(
  records: readonly GameRecord[],
  validAnswers: Record<string, string[]>,
  distribution: Record<string, CellGuessDistribution>,
): Cohort {
  const cohort = emptyCohort();
  records.forEach((record) => {
    if (recordStatus(record, validAnswers) === "playing") return;
    cohort.histogram[
      scoreBucket(scoreRecord(record, validAnswers, distribution))
    ] += 1;
    record.failed.forEach((count, index) => {
      if (count > 0) cohort.failedPlayers[index] += 1;
    });
  });
  return cohort;
}

export function cohortSize(histogram: readonly number[]): number {
  return histogram.reduce((sum, n) => sum + n, 0);
}

export function isThinCohort(histogram: readonly number[]): boolean {
  return cohortSize(histogram) < THIN_COHORT_MAX;
}

/**
 * Part des joueurs que le score dépasse, en pourcentage entier : les seaux
 * inférieurs, plus la moitié du sien (les ex æquo comptent pour moitié).
 */
export function betterThanPercent(
  histogram: readonly number[],
  total: number,
): number {
  const size = cohortSize(histogram);
  if (size === 0) return 0;
  const own = scoreBucket(total);
  const below = histogram.slice(0, own).reduce((sum, n) => sum + n, 0);
  return Math.round(((below + histogram[own] / 2) / size) * 100);
}

/** Score médian, au milieu de son seau. `null` sans partie finie. */
export function medianScore(histogram: readonly number[]): number | null {
  const size = cohortSize(histogram);
  if (size === 0) return null;
  let cumulative = 0;
  const bucket = histogram.findIndex((n) => {
    cumulative += n;
    return cumulative >= size / 2;
  });
  return Math.min(
    SCORE_MAX,
    bucket * SCORE_BUCKET_SIZE + SCORE_BUCKET_SIZE / 2,
  );
}

/** Barres de 50 points : le seau 1000 rejoint la dernière barre. */
export function chartBars(histogram: readonly number[]): number[] {
  return Array.from({ length: CHART_BAR_COUNT }, (_, bar) =>
    histogram
      .slice(
        bar * CHART_BUCKETS_PER_BAR,
        bar === CHART_BAR_COUNT - 1
          ? SCORE_BUCKET_COUNT
          : (bar + 1) * CHART_BUCKETS_PER_BAR,
      )
      .reduce((sum, n) => sum + n, 0),
  );
}

export function chartBarIndex(total: number): number {
  return Math.min(
    CHART_BAR_COUNT - 1,
    Math.floor(scoreBucket(total) / CHART_BUCKETS_PER_BAR),
  );
}

/** Taux d'erreur par case (0..1) ; `null` tant que la cohorte est mince. */
export function failureRates(cohort: {
  failedPlayers: readonly number[];
  finishedGames: number;
}): number[] | null {
  if (cohort.finishedGames < THIN_COHORT_MAX) return null;
  return cohort.failedPlayers.map((n) => n / cohort.finishedGames);
}
