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

/** Sans pays choisi : le drapeau blanc, « Aucun ». */
export const WHITE_FLAG = "🏳️";
