import { getCountryByCode } from "@/features/countries/lib/search";
import {
  MIN_CELL_TOTAL_GUESSES_FOR_SHARE_PERCENT,
  RARITY_STYLES,
} from "@/features/game/logic/constants";
import {
  CONSTRAINTS,
  type ConstraintId,
} from "@/features/game/logic/constraints";
import {
  formatRarityPercent,
  rarityToTier,
} from "@/features/game/logic/rarity";
import type { Cell, CellKey, RarityTier } from "@/features/game/types";
import { useLocale } from "@/i18n/LocaleContext";
import type { Locale } from "@/i18n/types";
import { cn } from "@/lib/utils";

const CONSTRAINT_MAP = new Map(CONSTRAINTS.map((c) => [c.id, c]));

const ROWS = [0, 1, 2] as const;
const COLS = [0, 1, 2] as const;

const headerClass =
  "flex items-center justify-center text-center text-[10px] font-medium text-on-surface-variant bg-surface-low rounded-xl p-2 leading-tight min-h-[52px]";

/** Ordre d’affichage : du plus rare au plus commun. */
const TIER_ORDER: RarityTier[] = ["ultra", "rare", "uncommon", "common"];

const RARITY_LEGEND_LI_KEYS = [
  "howToPlay.li1",
  "howToPlay.li2",
  "howToPlay.li3",
  "howToPlay.li4",
] as const;

function compareIsoByLocalizedName(
  locale: Locale,
  a: string,
  b: string,
): number {
  const na = getCountryByCode(a)?.names[locale] ?? a;
  const nb = getCountryByCode(b)?.names[locale] ?? b;
  return na.localeCompare(nb, locale);
}

function emptyTierBuckets(): Record<RarityTier, string[]> {
  return { ultra: [], rare: [], uncommon: [], common: [] };
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
          const constraint = CONSTRAINT_MAP.get(cols[col]);
          const label = constraint ? t(constraint.labelKey) : cols[col];
          return (
            <div key={`col-${col}`} className={cn(headerClass, "p-1.5")}>
              {label}
            </div>
          );
        })}

        {ROWS.map((row) => {
          const rowConstraint = CONSTRAINT_MAP.get(rows[row]);
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

              function tierForCode(iso: string): RarityTier | null {
                if (
                  userCell?.status === "filled" &&
                  userCell.countryCode === iso
                ) {
                  return userCell.rarityTier;
                }
                if (totalGuesses > 0) {
                  const r = cellDist?.rarityByCountry[iso] ?? 0;
                  return rarityToTier(r);
                }
                return null;
              }

              const byTier = emptyTierBuckets();
              const untiered: string[] = [];
              for (const code of codes) {
                const tier = tierForCode(code);
                if (tier) byTier[tier].push(code);
                else untiered.push(code);
              }

              for (const tier of TIER_ORDER) {
                byTier[tier].sort((a, b) =>
                  compareIsoByLocalizedName(locale, a, b),
                );
              }
              untiered.sort((a, b) => compareIsoByLocalizedName(locale, a, b));

              const ordered: { iso: string; tier: RarityTier | null }[] = [];
              for (const tier of TIER_ORDER) {
                for (const iso of byTier[tier]) {
                  ordered.push({ iso, tier });
                }
              }
              for (const iso of untiered) {
                ordered.push({ iso, tier: null });
              }

              function countryChip(iso: string, tier: RarityTier | null) {
                const country = getCountryByCode(iso);
                const countryName = country ? country.names[locale] : iso;
                const isUserPick =
                  userCell?.status === "filled" && userCell.countryCode === iso;
                const showSharePct =
                  totalGuesses >= MIN_CELL_TOTAL_GUESSES_FOR_SHARE_PERCENT;
                const sharePct = showSharePct
                  ? formatRarityPercent(cellDist?.rarityByCountry[iso] ?? 0)
                  : null;

                return (
                  <span
                    key={iso}
                    className={cn(
                      "inline-flex max-w-full min-w-0 items-baseline gap-x-1 gap-y-0 rounded-md border border-transparent px-1.5 py-0.5 text-[11px] font-medium leading-snug",
                      tier
                        ? RARITY_STYLES[tier]
                        : "bg-surface-low text-on-surface",
                      isUserPick && "border-on-surface/50",
                    )}
                  >
                    <span
                      aria-hidden
                      className="shrink-0 text-[11px] leading-none"
                    >
                      {country?.flagEmoji ?? "🏳️"}
                    </span>
                    <span className="flex min-w-0 flex-wrap items-baseline gap-x-1">
                      <span className="min-w-0 break-words">{countryName}</span>
                      {sharePct !== null && (
                        <span className="shrink-0 text-[9px] font-normal tabular-nums text-current/85">
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
                  <div className="flex h-full min-h-0 flex-wrap content-start gap-1 overflow-y-auto p-1.5">
                    {ordered.map(({ iso, tier }) => countryChip(iso, tier))}
                  </div>
                </div>
              );
            }),
          ];
        })}
      </div>

      <div className="space-y-2 rounded-lg bg-surface-low p-4">
        <p className="text-[10px] tracking-widest uppercase text-on-surface-variant">
          {t("ui.solutionRarityEyebrow")}
        </p>
        <p className="text-xs text-on-surface-variant leading-relaxed">
          {t("ui.solutionRarityHint")}
        </p>
        <ul className="space-y-1.5 text-xs text-on-surface-variant leading-snug">
          {RARITY_LEGEND_LI_KEYS.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
