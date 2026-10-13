import type { Locale } from "@/i18n/types";
import type { LocalizedString } from "../../../../content/type";

/**
 * Formateurs purs — nombres, pourcentages, ordinaux, années négatives, dates,
 * noms de langue. Seul module de la feature à appeler `Intl.*` : les modèles
 * (`constraintValue.ts`) n'en appellent aucun, pour rester locale-agnostiques.
 */

export function formatInteger(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale).format(Math.round(value));
}

/**
 * Surface en km² : entière, sauf sous 1 km² où l'arrondi à l'entier donnerait
 * « 0 » (Cité du Vatican, 0,44 km²) — deux chiffres significatifs alors.
 */
export function formatSurface(km2: number, locale: Locale): string {
  if (km2 >= 1) return formatInteger(km2, locale);
  return new Intl.NumberFormat(locale, { maximumSignificantDigits: 2 }).format(
    km2,
  );
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
 * (`Intl.DisplayNames` renvoie le code tel quel, ou lève) : tous des codes
 * ISO 639-3 hors CLDR. Relevé le 2026-10-13 sur les `officialLanguages` du
 * snapshot — 13 codes en défaut (5 le 2026-09-16, 8 de plus depuis la
 * correction des langues de la Namibie et du Zimbabwe). Les noms français sont
 * en minuscules, comme ceux de l'ICU (« français »), puisqu'ils se lisent au
 * milieu d'une liste ; un test garde que plus aucun code n'est rendu brut.
 */
const LANGUAGE_NAME_FALLBACKS: Readonly<Record<string, LocalizedString>> = {
  ber: { fr: "langues berbères", en: "Berber languages" },
  bjz: { fr: "créole du Belize", en: "Belize Kriol English" },
  bwg: { fr: "barwe", en: "Barwe" },
  hgm: { fr: "haillom", en: "Haillom" },
  kck: { fr: "kalanga", en: "Kalanga" },
  khi: { fr: "langues khoïsan", en: "Khoisan languages" },
  kwn: { fr: "kwangali", en: "Kwangali" },
  ndc: { fr: "ndau", en: "Ndau" },
  nzs: {
    fr: "langue des signes néo-zélandaise",
    en: "New Zealand Sign Language",
  },
  pov: { fr: "créole de Guinée-Bissau", en: "Upper Guinea Crioulo" },
  toi: { fr: "tonga", en: "Tonga" },
  zdj: { fr: "comorien ngazidja", en: "Ngazidja Comorian" },
  zib: { fr: "langue des signes zimbabwéenne", en: "Zimbabwean Sign Language" },
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

/**
 * Majuscule initiale d'un libellé en début de valeur : Wikidata écrit « mont
 * Blanc », « pic d'Orizaba » (typographie française des noms communs), qui
 * jurerait en tête de ligne.
 */
export function capitalizeFirst(text: string, locale: Locale): string {
  return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
}

/**
 * Style régional des dates, aligné sur les millésimes écrits dans
 * `content/sources.ts` (« 23 September 2026 », pas « September 23, 2026 »).
 */
const SHEET_REGION_LOCALES: Readonly<Record<Locale, string>> = {
  fr: "fr-FR",
  en: "en-GB",
};

/**
 * « 5 juillet 1962 » / « 5 July 1962 » : date complète localisée, lue en UTC
 * pour qu'un fuseau négatif ne la décale jamais d'un jour. L'ICU écrit
 * « 1 juillet » : le français veut « 1er juillet » (22 dates de souveraineté
 * tombent un 1er du mois). Les dates du Factbook sont postérieures à l'an
 * 1000 : `Date.UTC` ne les confond pas avec le siècle.
 */
export function formatFullDate(isoDate: string, locale: Locale): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat(SHEET_REGION_LOCALES[locale], {
    dateStyle: "long",
    timeZone: "UTC",
  })
    .formatToParts(new Date(Date.UTC(year, month - 1, day)))
    .map((part) =>
      part.type === "day" && locale === "fr" && day === 1
        ? formatOrdinal(day, locale)
        : part.value,
    )
    .join("");
}
