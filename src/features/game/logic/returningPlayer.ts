import { todayUTC } from "@/lib/dates";
import { loadHistory } from "./history";
import { loadPersistedGame } from "./persistence";

/** Un joueur qui revient a déjà joué la grille d'un jour passé. */
export function playedBeforeToday(
  playedDates: readonly string[],
  today: string,
): boolean {
  return playedDates.some((date) => date < today);
}

/**
 * Lu dans les parties de l'appareil : le journal (#154) et, pour qui n'a pas
 * joué depuis, la dernière partie enregistrée.
 */
export function hasPlayedBefore(today: string = todayUTC()): boolean {
  const persisted = loadPersistedGame();
  return playedBeforeToday(
    [
      ...loadHistory().map((entry) => entry.date),
      ...(persisted ? [persisted.date] : []),
    ],
    today,
  );
}
