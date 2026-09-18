import { Eyebrow } from "@/components/editorial/Eyebrow";
import { Button } from "@/components/ui/button";
import { getCountryByIso3 } from "@/features/countries/logic/search";
import { useLocale } from "@/i18n/LocaleContext";
import type { Locale, TKey } from "@/i18n/types";
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
  sourceReferences,
} from "../logic/countrySheetFormat";

type TranslateFn = (
  key: TKey,
  vars?: Record<string, string | number>,
) => string;

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
    case "utcOffsets":
      return t(value.labelKey, {
        count: formatInteger(value.count, locale),
      });
    case "countries": {
      if (value.iso3.length === 0) {
        return value.emptyLabelKey ? t(value.emptyLabelKey) : "";
      }
      const names = value.iso3.map(
        (iso) => getCountryByIso3(iso)?.names[locale] ?? iso,
      );
      return formatList(
        [...names].sort((a, b) => a.localeCompare(b, locale)),
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
          value.capitals.length > 1 && capital.roleLabelKeys.length > 0
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
  }
}

function RowCaption({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] text-on-surface-variant">{children}</p>;
}

function CapitalNotLargestCaption({
  capitalCount,
  t,
}: {
  capitalCount: number;
  t: TranslateFn;
}) {
  return (
    <RowCaption>
      {t(
        capitalCount > 1
          ? "countrySheet.value.capitalNotLargestPlural"
          : "countrySheet.value.capitalNotLargestSingular",
      )}
    </RowCaption>
  );
}

/** Ligne discrète propre à une catégorie : une légende « Classification Geodoku ». */
function ConventionCaption({ t }: { t: TranslateFn }) {
  return <RowCaption>{t("ui.constraintSourceConvention")}</RowCaption>;
}

/**
 * Légende de sources d'une catégorie, sur le patron du toast de source
 * (lot 1) : « Source(s) : nom (millésime), … » avec des liens. Une
 * catégorie ne cite que les sources réellement engagées par ses lignes
 * affichées — pas toutes les sources possibles de la famille de faits.
 */
function CategorySourceLegend({
  sourceIds,
  locale,
  t,
}: {
  sourceIds: CountrySheetCategory["sources"];
  locale: Locale;
  t: TranslateFn;
}) {
  if (sourceIds.length === 0) return null;
  const sources = sourceReferences(sourceIds, locale);
  return (
    <RowCaption>
      {t(
        sources.length > 1
          ? "ui.constraintSourcesPrefix"
          : "ui.constraintSourcePrefix",
      )}{" "}
      {sources.map((source, index) => (
        <span key={source.id}>
          {index > 0 && ", "}
          <Button asChild variant="link" className="h-auto p-0 text-[10px]">
            <a href={source.url} target="_blank" rel="noreferrer">
              {source.name}
            </a>
          </Button>
          {source.vintage ? ` (${source.vintage})` : ""}
        </span>
      ))}
    </RowCaption>
  );
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
          <div key={row.labelKey} className="flex flex-col gap-0.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <dt className="text-on-surface-variant">{t(row.labelKey)}</dt>
              <dd className="text-right font-medium text-on-surface">
                {renderValue(row.value, locale, t)}
              </dd>
            </div>
            {row.value.kind === "capitals" &&
              row.value.capitalNotLargestCity && (
                <CapitalNotLargestCaption
                  capitalCount={row.value.capitals.length}
                  t={t}
                />
              )}
            {row.basis === "convention" && <ConventionCaption t={t} />}
          </div>
        ))}
      </dl>
      <CategorySourceLegend
        sourceIds={category.sources}
        locale={locale}
        t={t}
      />
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
