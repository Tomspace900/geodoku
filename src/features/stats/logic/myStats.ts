import {
  type CellCounts,
  toGuessDistribution,
} from "@/features/game/logic/distribution";
import {
  type GameRecord,
  recordCells,
  recordLivesRemaining,
  recordStatus,
} from "@/features/game/logic/gameRecord";
import { CELL_KEYS, cellPosition } from "@/features/game/logic/gridTopology";
import { filledCellShare, rarityToTier } from "@/features/game/logic/rarity";
import {
  computeScore,
  computeScoreBreakdown,
  type ScoreBreakdown,
} from "@/features/game/logic/scoreVariant";
import type { Cell, CellKey, RarityTier } from "@/features/game/types";
import { type ThemeId, themeOf } from "./themes";

/**
 * « Mes stats » (#155), calculées côté client depuis les parties du joueur
 * (journal de l'appareil, ou lignes du compte) et la répartition de chaque jour
 * joué. Rien n'est stocké : le score d'un jour passé se recalcule toujours.
 *
 * Seules les parties finies comptent, comme dans « Toi et les autres » : une
 * partie en cours, celle du jour comme une partie passée abandonnée en route,
 * n'entre nulle part. L'entraînement n'y entre jamais.
 */

/** Une partie quotidienne : la ligne de partie et sa date. */
export type PlayedGame = GameRecord & { date: string };

/** Ce qu'il faut savoir d'un jour pour y lire une partie. */
export type StatsDay = {
  date: string;
  rows: string[];
  cols: string[];
  counts: CellCounts;
  /**
   * Réponses qui suffisent à lire un blocage : celles des cases de 8 réponses
   * ou moins pour un jour fini, toutes pour le jour en cours.
   */
  blockableAnswers: Record<string, string[]>;
  /** Jour fini : la cohorte est close, un pays absent vaut une part de 0. */
  complete: boolean;
};

export type DayResult = {
  date: string;
  rows: string[];
  cols: string[];
  cells: Record<CellKey, Cell>;
  failed: Record<CellKey, number>;
  finished: boolean;
  won: boolean;
  errors: number;
  /** Part du pays posé, par case remplie. */
  shares: Partial<Record<CellKey, number>>;
  breakdown: ScoreBreakdown;
  total: number;
};

export type ThemeStat = {
  id: ThemeId;
  cells: number;
  /** Cases remplies sans aucune erreur. */
  firstTry: number;
  rate: number;
};

export type MyStats = {
  played: number;
  /** Part des grilles complètes (9 cases), en pourcentage entier. */
  completePercent: number;
  average: number;
  best: { date: string; total: number } | null;
  tierCounts: Record<RarityTier, number>;
  tierPercents: Record<RarityTier, number>;
  themes: ThemeStat[];
};

export const TIER_ORDER: readonly RarityTier[] = [
  "common",
  "uncommon",
  "rare",
  "ultra",
];

/**
 * Sous ce nombre de cases, une thématique n'est pas classée : un seul tirage
 * ne dit rien. Gardé à 6 après mesure sur les grilles de prod (#155) : les
 * premières thématiques vers le 3ᵉ jour, un continent en 1 mois environ.
 */
export const THEME_MIN_CELLS = 6;

/** Partie lue sur la grille de son jour : cases, statut, score. */
export function computeDayResult(game: PlayedGame, day: StatsDay): DayResult {
  const record: GameRecord = { cells: game.cells, failed: game.failed };
  const cells = recordCells(record, day.blockableAnswers);
  const status = recordStatus(record, day.blockableAnswers);
  const distribution = toGuessDistribution(day.counts);
  const breakdown = computeScoreBreakdown(
    {
      mode: "daily",
      cells,
      lives: { kind: "limited", remaining: recordLivesRemaining(record) },
    },
    distribution,
    day.complete,
  );
  const shares: Partial<Record<CellKey, number>> = {};
  CELL_KEYS.forEach((key) => {
    const cell = cells[key];
    if (cell.status !== "filled") return;
    const resolved = filledCellShare(
      cell.countryCode,
      distribution[key],
      day.complete,
    );
    if (resolved) shares[key] = resolved.share;
  });
  const failed = Object.fromEntries(
    CELL_KEYS.map((key, index) => [key, game.failed[index] ?? 0]),
  ) as Record<CellKey, number>;
  return {
    date: game.date,
    rows: day.rows,
    cols: day.cols,
    cells,
    failed,
    finished: status !== "playing",
    won: status === "won",
    errors: game.failed.reduce((sum, n) => sum + n, 0),
    shares,
    breakdown,
    total: computeScore(breakdown).total ?? 0,
  };
}

function mean(values: readonly number[]): number {
  return values.length === 0
    ? 0
    : values.reduce((sum, n) => sum + n, 0) / values.length;
}

/**
 * Pourcentages entiers qui somment à 100 (plus forts restes) : une palette
 * arrondie case par case afficherait parfois 99 % ou 101 %.
 */
export function wholePercents<K extends string>(
  counts: Record<K, number>,
  keys: readonly K[],
): Record<K, number> {
  const total = keys.reduce((sum, key) => sum + counts[key], 0);
  const result = Object.fromEntries(keys.map((key) => [key, 0])) as Record<
    K,
    number
  >;
  if (total === 0) return result;
  const exact = keys.map((key) => (counts[key] / total) * 100);
  keys.forEach((key, i) => {
    result[key] = Math.floor(exact[i]);
  });
  const missing = 100 - keys.reduce((sum, key) => sum + result[key], 0);
  [...keys.keys()]
    .sort(
      (a, b) =>
        exact[b] - Math.floor(exact[b]) - (exact[a] - Math.floor(exact[a])),
    )
    .slice(0, missing)
    .forEach((i) => {
      result[keys[i]] += 1;
    });
  return result;
}

/**
 * Une case compte pour ses deux thématiques (une seule fois si ligne et
 * colonne en partagent une) ; « du premier coup » = remplie sans erreur.
 */
export function computeThemes(
  results: readonly DayResult[],
  minCells = THEME_MIN_CELLS,
): ThemeStat[] {
  const byTheme = new Map<ThemeId, { cells: number; firstTry: number }>();
  results.forEach((result) => {
    CELL_KEYS.forEach((key) => {
      const { row, col } = cellPosition(key);
      const firstTry =
        result.cells[key].status === "filled" && result.failed[key] === 0;
      const themes = new Set(
        [themeOf(result.rows[row]), themeOf(result.cols[col])].filter(
          (id): id is ThemeId => id !== null,
        ),
      );
      themes.forEach((id) => {
        const stat = byTheme.get(id) ?? { cells: 0, firstTry: 0 };
        stat.cells += 1;
        if (firstTry) stat.firstTry += 1;
        byTheme.set(id, stat);
      });
    });
  });
  return [...byTheme.entries()]
    .filter(([, stat]) => stat.cells >= minCells)
    .map(([id, stat]) => ({ id, ...stat, rate: stat.firstTry / stat.cells }))
    .sort((a, b) => b.rate - a.rate || b.cells - a.cells);
}

export function computeMyStats(results: readonly DayResult[]): MyStats {
  const finished = results.filter((result) => result.finished);
  const tierCounts: Record<RarityTier, number> = {
    common: 0,
    uncommon: 0,
    rare: 0,
    ultra: 0,
  };
  finished.forEach((result) => {
    Object.values(result.shares).forEach((share) => {
      tierCounts[rarityToTier(share)] += 1;
    });
  });
  const best = finished.reduce<{ date: string; total: number } | null>(
    (acc, result) =>
      acc === null || result.total > acc.total
        ? { date: result.date, total: result.total }
        : acc,
    null,
  );
  const won = finished.filter((result) => result.won).length;
  return {
    played: finished.length,
    completePercent:
      finished.length === 0 ? 0 : Math.round((won / finished.length) * 100),
    average: Math.round(mean(finished.map((result) => result.total))),
    best,
    tierCounts,
    tierPercents: wholePercents(tierCounts, TIER_ORDER),
    themes: computeThemes(finished),
  };
}

// ── Les 30 derniers jours ────────────────────────────────────────────────────

export const RECENT_DAYS = 30;

export type RecentDay =
  | { date: string; kind: "finished"; total: number }
  | { date: string; kind: "unfinished" }
  | { date: string; kind: "none" };

export type RecentDays = {
  days: RecentDay[];
  /** Moyenne des parties finies de la fenêtre ; `null` sans partie finie. */
  average: number | null;
  /** Meilleur score de la fenêtre (le premier atteint en cas d'égalité). */
  bestDate: string | null;
};

/** `count` dates jusqu'à `today` compris, de la plus ancienne à la plus récente. */
export function lastDates(today: string, count = RECENT_DAYS): string[] {
  const end = Date.parse(`${today}T00:00:00.000Z`);
  return Array.from({ length: count }, (_, i) =>
    new Date(end - (count - 1 - i) * 86_400_000).toISOString().slice(0, 10),
  );
}

export function recentDays(
  results: readonly DayResult[],
  today: string,
): RecentDays {
  const byDate = new Map(results.map((result) => [result.date, result]));
  const days = lastDates(today).map((date): RecentDay => {
    const result = byDate.get(date);
    if (!result) return { date, kind: "none" };
    return result.finished
      ? { date, kind: "finished", total: result.total }
      : { date, kind: "unfinished" };
  });
  const finished = days.filter(
    (day): day is Extract<RecentDay, { kind: "finished" }> =>
      day.kind === "finished",
  );
  const best = finished.reduce<(typeof finished)[number] | null>(
    (acc, day) => (acc === null || day.total > acc.total ? day : acc),
    null,
  );
  return {
    days,
    average:
      finished.length === 0
        ? null
        : Math.round(mean(finished.map((day) => day.total))),
    bestDate: best?.date ?? null,
  };
}

/** Jours qu'on feuillette dans le tiroir du jour : ceux qui ont une partie. */
export function browsableDates(recent: RecentDays): string[] {
  return recent.days.filter((day) => day.kind !== "none").map((d) => d.date);
}
