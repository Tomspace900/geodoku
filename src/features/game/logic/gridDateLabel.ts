import type { Locale } from "@/i18n/types";

/**
 * Libellé de date d'une grille, tel qu'affiché en en-tête de partie et dans la
 * liste des archives : jour de semaine + quantième + mois, en capitales, sans
 * virgule séparatrice (le rendu éditorial la remplace par une espace).
 *
 * Midi est imposé à la construction de la `Date` pour que le décalage horaire du
 * navigateur ne fasse jamais basculer l'affichage sur la veille ou le lendemain.
 */
export function formatGridDateLabel(date: string, locale: Locale): string {
  if (!date) return "";
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
    .format(new Date(`${date}T12:00:00`))
    .toUpperCase()
    .replace(/,\s*/g, " ");
}
