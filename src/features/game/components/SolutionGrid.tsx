import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { loadCountrySheetData } from "@/features/countries/logic/loadCountrySheetData";
import { getCountryByIso3 } from "@/features/countries/logic/search";
import { RARITY_STYLES } from "@/features/game/logic/constants";
import {
  CONSTRAINT_BY_ID,
  type ConstraintId,
} from "@/features/game/logic/constraints";
import { formatRarityPercent } from "@/features/game/logic/rarity";
import { orderSolutionCountries } from "@/features/game/logic/solutionGridOrder";
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
  // pour qu'il soit déjà arrivé au premier tap sur une case ou un en-tête.
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
        const cellDist = distribution?.[key];
        const totalGuesses = cellDist?.totalGuesses ?? 0;
        const userCell = cells[key];

        const rarityByCountry = cellDist?.rarityByCountry ?? {};
        const ordered = orderSolutionCountries(
          codes,
          totalGuesses,
          rarityByCountry,
          (a, b) => compareIsoByLocalizedName(locale, a, b),
        );

        function countryChip(iso: string, tier: RarityTier | null) {
          const country = getCountryByIso3(iso);
          const countryName = country ? country.names[locale] : iso;
          const isUserPick =
            userCell?.status === "filled" && userCell.countryCode === iso;
          const hasData = totalGuesses > 0;
          const share = rarityByCountry[iso] ?? 0;

          return (
            <div
              key={iso}
              className={cn(
                "flex w-full min-w-0 shrink-0 items-baseline gap-x-0.5 rounded-md px-1 py-[3px] text-[8px] font-medium leading-snug sm:px-1.5 sm:py-0.5 sm:text-[11px]",
                tier ? RARITY_STYLES[tier] : "text-on-surface",
                isUserPick && "ring-1 ring-inset ring-on-surface/50",
              )}
            >
              <span
                aria-hidden
                className="shrink-0 text-[8px] leading-none sm:text-[11px]"
              >
                {country?.flagEmoji ?? "🏳️"}
              </span>
              {/* Sur mobile la case est trop étroite pour une colonne % dédiée :
                      le % suit le nom INLINE (il coule dans le texte, largeur max
                      pour le nom). Sur desktop il redevient un item aligné à droite. */}
              <span className="min-w-0 flex-1 break-words">
                {countryName}
                {hasData && (
                  <span className="font-normal tabular-nums sm:hidden">
                    {` ${formatRarityPercent(share)}`}
                  </span>
                )}
              </span>
              {hasData && (
                <span className="hidden shrink-0 text-[7px] font-normal tabular-nums sm:inline sm:text-[9px]">
                  {formatRarityPercent(share)}
                </span>
              )}
            </div>
          );
        }

        if (codes.length === 0) {
          return (
            <div className="relative isolate flex aspect-square min-h-0 w-full items-center justify-center rounded-xl bg-surface-low p-1 text-[10px] text-on-surface-variant">
              —
            </div>
          );
        }

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
              count: codes.length,
            })}
            className="relative isolate block aspect-square h-auto w-full min-h-0 rounded-xl bg-surface-lowest p-0 shadow-editorial"
          >
            <div className="flex h-full min-h-0 flex-col gap-0.5 overflow-y-auto p-1 sm:gap-1 sm:p-1.5">
              {ordered.map(({ iso, tier }) => countryChip(iso, tier))}
            </div>
          </Button>
        );
      }}
    />
  );
}
