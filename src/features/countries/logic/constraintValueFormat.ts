import type { Locale, TKey } from "@/i18n/types";
import type { ConstraintValue } from "./constraintValue";
import {
  capitalizeFirst,
  formatFullDate,
  formatInteger,
  formatLanguageName,
  formatList,
  formatOrdinal,
  formatPercent,
  formatYear,
} from "./countrySheetFormat";
import { getCountryByIso3 } from "./search";

type TranslateFn = (
  key: TKey,
  vars?: Record<string, string | number>,
) => string;

/**
 * Trois chiffres significatifs (« 241 M », « 1,43 Md ») : un drawer de liste
 * n'a pas la place du nombre exact.
 */
function formatCompact(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumSignificantDigits: 3,
  }).format(value);
}

const SHARE_LABEL_KEYS = {
  forest: "constraintValue.forestShare",
  mountain: "constraintValue.mountainShare",
  coal: "constraintValue.coalShare",
} as const satisfies Record<
  Extract<ConstraintValue, { kind: "share" }>["share"],
  TKey
>;

/**
 * Texte court d'une valeur de contrainte, pour la ligne d'un pays dans le
 * drawer de la grille solution. Les unités et les noms réutilisent les
 * libellés `countrySheet.value.*` ; le rang et les fuseaux sont écrits plus court
 * ici — la ligne partage la place avec une seconde valeur — et suivent le
 * vocabulaire du libellé de contrainte (« fuseaux horaires »).
 */
export function formatConstraintValue(
  value: ConstraintValue,
  locale: Locale,
  t: TranslateFn,
): string {
  switch (value.kind) {
    case "population":
      return t("constraintValue.population", {
        value: formatCompact(value.value, locale),
      });
    case "area":
      return t("countrySheet.value.areaUnit", {
        value: formatInteger(value.km2, locale),
      });
    case "density":
      return t("countrySheet.value.densityUnit", {
        value: formatInteger(value.value, locale),
      });
    case "borderCount":
      return t("constraintValue.borderCount", { count: value.count });
    case "utcOffsets":
      return t("constraintValue.utcOffsets", {
        count: formatInteger(value.count, locale),
      });
    case "latitude":
      return t(
        value.north
          ? "constraintValue.latitudeNorth"
          : "constraintValue.latitudeSouth",
        { value: formatInteger(value.degrees, locale) },
      );
    case "share":
      return t(SHARE_LABEL_KEYS[value.share], {
        value: formatPercent(value.fraction, locale),
      });
    case "rank":
      return t("constraintValue.rank", {
        rank: formatOrdinal(value.rank, locale),
        product: t(value.productLabelKey),
      });
    case "lastEruption":
      return t("constraintValue.lastEruption", {
        year: formatYear(value.year, locale),
      });
    case "highestPoint":
      return t("countrySheet.value.highestPoint", {
        name: value.names
          ? capitalizeFirst(value.names[locale], locale)
          : t("countrySheet.value.unnamedHighestPoint"),
        value: formatInteger(value.elevationM, locale),
      });
    case "neighbors":
      return t("constraintValue.soleNeighbor", {
        names: formatList(
          value.iso3.map((iso) => getCountryByIso3(iso)?.names[locale] ?? iso),
          locale,
        ),
      });
    case "sovereignty":
      return t("countrySheet.value.sovereignty", {
        kind: t(value.kindLabelKey),
        when: value.date
          ? formatFullDate(value.date, locale)
          : formatYear(value.year, locale),
      });
    case "enumList":
      return formatList(
        value.labelKeys.map((key) => t(key)),
        locale,
      );
    case "languages":
      return formatList(
        value.codes.map((code) => formatLanguageName(code, locale)),
        locale,
      );
    case "capitals":
      return t(
        value.names.length > 1
          ? "constraintValue.capitalPlural"
          : "constraintValue.capitalSingular",
        {
          names: formatList(
            value.names.map((names) => names[locale]),
            locale,
          ),
        },
      );
  }
}
