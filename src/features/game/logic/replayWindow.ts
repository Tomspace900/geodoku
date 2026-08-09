/**
 * Fenêtre des grilles rejouables en entraînement. Module pur importé **à la fois**
 * par le garde Convex (`assertReplayableDate`) et par le frontend (garde d'URL) :
 * une seule règle, pas deux définitions à garder en phase.
 */

/** Profondeur de l'archive : J-1 à J-7. */
export const REPLAY_WINDOW_DAYS = 7;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type ReplayDateVerdict = "ok" | "future" | "too_old" | "malformed";

function isCanonicalDate(date: string): boolean {
  if (!DATE_PATTERN.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}

/**
 * Classe une date demandée pour un rejeu.
 *
 * `"future"` couvre **aujourd'hui et au-delà** : la grille du jour se joue sur
 * `/`, et surtout servir une date future livrerait la grille de demain avec ses
 * réponses. C'est le refus critique de la fonctionnalité.
 */
export function classifyReplayDate(
  date: string,
  today: string,
): ReplayDateVerdict {
  if (!isCanonicalDate(date) || !isCanonicalDate(today)) return "malformed";
  if (date >= today) return "future";

  const dayGap = Math.round(
    (Date.parse(`${today}T00:00:00.000Z`) -
      Date.parse(`${date}T00:00:00.000Z`)) /
      MS_PER_DAY,
  );
  return dayGap > REPLAY_WINDOW_DAYS ? "too_old" : "ok";
}

export function isReplayableDate(date: string, today: string): boolean {
  return classifyReplayDate(date, today) === "ok";
}
