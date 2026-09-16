import type { Locale } from "@/i18n/types";
import type { LocalizedString } from "../../../../content/type";

/**
 * Formateurs purs de la fiche pays — nombres, pourcentages, ordinaux, années
 * négatives, noms de langue. Seul module de la feature à appeler `Intl.*` ;
 * `countrySheet.ts` (le modèle) n'en appelle aucun, pour rester locale-agnostique.
 */

export function formatInteger(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale).format(Math.round(value));
}

export function formatPercent(fraction: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(fraction);
}

export function computeDensity(population: number, areaKm2: number): number {
  return areaKm2 > 0 ? population / areaKm2 : 0;
}

/** « 1er » en français (seul cas irrégulier), « 1st »/« 2nd »/« 3rd »/« Nth » en anglais. */
export function formatOrdinal(rank: number, locale: Locale): string {
  if (locale === "fr") {
    return rank === 1 ? "1er" : `${rank}ᵉ`;
  }
  const pluralRules = new Intl.PluralRules("en", { type: "ordinal" });
  const suffixes: Record<string, string> = {
    one: "st",
    two: "nd",
    few: "rd",
    other: "th",
  };
  return `${rank}${suffixes[pluralRules.select(rank)] ?? "th"}`;
}

/**
 * Une année n'est jamais groupée par milliers (« 1922 », pas « 1 922 ») —
 * `formatInteger` grouperait à tort une quantité. « 8300 av. J.-C. » /
 * « 8300 BCE » pour une année négative ; l'année brute sinon.
 */
export function formatYear(year: number, locale: Locale): string {
  const ungrouped = new Intl.NumberFormat(locale, {
    useGrouping: false,
  }).format(Math.abs(Math.round(year)));
  if (year >= 0) return ungrouped;
  return locale === "fr" ? `${ungrouped} av. J.-C.` : `${ungrouped} BCE`;
}

/** Liste localisée en prose (« France, Allemagne et Espagne ») — noms de pays comme libellés d'énumération. */
export function formatList(items: readonly string[], locale: Locale): string {
  return new Intl.ListFormat(locale, {
    style: "long",
    type: "conjunction",
  }).format(items);
}

/**
 * Codes de langue que l'ICU embarquée par Node/les navigateurs ne résout pas
 * (`Intl.DisplayNames` renvoie le code tel quel, ou lève). Relevé le
 * 2026-09-16 sur les 90 codes `officialLanguages` du snapshot : 5 en défaut,
 * tous des codes ISO 639-3 hors CLDR.
 */
const LANGUAGE_NAME_FALLBACKS: Readonly<Record<string, LocalizedString>> = {
  ber: { fr: "Langues berbères", en: "Berber languages" },
  bjz: { fr: "Créole du Belize", en: "Belize Kriol English" },
  nzs: {
    fr: "Langue des signes néo-zélandaise",
    en: "New Zealand Sign Language",
  },
  pov: { fr: "Créole de Guinée-Bissau", en: "Upper Guinea Crioulo" },
  zdj: { fr: "Comorien ngazidja", en: "Ngazidja Comorian" },
};

export function formatLanguageName(code: string, locale: Locale): string {
  try {
    const displayName = new Intl.DisplayNames([locale], {
      type: "language",
    }).of(code);
    if (displayName && displayName !== code) return displayName;
  } catch {
    // Sous-étiquette non reconnue par l'ICU embarquée — repli ci-dessous.
  }
  return LANGUAGE_NAME_FALLBACKS[code]?.[locale] ?? code;
}
