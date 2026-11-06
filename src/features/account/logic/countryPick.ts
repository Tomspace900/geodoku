import type { Country } from "@/features/countries/types";
import type { Locale } from "@/i18n/types";
import { COUNTRY_CATALOG } from "../../../../content/countries/catalog";

/** Les 197 pays par ordre alphabétique, dans la langue de la page. */
export function sortedCountries(locale: Locale): Country[] {
  const collator = new Intl.Collator(locale);
  return [...COUNTRY_CATALOG].sort((a, b) =>
    collator.compare(a.names[locale], b.names[locale]),
  );
}

/** Le dé du pays : un pays au hasard, différent de l'actuel. */
export function randomCountry(
  current: string | null,
  random: () => number = Math.random,
): string {
  const others = COUNTRY_CATALOG.filter((c) => c.iso3 !== current);
  return others[Math.floor(random() * others.length) % others.length].iso3;
}

/** Sans pays choisi : le drapeau blanc, « Aucun ». */
export const WHITE_FLAG = "🏳️";
