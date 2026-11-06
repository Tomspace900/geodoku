import type { Locale } from "@/i18n/types";

const INTL_LOCALE: Record<Locale, string> = { fr: "fr-FR", en: "en-US" };

/**
 * Date courte de « Mes stats » : « 26 nov. » / « Nov 26 », ou le mois en
 * entier pour le record (« 26 novembre »). Lue en UTC, comme la date des grilles.
 */
export function formatStatsDate(
  date: string,
  locale: Locale,
  month: "short" | "long" = "short",
): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: "numeric",
    month,
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));
}
