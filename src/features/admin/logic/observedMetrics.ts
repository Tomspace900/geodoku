/**
 * Contrats purs partagés par l'admin et les exports d'analytics.
 *
 * Cette couche reste sans React ni Convex afin que les outils locaux utilisent
 * exactement les mêmes seuils et formules que l'interface opérateur.
 */

/**
 * Date de déploiement de `failedAttempts`. Avant cette date, zéro signifie
 * « non instrumenté » et non « aucune erreur ».
 */
export const FAILED_ATTEMPTS_SINCE = "2026-05-30";

/** Nombre minimal de tentatives avant d'afficher le struggle d'une case. */
export const STRUGGLE_MIN_ATTEMPTS = 3;

/** Les échecs sont-ils instrumentés pour cette date ? */
export function hasStruggleData(date: string): boolean {
  return date >= FAILED_ATTEMPTS_SINCE;
}

/** Part des tentatives ayant échoué, ou `null` si la case n'a pas été tentée. */
export function struggleRate(cell: {
  failedAttempts: number;
  totalGuesses: number;
}): number | null {
  const attempts = cell.failedAttempts + cell.totalGuesses;
  if (attempts === 0) return null;
  return cell.failedAttempts / attempts;
}
