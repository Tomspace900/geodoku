/**
 * Libellés de millésime des sources (`content/sources.ts`), calculés depuis la
 * date ou l'année que porte le dataset. Partagés par les scripts qui les
 * impriment (récoltes, `build-countries`) et par la garde
 * `validateSourceVintages`, qui exige l'égalité exacte : une date affichée au
 * joueur ne peut pas diverger de sa donnée.
 */
import type { CountryEvent } from "../../content/countries/type.ts";
import type { LocalizedString } from "../../content/type.ts";
import type { EventEditionsSnapshot } from "../countries/data/types.ts";

const MONTHS_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];
const MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * « 23 septembre 2026 » / « 23 September 2026 » depuis `YYYY-MM-DD`, le 1er du
 * mois s'écrivant « 1er » en français. Calculé à la main plutôt que par `Intl`,
 * qui donnerait « 1 octobre » et dépendrait du fuseau de la machine.
 */
export function dateLabel(isoDate: string): LocalizedString {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  const monthIndex = match ? Number(match[2]) - 1 : -1;
  if (!match || monthIndex < 0 || monthIndex > 11) {
    throw new Error(`date attendue au format YYYY-MM-DD : « ${isoDate} »`);
  }
  const [, year, , dayText] = match;
  const day = Number(dayText);
  return {
    fr: `${day === 1 ? "1er" : day} ${MONTHS_FR[monthIndex]} ${year}`,
    en: `${day} ${MONTHS_EN[monthIndex]} ${year}`,
  };
}

/** État d'une donnée à une date : adhésions, régime. */
export function asOfVintage(isoDate: string): LocalizedString {
  const { fr, en } = dateLabel(isoDate);
  return { fr: `au ${fr}`, en: `as of ${en}` };
}

/** Dernière édition tenue d'un événement compilé édition par édition. */
export function editionsHeldUntilVintage(year: number): LocalizedString {
  return {
    fr: `éditions tenues jusqu'en ${year}`,
    en: `editions held up to ${year}`,
  };
}

/** Année de la dernière édition tenue parmi ces événements (`eventEditions`). */
export function lastEditionYear(
  snapshot: EventEditionsSnapshot,
  events: readonly CountryEvent[],
): number {
  return Math.max(
    ...events.flatMap((event) =>
      snapshot.events[event].map(({ year }) => year),
    ),
  );
}
