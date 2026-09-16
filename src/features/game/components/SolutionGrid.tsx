import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { loadCountrySheetData } from "@/features/countries/logic/loadCountrySheetData";
import { getCountryByIso3 } from "@/features/countries/logic/search";
import { RARITY_STYLES } from "@/features/game/logic/constants";
import {
  CONSTRAINT_BY_ID,
  type ConstraintId,
} from "@/features/game/logic/constraints";
import { isCohortComplete } from "@/features/game/logic/rarity";
import { computeSolutionCellSummary } from "@/features/game/logic/solutionCellSummary";
import type {
  Cell,
  CellGuessDistribution,
  CellKey,
  CellPosition,
  GameModeId,
  RarityTier,
} from "@/features/game/types";
import { useLocale } from "@/i18n/LocaleContext";
import type { Locale } from "@/i18n/types";
import { cn } from "@/lib/utils";
import { ConstraintHeaderButton } from "./ConstraintHeaderButton";
import { GridMatrix } from "./GridMatrix";

function compareIsoByLocalizedName(
  locale: Locale,
  a: string,
  b: string,
): number {
  const na = getCountryByIso3(a)?.names[locale] ?? a;
  const nb = getCountryByIso3(b)?.names[locale] ?? b;
  return na.localeCompare(nb, locale);
}

type Props = {
  rows: ConstraintId[];
  cols: ConstraintId[];
  validAnswers: Record<string, string[]>;
  distribution: Record<string, CellGuessDistribution> | undefined;
  cells: Record<CellKey, Cell>;
  mode?: GameModeId;
  onHeaderClick: (constraintId: ConstraintId) => void;
  onCellClick: (cell: CellPosition) => void;
};

function CountryPill({
  iso,
  tier,
  locale,
  emphasis,
}: {
  iso: string;
  tier: RarityTier | null;
  locale: Locale;
  emphasis: boolean;
}) {
  const country = getCountryByIso3(iso);
  return (
    <span
      className={cn(
        "flex w-full min-w-0 items-center justify-center gap-1 rounded-md px-1 py-0.5 text-[11px] font-medium leading-tight",
        tier ? RARITY_STYLES[tier] : "text-on-surface",
        !emphasis && "opacity-80",
      )}
    >
      <span aria-hidden="true" className="shrink-0 text-[11px] leading-none">
        {country?.flagEmoji ?? "🏳️"}
      </span>
      <span className="min-w-0 truncate">
        {country ? country.names[locale] : iso}
      </span>
    </span>
  );
}

export function SolutionGrid({
  rows,
  cols,
  validAnswers,
  distribution,
  cells,
  mode = "daily",
  onHeaderClick,
  onCellClick,
}: Props) {
  const { locale, t } = useLocale();

  // Précharge le chunk de fiche pays dès le montage de la grille solution,
  // pour qu'il soit déjà arrivé au premier tap sur une case.
  useEffect(() => {
    void loadCountrySheetData();
  }, []);

  const rowLabels = rows.map((constraintId) => {
    const constraint = CONSTRAINT_BY_ID.get(constraintId);
    return constraint ? t(constraint.labelKey) : constraintId;
  });
  const colLabels = cols.map((constraintId) => {
    const constraint = CONSTRAINT_BY_ID.get(constraintId);
    return constraint ? t(constraint.labelKey) : constraintId;
  });
  const cohortComplete = isCohortComplete(mode);

  return (
    <GridMatrix
      ariaLabel={t(
        mode === "training"
          ? "training.solutionGridAriaLabel"
          : "ui.solutionGridAriaLabel",
      )}
      rowLabels={rowLabels}
      colLabels={colLabels}
      renderColumnHeader={(label, col) => (
        <ConstraintHeaderButton
          label={label}
          onClick={() => onHeaderClick(cols[col])}
        />
      )}
      renderRowHeader={(label, row) => (
        <ConstraintHeaderButton
          label={label}
          onClick={() => onHeaderClick(rows[row])}
        />
      )}
      renderCell={({ row, col, rowLabel, colLabel }) => {
        const key = `${row},${col}` as CellKey;
        const codes = validAnswers[key] ?? [];

        if (codes.length === 0) {
          return (
            <div className="relative isolate flex aspect-square min-h-0 w-full items-center justify-center rounded-xl bg-surface-low p-1 text-[10px] text-on-surface-variant">
              —
            </div>
          );
        }

        const summary = computeSolutionCellSummary({
          codes,
          userCell: cells[key],
          cellDist: distribution?.[key],
          cohortComplete,
          compareByName: (a, b) => compareIsoByLocalizedName(locale, a, b),
        });

        const headline = summary.userPick
          ? { iso: summary.userPick.iso, tier: summary.userPick.tier }
          : summary.rarestFound
            ? { iso: summary.rarestFound.iso, tier: summary.rarestFound.tier }
            : null;
        const secondary =
          summary.userPick && summary.rarestFound ? summary.rarestFound : null;

        return (
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={() => onCellClick({ row, col })}
            aria-label={t("ui.solutionCellAriaLabel", {
              row: row + 1,
              col: col + 1,
              rowConstraint: rowLabel,
              colConstraint: colLabel,
              count: summary.answerCount,
            })}
            className="relative isolate flex aspect-square w-full min-h-0 flex-col items-center justify-center gap-0.5 rounded-xl bg-surface-lowest p-1.5 shadow-editorial hover:bg-surface-highest/40"
          >
            {headline && (
              <CountryPill
                iso={headline.iso}
                tier={headline.tier}
                locale={locale}
                emphasis
              />
            )}
            {secondary && (
              <CountryPill
                iso={secondary.iso}
                tier={secondary.tier}
                locale={locale}
                emphasis={false}
              />
            )}
            <span className="text-[10px] text-on-surface-variant">
              {t("countrySheet.cell.answerCount", {
                count: summary.answerCount,
              })}
            </span>
          </Button>
        );
      }}
    />
  );
}
