/**
 * Logique pure des métriques observées de l'admin (santé de jeu).
 *
 * Zéro React, zéro Convex : consommée par les composants admin et testée en
 * isolation. Les composants ne font que du formatting d'affichage.
 *
 * Faible trafic → tout est directionnel : on distingue partout « pas de
 * donnée » (`null` → `—`) de « zéro », et on gate le bruit d'échantillon.
 */

// ─── Constantes (mirroir scripts/export-analytics.ts) ──────────────────────────

/**
 * Date de déploiement de `failedAttempts` (instrumentation struggle). AVANT
 * cette date, l'absence d'échecs = absence de tracking, PAS « facile ».
 * Garder aligné avec `FAILED_ATTEMPTS_SINCE` dans scripts/export-analytics.ts.
 */
export const FAILED_ATTEMPTS_SINCE = "2026-05-30";

/** Nb minimal de tentatives (succès + échecs) pour qu'un `struggle` par case compte. */
export const STRUGGLE_MIN_ATTEMPTS = 3;

/** Seuils winRate observé (haut = bon). Alignés sur les tiers du design system. */
const WIN_RATE_GOOD_MIN = 0.6;
const WIN_RATE_MEDIUM_MIN = 0.3;

// ─── Struggle (difficulté intrinsèque par case) ────────────────────────────────

/** Données `failedAttempts` disponibles pour cette date (post-déploiement) ? */
export function hasStruggleData(date: string): boolean {
  return date >= FAILED_ATTEMPTS_SINCE;
}

/**
 * Part des tentatives sur la case qui ont échoué = difficulté ressentie une
 * fois la case atteinte. `null` si la case n'a jamais été tentée.
 */
export function struggleRate(cell: {
  failedAttempts: number;
  totalGuesses: number;
}): number | null {
  const attempts = cell.failedAttempts + cell.totalGuesses;
  if (attempts === 0) return null;
  return cell.failedAttempts / attempts;
}

// ─── Marqueurs du calendrier ────────────────────────────────────────────────────

export type CalendarMarker =
  | { kind: "observed"; winRate: number | null } // jour passé planifié
  | { kind: "estimated"; difficulty: number } // aujourd'hui / futur planifié
  | { kind: "predicted" } // prédit (brand)
  | { kind: "missing" }; // pool vide pour ce jour

type ScheduledForMarkers = { date: string; difficulty: number };
type UpcomingForMarkers = {
  date: string;
  kind: "scheduled" | "predicted" | "missing";
};

/**
 * Construit la table date → marqueur du calendrier à partir des 3 queries
 * légères. Un jour planifié est OBSERVÉ s'il est passé (pastille winRate),
 * ESTIMÉ s'il est aujourd'hui ou futur (difficulté générée). Les jours non
 * encore inscrits viennent de `upcoming` : `predicted` ou `missing`.
 */
export function buildCalendarMarkers(args: {
  today: string;
  scheduled: ReadonlyArray<ScheduledForMarkers>;
  winRateByDate: ReadonlyMap<string, number | null>;
  upcoming: ReadonlyArray<UpcomingForMarkers>;
}): Map<string, CalendarMarker> {
  const { today, scheduled, winRateByDate, upcoming } = args;
  const markers = new Map<string, CalendarMarker>();

  for (const grid of scheduled) {
    if (grid.date < today) {
      markers.set(grid.date, {
        kind: "observed",
        winRate: winRateByDate.get(grid.date) ?? null,
      });
    } else {
      markers.set(grid.date, {
        kind: "estimated",
        difficulty: grid.difficulty,
      });
    }
  }

  // `upcoming` ne sert qu'aux jours pas encore inscrits (les scheduled futurs
  // sont déjà couverts ci-dessus, avec leur difficulté).
  for (const day of upcoming) {
    if (markers.has(day.date)) continue;
    if (day.kind === "predicted") markers.set(day.date, { kind: "predicted" });
    else if (day.kind === "missing") markers.set(day.date, { kind: "missing" });
  }

  return markers;
}

// ─── Tendance 7 jours (santé de jeu quotidienne) ────────────────────────────────

/** Sous-ensemble de `getGridFeedbackStats` utilisé par la tendance. */
export type FeedbackRow = {
  date: string;
  ratingCount: number;
  gamesPlayed: number;
  difficultyObserved100: number | null;
  winRate: number | null;
  avgFilledCells: number | null;
  wins: number;
  losses: number;
  lostByLives: number;
  lostByBlocked: number;
};

export type TrendRow = {
  date: string;
  finished: number;
  winRate: number | null;
  wins: number;
  losses: number;
  lostByLives: number;
  lostByBlocked: number;
  /** `endReason` pas encore déployé : des défaites existent mais aucune classée. */
  lossSplitPending: boolean;
  difficultyObserved100: number | null;
  ratingCount: number;
  avgFilledCells: number | null;
};

/**
 * Construit les `days` lignes les plus récentes de la tendance. `feedback` est
 * supposé trié décroissant par date (ordre de `getGridFeedbackStats`).
 */
export function buildTrend(
  feedback: ReadonlyArray<FeedbackRow>,
  days = 7,
): TrendRow[] {
  return feedback.slice(0, days).map((row) => ({
    date: row.date,
    finished: row.gamesPlayed,
    winRate: row.winRate,
    wins: row.wins,
    losses: row.losses,
    lostByLives: row.lostByLives,
    lostByBlocked: row.lostByBlocked,
    lossSplitPending:
      row.losses > 0 && row.lostByLives + row.lostByBlocked === 0,
    difficultyObserved100: row.difficultyObserved100,
    ratingCount: row.ratingCount,
    avgFilledCells: row.avgFilledCells,
  }));
}

// ─── Synthèse agrégée (fenêtre) ─────────────────────────────────────────────────

export type Summary = {
  /** Nb de jours (grilles avec activité) agrégés dans la fenêtre. */
  days: number;
  finished: number;
  wins: number;
  losses: number;
  /** Σwins / Σfinished — fiable car agrégé (≠ par jour). `null` si rien de terminé. */
  winRate: number | null;
  lostByLives: number;
  lostByBlocked: number;
  /** Des défaites existent mais aucune classée (endReason pas déployé). */
  lossSplitPending: boolean;
  /** Parties terminées par jour, moyennées sur les jours actifs. */
  avgFinishedPerDay: number;
  /** Jour le plus / le moins actif (parties terminées) sur la fenêtre. */
  peakMax: number;
  peakMin: number;
};

/**
 * Agrège les `days` jours les plus récents en une synthèse. L'agrégation est le
 * seul moyen d'avoir des chiffres fiables à faible trafic (gros dénominateur).
 * Volume basé sur les parties terminées (query légère ; l'engagement distinct
 * vivrait dans le lourd `getGridCellMetrics`).
 */
export function buildSummary(
  feedback: ReadonlyArray<FeedbackRow>,
  days = 30,
): Summary {
  const rows = feedback.slice(0, days);
  let finished = 0;
  let wins = 0;
  let losses = 0;
  let lostByLives = 0;
  let lostByBlocked = 0;
  let peakMax = 0;
  let peakMin = Number.POSITIVE_INFINITY;

  for (const r of rows) {
    finished += r.gamesPlayed;
    wins += r.wins;
    losses += r.losses;
    lostByLives += r.lostByLives;
    lostByBlocked += r.lostByBlocked;
    peakMax = Math.max(peakMax, r.gamesPlayed);
    peakMin = Math.min(peakMin, r.gamesPlayed);
  }

  return {
    days: rows.length,
    finished,
    wins,
    losses,
    winRate: finished === 0 ? null : wins / finished,
    lostByLives,
    lostByBlocked,
    lossSplitPending: losses > 0 && lostByLives + lostByBlocked === 0,
    avgFinishedPerDay: rows.length === 0 ? 0 : finished / rows.length,
    peakMax,
    peakMin: rows.length === 0 ? 0 : peakMin,
  };
}

// ─── Classes Tailwind (pastilles / points) ──────────────────────────────────────

/**
 * Point plein du calendrier pour un jour passé : couleur par winRate (haut =
 * bon → success). `null` (aucune partie terminée) → neutre, distinct de « 0 ».
 */
export function winRateDotClass(winRate: number | null): string {
  if (winRate === null) return "bg-outline-variant/40";
  if (winRate >= WIN_RATE_GOOD_MIN) return "bg-success";
  if (winRate >= WIN_RATE_MEDIUM_MIN) return "bg-warning";
  return "bg-error";
}
