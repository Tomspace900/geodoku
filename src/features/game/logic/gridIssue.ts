/** Premier jour de numérotation des grilles (UTC minuit). Partages et UI en dépendent. */
export const GRID_LAUNCH_DATE_ISO = "2026-06-01";

const MS_PER_DAY = 86_400_000;

function utcMidnightMs(dateIso: string): number {
  const parts = dateIso.split("-").map(Number);
  const [y, m, d] = parts;
  if (y === undefined || m === undefined || d === undefined) return Number.NaN;
  return Date.UTC(y, m - 1, d);
}

const LAUNCH_UTC_MS = utcMidnightMs(GRID_LAUNCH_DATE_ISO);

/**
 * Numéro d’issue (#1 le jour de lancement) pour une date de grille `YYYY-MM-DD`.
 * `null` avant le lancement ou si la date est invalide — pas d’affichage `#`.
 */
export function getGridNumberForDate(dateIso: string): number | null {
  const dayMs = utcMidnightMs(dateIso);
  if (Number.isNaN(dayMs) || dayMs < LAUNCH_UTC_MS) return null;
  return Math.floor((dayMs - LAUNCH_UTC_MS) / MS_PER_DAY) + 1;
}

/** Fallback horloge UTC quand la date de grille n’est pas encore connue (chargement). */
export function getGridNumberForTodayUtc(nowMs = Date.now()): number | null {
  const iso = new Date(nowMs).toISOString().slice(0, 10);
  return getGridNumberForDate(iso);
}
