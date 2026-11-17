/**
 * Contrats purs partagés par l'admin et les exports d'analytics.
 *
 * Cette couche reste sans React ni Convex afin que les outils locaux utilisent
 * exactement les mêmes seuils et formules que l'interface opérateur.
 */

import { THIN_COHORT_MAX } from "../../game/logic/cohort";

/**
 * Premier jour qui a des lignes de partie (bascule de #70). Avant, une journée
 * n'a que sa répartition des pays, importée : ni parties, ni victoires, ni
 * erreurs par case. Ses compteurs à zéro ne veulent pas dire « aucune ».
 */
export const GAME_ROWS_SINCE = "2026-11-05";

export function hasGameRows(date: string): boolean {
  return date >= GAME_ROWS_SINCE;
}

/**
 * Sous ce nombre de parties finies, un taux par case n'est que du bruit : la
 * règle de la cohorte mince du calque « Erreurs » de la grille solution.
 */
export const CELL_RATE_MIN_FINISHED = THIN_COHORT_MAX;

/**
 * Part des parties finies concernées (trompés au moins une fois, case laissée
 * vide), ou `null` tant que la cohorte est trop mince pour la lire.
 */
export function cellRate(count: number, finished: number): number | null {
  if (finished < CELL_RATE_MIN_FINISHED) return null;
  return count / finished;
}
