/**
 * Logique pure des métriques observées de l'admin (santé de jeu).
 *
 * Zéro React, zéro Convex : consommée par les composants admin et testée en
 * isolation. Les composants ne font que du formatting d'affichage.
 *
 * Faible trafic → tout est directionnel : on distingue partout « pas de
 * donnée » (`null` → `—`) de « zéro », et on gate le bruit d'échantillon.
 */

import { popularityScore100 } from "@/features/countries/logic/popularity";
import { hasGameRows } from "./observedMetrics";

export {
  CELL_RATE_MIN_FINISHED,
  cellRate,
  GAME_ROWS_SINCE,
  hasGameRows,
} from "./observedMetrics";

/** Moyenne des taux lisibles (0–1) d'une grille, ou `null` si aucun. */
export function averageRate(
  rates: ReadonlyArray<number | null>,
): number | null {
  const known = rates.filter((rate): rate is number => rate !== null);
  if (known.length === 0) return null;
  return known.reduce((sum, rate) => sum + rate, 0) / known.length;
}

// ─── Marqueurs du calendrier ────────────────────────────────────────────────────

export type CalendarMarker =
  | { kind: "observed"; winRate: number | null } // jour passé planifié
  | { kind: "beforeRows" } // jour passé d'avant la bascule : pas de lignes de partie
  | { kind: "scheduled"; popScore: number | null } // aujourd'hui / futur planifié (facilité est.)
  | { kind: "predicted"; popScore: number | null } // prédit (simulation pool)
  | { kind: "missing" }; // pool vide pour ce jour

type ScheduledForMarkers = {
  date: string;
  /** Notoriété moyenne des solutions [0..1] (gridPopTop3 de getScheduledGrids). */
  gridPopTop3: number | null;
};
type UpcomingForMarkers = {
  date: string;
  kind: "scheduled" | "predicted" | "missing";
  /** Présent pour les jours `predicted` (getUpcomingScheduledPreview). */
  gridPopTop3?: number | null;
};

/**
 * Construit la table date → marqueur du calendrier à partir des 3 queries
 * légères. Un jour planifié est OBSERVÉ s'il est passé (pastille winRate),
 * BEFOREROWS s'il précède la bascule (aucun winRate à lire), SCHEDULED s'il est
 * aujourd'hui ou futur (pastille facilité estimée). Les jours non encore
 * inscrits viennent de `upcoming` : `predicted` ou `missing`.
 */
export function buildCalendarMarkers(args: {
  today: string;
  scheduled: ReadonlyArray<ScheduledForMarkers>;
  winRateByDate: ReadonlyMap<string, number | null>;
  upcoming: ReadonlyArray<UpcomingForMarkers>;
}): Map<string, CalendarMarker> {
  const { today, scheduled, winRateByDate, upcoming } = args;
  const markers = new Map<string, CalendarMarker>();

  scheduled.forEach((grid) => {
    if (grid.date < today) {
      markers.set(
        grid.date,
        hasGameRows(grid.date)
          ? { kind: "observed", winRate: winRateByDate.get(grid.date) ?? null }
          : { kind: "beforeRows" },
      );
    } else {
      markers.set(grid.date, {
        kind: "scheduled",
        popScore:
          grid.gridPopTop3 === null
            ? null
            : popularityScore100(grid.gridPopTop3),
      });
    }
  });

  // `upcoming` ne sert qu'aux jours pas encore inscrits (les scheduled futurs
  // sont déjà couverts ci-dessus).
  upcoming.forEach((day) => {
    if (markers.has(day.date)) return;
    if (day.kind === "predicted") {
      markers.set(day.date, {
        kind: "predicted",
        popScore:
          day.gridPopTop3 === null || day.gridPopTop3 === undefined
            ? null
            : popularityScore100(day.gridPopTop3),
      });
    } else if (day.kind === "missing") {
      markers.set(day.date, { kind: "missing" });
    }
  });

  return markers;
}

// ─── Tendance 7 jours (santé de jeu quotidienne) ────────────────────────────────

/** Sous-ensemble de `getDailyGameStats` utilisé par la tendance. */
export type FeedbackRow = {
  date: string;
  gamesPlayed: number;
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
  avgFilledCells: number | null;
};

/**
 * Construit les `days` lignes les plus récentes de la tendance. `feedback` est
 * supposé trié décroissant par date (ordre de `getDailyGameStats`).
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
    avgFilledCells: row.avgFilledCells,
  }));
}

// ─── Synthèse agrégée (fenêtre) ─────────────────────────────────────────────────

export type Summary = {
  /** Nb de jours (grilles avec des lignes de partie) agrégés dans la fenêtre. */
  days: number;
  /**
   * La fenêtre compte moins de jours que demandé : elle remonte avant la
   * bascule, dont les journées n'ont pas de lignes de partie.
   */
  shortWindow: boolean;
  finished: number;
  wins: number;
  losses: number;
  /** Σwins / Σfinished — fiable car agrégé (≠ par jour). `null` si rien de terminé. */
  winRate: number | null;
  lostByLives: number;
  lostByBlocked: number;
  /** Parties terminées par jour, moyennées sur les jours complets. */
  avgFinishedPerDay: number;
  /** Jour complet le plus / le moins actif (parties terminées) sur la fenêtre. */
  peakMax: number;
  peakMin: number;
};

/**
 * Agrège les `days` jours les plus récents en une synthèse. L'agrégation est le
 * seul moyen d'avoir des chiffres fiables à faible trafic (gros dénominateur).
 * Le jour en cours compte dans les totaux, mais pas dans la moyenne, le pic ni
 * le creux : sa journée n'est pas finie, il serait toujours le creux.
 */
export function buildSummary(
  feedback: ReadonlyArray<FeedbackRow>,
  today: string,
  days = 30,
): Summary {
  const rows = feedback.slice(0, days);
  const complete = rows.filter((row) => row.date !== today);
  const sum = (key: keyof Omit<FeedbackRow, "date">) =>
    rows.reduce((total, row) => total + (row[key] ?? 0), 0);
  const finished = sum("gamesPlayed");
  const wins = sum("wins");
  const perDay = complete.map((row) => row.gamesPlayed);

  return {
    days: rows.length,
    shortWindow: rows.length < days,
    finished,
    wins,
    losses: sum("losses"),
    winRate: finished === 0 ? null : wins / finished,
    lostByLives: sum("lostByLives"),
    lostByBlocked: sum("lostByBlocked"),
    avgFinishedPerDay:
      perDay.length === 0
        ? 0
        : perDay.reduce((total, n) => total + n, 0) / perDay.length,
    peakMax: perDay.length === 0 ? 0 : Math.max(...perDay),
    peakMin: perDay.length === 0 ? 0 : Math.min(...perDay),
  };
}
