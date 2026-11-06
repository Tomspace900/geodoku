import { useQueries, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { todayUTC } from "@/lib/dates";
import { api } from "../../../../convex/_generated/api";
import { loadDayCache, saveDayCache } from "../logic/dayCache";
import type { FinishedDay } from "../logic/finishedDay";
import {
  computeDayResult,
  type DayResult,
  type PlayedGame,
  type StatsDay,
} from "../logic/myStats";

export type StatsResults =
  | { status: "loading" }
  | { status: "ready"; today: string; results: DayResult[] };

function finishedStatsDay(day: FinishedDay): StatsDay {
  return { ...day, complete: true };
}

/**
 * Parties du joueur lues sur la grille de leur jour (#155). Un jour fini vient
 * du cache du navigateur, sinon de `stats.getFinishedDay` (une query par jour,
 * partagée en cache entre joueurs), puis rejoint le cache. Le jour en cours
 * vient de la grille du jour et de sa répartition live : une partie finie
 * aujourd'hui compte avec son score du moment, qui s'affine jusqu'à minuit.
 */
export function useStatsResults(
  games: readonly PlayedGame[] | undefined,
): StatsResults {
  const todayGrid = useQuery(api.grids.getTodayGrid);
  // La date du serveur fait foi ; l'horloge de l'appareil, le temps qu'elle arrive.
  const today = todayGrid?.date ?? todayUTC();
  const hasTodayGame = games?.some((game) => game.date === today) ?? false;
  const todayCounts = useQuery(
    api.cellStats.getToday,
    hasTodayGame ? {} : "skip",
  );

  const [cache, setCache] = useState(() => loadDayCache());
  const pastDates = useMemo(
    () => [
      ...new Set(
        (games ?? []).filter((g) => g.date < today).map((g) => g.date),
      ),
    ],
    [games, today],
  );
  const missing = pastDates.filter((date) => !cache.has(date));
  // `useQueries` se réabonne à chaque nouvel objet : il doit rester stable.
  const missingKey = missing.join(",");
  // biome-ignore lint/correctness/useExhaustiveDependencies: `missingKey` résume `missing`
  const queries = useMemo(
    () =>
      Object.fromEntries(
        missing.map((date) => [
          date,
          { query: api.stats.getFinishedDay, args: { date } },
        ]),
      ),
    [missingKey],
  );
  const fetched = useQueries(queries) as Record<
    string,
    FinishedDay | null | undefined | Error
  >;

  // Un jour reçu rejoint le cache ; un jour sans grille (`null`) ou refusé
  // (horloge de l'appareil en avance) reste hors cache et hors stats.
  useEffect(() => {
    const received = Object.values(fetched).filter(
      (day): day is FinishedDay =>
        day !== undefined && day !== null && !(day instanceof Error),
    );
    if (received.length === 0) return;
    setCache((previous) => {
      const next = new Map(previous);
      received.forEach((day) => {
        next.set(day.date, day);
      });
      saveDayCache(next);
      return next;
    });
  }, [fetched]);

  if (games === undefined) return { status: "loading" };
  if (hasTodayGame && (!todayGrid || !todayCounts)) {
    return { status: "loading" };
  }
  if (missing.some((date) => fetched[date] === undefined)) {
    return { status: "loading" };
  }

  const results = games.flatMap((game): DayResult[] => {
    if (game.date === today && todayGrid && todayCounts) {
      return [
        computeDayResult(game, {
          date: today,
          rows: todayGrid.rows,
          cols: todayGrid.cols,
          counts: todayCounts,
          blockableAnswers: todayGrid.validAnswers,
          complete: false,
        }),
      ];
    }
    const day = cache.get(game.date) ?? fetched[game.date];
    if (!day || day instanceof Error) return [];
    return [computeDayResult(game, finishedStatsDay(day))];
  });
  return {
    status: "ready",
    today,
    results: results.sort((a, b) => a.date.localeCompare(b.date)),
  };
}
