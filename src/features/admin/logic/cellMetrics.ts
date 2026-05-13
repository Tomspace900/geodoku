import { dateToStr } from "@/features/admin/logic/scheduling";

/** Formate un ratio 0..1 en pourcentage entier (`"78 %"`). */
export function formatPercent(value: number): string {
  return `${Math.round(value * 100)} %`;
}

/**
 * Index de concentration : part du top-1 dans la distribution. Proxy simple
 * d'Herfindahl pour signaler les cases dominées par une réponse "évidente".
 * Renvoie 0 si la liste est vide.
 */
export function concentrationIndex(
  topAnswers: ReadonlyArray<{ share: number }>,
): number {
  return topAnswers[0]?.share ?? 0;
}

/** True si la date (YYYY-MM-DD, local time) est strictement postérieure à aujourd'hui. */
export function isFutureDate(dateStr: string): boolean {
  return dateStr > dateToStr(new Date());
}
