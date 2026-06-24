import { getCountryByIso3 } from "@/features/countries/lib/search";
import { RarityLegend } from "@/features/game/components/RarityLegend";
import {
  MIN_CELL_TOTAL_GUESSES_FOR_SHARE_PERCENT,
  RARITY_STYLES,
} from "@/features/game/logic/constants";
import {
  CONSTRAINT_BY_ID,
  type ConstraintId,
} from "@/features/game/logic/constraints";
import { formatRarityPercent } from "@/features/game/logic/rarity";
import { orderSolutionCountries } from "@/features/game/logic/solutionGridOrder";
import type { Cell, CellKey, RarityTier } from "@/features/game/types";
import { useLocale } from "@/i18n/LocaleContext";
import type { Locale } from "@/i18n/types";
import { cn } from "@/lib/utils";

const ROWS = [0, 1, 2] as const;
const COLS = [0, 1, 2] as const;

const headerClass =
  "flex items-center justify-center text-center text-[10px] font-medium text-on-surface-variant bg-surface-low rounded-xl p-2 leading-tight min-h-[52px]";

function compareIsoByLocalizedName(
  locale: Locale,
  a: string,
  b: string,
): number {
  const na = getCountryByIso3(a)?.names[locale] ?? a;
  const nb = getCountryByIso3(b)?.names[locale] ?? b;
  return na.localeCompare(nb, locale);
}

export type CellGuessDistribution = {
  totalGuesses: number;
  rarityByCountry: Record<string, number>;
};

type Props = {
  rows: ConstraintId[];
  cols: ConstraintId[];
  validAnswers: Record<string, string[]>;
  distribution: Record<string, CellGuessDistribution> | undefined;
  cells: Record<CellKey, Cell>;
};

export function SolutionGrid({
  rows,
  cols,
  validAnswers,
  distribution,
  cells,
}: Props) {
  const { locale, t } = useLocale();

  return (
    <div className="flex flex-col gap-4">
      <div
        className="grid gap-1.5"
        style={{
          gridTemplateColumns: "minmax(0,1fr) repeat(3, minmax(0,1fr))",
        }}
      >
        <div />

        {COLS.map((col) => {
          const constraint = CONSTRAINT_BY_ID.get(cols[col]);
          const label = constraint ? t(constraint.labelKey) : cols[col];
          return (
            <div key={`col-${col}`} className={cn(headerClass, "p-1.5")}>
              {label}
            </div>
          );
        })}

        {ROWS.map((row) => {
          const rowConstraint = CONSTRAINT_BY_ID.get(rows[row]);
          const rowLabel = rowConstraint
            ? t(rowConstraint.labelKey)
            : rows[row];
          return [
            <div key={`row-${row}`} className={cn(headerClass, "p-1.5")}>
              {rowLabel}
            </div>,

            ...COLS.map((col) => {
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
                userCell,
                (a, b) => compareIsoByLocalizedName(locale, a, b),
              );

              function countryChip(iso: string, tier: RarityTier | null) {
                const country = getCountryByIso3(iso);
                const countryName = country ? country.names[locale] : iso;
                const isUserPick =
                  userCell?.status === "filled" && userCell.countryCode === iso;
                const showSharePct =
                  totalGuesses >= MIN_CELL_TOTAL_GUESSES_FOR_SHARE_PERCENT;
                const sharePct = showSharePct
                  ? formatRarityPercent(rarityByCountry[iso] ?? 0)
                  : null;

                return (
                  <span
                    key={iso}
                    className={cn(
                      "inline-flex max-w-full min-w-0 items-baseline gap-x-0.5 gap-y-0 rounded-md px-1 py-[3px] text-[8px] font-medium leading-snug sm:gap-x-1 sm:px-1.5 sm:py-0.5 sm:text-[11px]",
                      tier
                        ? RARITY_STYLES[tier]
                        : "bg-surface-low text-on-surface",
                      isUserPick && "ring-1 ring-inset ring-on-surface/50",
                    )}
                  >
                    <span
                      aria-hidden
                      className="shrink-0 text-[8px] leading-none sm:text-[11px]"
                    >
                      {country?.flagEmoji ?? "🏳️"}
                    </span>
                    <span className="flex min-w-0 flex-wrap items-baseline gap-x-0.5 sm:gap-x-1">
                      <span className="min-w-0 break-words">{countryName}</span>
                      {sharePct !== null && (
                        <span className="shrink-0 text-[7px] font-normal tabular-nums text-current/85 sm:text-[9px]">
                          ({sharePct})
                        </span>
                      )}
                    </span>
                  </span>
                );
              }

              if (codes.length === 0) {
                return (
                  <div
                    key={key}
                    className="relative isolate flex aspect-square min-h-0 w-full items-center justify-center rounded-xl bg-surface-low p-1 text-[10px] text-on-surface-variant"
                  >
                    —
                  </div>
                );
              }

              return (
                <div
                  key={key}
                  className="relative isolate aspect-square w-full min-h-0 rounded-xl bg-surface-lowest shadow-editorial"
                >
                  <div className="flex h-full min-h-0 flex-col gap-0.5 overflow-y-auto p-1 sm:gap-1 sm:p-1.5">
                    {ordered.map(({ iso, tier }) => countryChip(iso, tier))}
                  </div>
                </div>
              );
            }),
          ];
        })}
      </div>

      <RarityLegend />
    </div>
  );
}
