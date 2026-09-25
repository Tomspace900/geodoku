import type { Locale } from "@/i18n/types";
import type { Demonyms } from "../../../../content/countries/type";
import { SOURCES, type SourceId } from "../../../../content/sources";
import type { LocalizedString } from "../../../../content/type";

/**
 * Formateurs purs de la fiche pays — nombres, pourcentages, ordinaux, années
 * négatives, noms de langue. Seul module de la feature à appeler `Intl.*` ;
 * `countrySheet.ts` (le modèle) n'en appelle aucun, pour rester locale-agnostique.
 */

export function formatInteger(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale).format(Math.round(value));
}

/**
 * Un entier au-delà de 10 %, une décimale en-deçà — une valeur non nulle
 * (l'électricité au charbon française, 0,18 %) ne s'affiche jamais « 0 % »,
 * ce qu'un arrondi à l'entier ferait à tort. Sous 0,1 % (Biélorussie 0,04 %,
 * forêts égyptienne et omanaise), même une décimale arrondirait à « 0,0 % » :
 * la valeur plancher « < 0,1 % » / « < 0.1% » prend le relais.
 */
export function formatPercent(fraction: number, locale: Locale): string {
  if (fraction !== 0 && Math.abs(fraction) < 0.001) {
    const floor = new Intl.NumberFormat(locale, {
      style: "percent",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(0.001);
    return `< ${floor}`;
  }
  const digits = fraction !== 0 && Math.abs(fraction) < 0.1 ? 1 : 0;
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
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

export type CountrySheetSourceReference = Readonly<{
  id: SourceId;
  name: string;
  url: string;
  vintage: string | null;
}>;

/**
 * Résout des `SourceId` vers leur fiche localisée (nom, URL, millésime),
 * sur le même patron que `constraintSourceView` (toast de source, lot 1) —
 * la légende de catégorie de la fiche pays affiche « Sources : nom
 * (millésime), … » avec des liens, pas seulement des noms.
 */
export function sourceReferences(
  sourceIds: readonly SourceId[],
  locale: Locale,
): readonly CountrySheetSourceReference[] {
  return sourceIds.map((id) => {
    const source = SOURCES[id];
    return {
      id,
      name: source.name[locale],
      url: source.url,
      vintage: source.vintage ? source.vintage[locale] : null,
    };
  });
}

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

/**
 * « euro (EUR) » : le nom localisé suivi du code, pour lever l'ambiguïté des
 * dollars et des francs. La casse est celle de l'ICU, comme pour les langues
 * (« français », « euro ») : une majuscule forcée donnait « … et Dollar des
 * États-Unis » au milieu d'une liste. Une monnaie récente que l'ICU embarquée
 * ne connaît pas encore (`DisplayNames` renvoie le code) s'affiche par son seul
 * code.
 */
export function formatCurrency(code: string, locale: Locale): string {
  try {
    const name = new Intl.DisplayNames([locale], { type: "currency" }).of(code);
    if (name && name !== code) {
      return `${name} (${code})`;
    }
  } catch {
    // Code non reconnu par l'ICU embarquée — repli ci-dessous.
  }
  return code;
}

/** « Français, Française » ; une seule forme quand le masculin égale le féminin. */
export function formatDemonym(demonyms: Demonyms, locale: Locale): string {
  const { m, f } = demonyms[locale];
  return m === f ? m : `${m}, ${f}`;
}

/**
 * « 5 juillet 1962 » / « July 5, 1962 » : date complète localisée, lue en UTC
 * pour qu'un fuseau négatif ne la décale jamais d'un jour. Les dates du
 * Factbook sont postérieures à l'an 1000 : `Date.UTC` ne les confond pas avec
 * le siècle.
 */
export function formatFullDate(isoDate: string, locale: Locale): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
