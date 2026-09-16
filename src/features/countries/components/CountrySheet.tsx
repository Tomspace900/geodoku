import { Eyebrow } from "@/components/editorial/Eyebrow";
import { getCountryByIso3 } from "@/features/countries/logic/search";
import { useLocale } from "@/i18n/LocaleContext";
import type { Locale, TKey } from "@/i18n/types";
import { SOURCES } from "../../../../content/sources";
import type {
  CountrySheetCategory,
  CountrySheetModel,
  CountrySheetValue,
} from "../logic/countrySheet";
import {
  formatInteger,
  formatLanguageName,
  formatList,
  formatOrdinal,
  formatPercent,
  formatYear,
} from "../logic/countrySheetFormat";
import { NON_PLAYABLE_BORDER_TERRITORY_LABELS } from "../logic/nonPlayableBorderTerritories";

type TranslateFn = (
  key: TKey,
  vars?: Record<string, string | number>,
) => string;

function territoryName(iso3: string, locale: Locale, t: TranslateFn): string {
  const country = getCountryByIso3(iso3);
  if (country) return country.names[locale];
  const territoryKey = NON_PLAYABLE_BORDER_TERRITORY_LABELS[iso3];
  return territoryKey ? t(territoryKey) : iso3;
}

function renderValue(
  value: CountrySheetValue,
  locale: Locale,
  t: TranslateFn,
): string {
  switch (value.kind) {
    case "enum":
      return t(value.labelKey);
    case "enumList":
      return formatList(
        value.labelKeys.map((key) => t(key)),
        locale,
      );
    case "count":
      return formatInteger(value.value, locale);
    case "countWithZeroLabel":
      return value.value === 0
        ? t(value.zeroLabelKey)
        : formatInteger(value.value, locale);
    case "area":
      return t("countrySheet.value.areaUnit", {
        value: formatInteger(value.km2, locale),
      });
    case "density":
      return t("countrySheet.value.densityUnit", {
        value: formatInteger(value.value, locale),
      });
    case "percent":
      return formatPercent(value.value, locale);
    case "year":
      return formatYear(value.value, locale);
    case "countries": {
      if (value.iso3.length === 0) {
        return value.emptyLabelKey ? t(value.emptyLabelKey) : "";
      }
      return formatList(
        value.iso3.map((iso) => territoryName(iso, locale, t)),
        locale,
      );
    }
    case "languages":
      return formatList(
        value.codes.map((code) => formatLanguageName(code, locale)),
        locale,
      );
    case "capitals":
      return formatList(
        value.capitals.map((capital) =>
          capital.roleLabelKeys.length > 0
            ? `${capital.name} (${capital.roleLabelKeys.map((key) => t(key)).join(", ")})`
            : capital.name,
        ),
        locale,
      );
    case "productions":
      return formatList(
        value.entries.map((entry) =>
          t("countrySheet.value.productionRank", {
            rank: formatOrdinal(entry.rank, locale),
            product: t(entry.productLabelKey),
          }),
        ),
        locale,
      );
    case "sovereignty":
      return t("countrySheet.value.sovereigntyValue", {
        kind: t(value.kindLabelKey),
        year: formatYear(value.year, locale),
      });
  }
}

function CategorySection({
  category,
  locale,
  t,
}: {
  category: CountrySheetCategory;
  locale: Locale;
  t: TranslateFn;
}) {
  return (
    <section className="flex flex-col gap-2">
      <Eyebrow>{t(category.titleKey)}</Eyebrow>
      <dl className="flex flex-col gap-1.5">
        {category.rows.map((row) => (
          <div
            key={row.labelKey}
            className="flex items-baseline justify-between gap-3 text-sm"
          >
            <dt className="text-on-surface-variant">{t(row.labelKey)}</dt>
            <dd className="text-right font-medium text-on-surface">
              {renderValue(row.value, locale, t)}
              {row.value.kind === "capitals" &&
                row.value.capitalNotLargestCity && (
                  <span className="ml-1 font-normal text-on-surface-variant">
                    ({t("countrySheet.value.capitalNotLargest")})
                  </span>
                )}
            </dd>
          </div>
        ))}
      </dl>
      {category.sources.length > 0 && (
        <p className="text-[10px] text-on-surface-variant">
          {category.sources
            .map((sourceId) => SOURCES[sourceId].name[locale])
            .join(", ")}
        </p>
      )}
    </section>
  );
}

/**
 * Rend le modèle pur de `buildCountrySheet` : titres de catégorie en
 * `Eyebrow`, lignes libellé/valeur, sources en pied de catégorie. Seul
 * composant (avec `countrySheetFormat.ts`) à appeler `t()`/`Intl` pour cette
 * feature — le modèle lui-même reste locale-agnostique.
 */
export function CountrySheet({ model }: { model: CountrySheetModel }) {
  const { locale, t } = useLocale();
  return (
    <div className="flex flex-col gap-5">
      {model.subregionLabelKey && (
        <p className="text-xs text-on-surface-variant">
          {t(model.subregionLabelKey)}
        </p>
      )}
      {model.categories.map((cat) => (
        <CategorySection
          key={cat.titleKey}
          category={cat}
          locale={locale}
          t={t}
        />
      ))}
    </div>
  );
}
