import { getCountryByCode } from "@/features/countries/lib/search";
import {
  CONSTRAINTS,
  type ConstraintId,
} from "@/features/game/logic/constraints";
import { rarityToTier } from "@/features/game/logic/rarity";
import type { Cell, CellKey, RarityTier } from "@/features/game/types";
import { useLocale } from "@/i18n/LocaleContext";
import { cn } from "@/lib/utils";
import { RarityBadge } from "./RarityBadge";

const CONSTRAINT_MAP = new Map(CONSTRAINTS.map((c) => [c.id, c]));

const ROWS = [0, 1, 2] as const;
const COLS = [0, 1, 2] as const;

const headerClass =
  "flex items-center justify-center text-center text-[10px] font-medium text-on-surface-variant bg-surface-low rounded-xl p-2 leading-tight min-h-[52px]";

/** Ordre d’affichage : du plus rare au plus commun. */
const TIER_ORDER: RarityTier[] = ["ultra", "rare", "uncommon", "common"];

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
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: "minmax(0,1fr) repeat(3, minmax(0,1fr))" }}
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
        const rowLabel = rowConstraint ? t(rowConstraint.labelKey) : rows[row];
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
              const t = tierForCode(code);
              if (t) byTier[t].push(code);
              else untiered.push(code);
            }

            for (const tier of TIER_ORDER) {
              byTier[tier].sort((a, b) => {
                const na = getCountryByCode(a)?.names[locale] ?? a;
                const nb = getCountryByCode(b)?.names[locale] ?? b;
                return na.localeCompare(nb, locale);
              });
            }
            untiered.sort((a, b) => {
              const na = getCountryByCode(a)?.names[locale] ?? a;
              const nb = getCountryByCode(b)?.names[locale] ?? b;
              return na.localeCompare(nb, locale);
            });

            function countryRow(iso: string) {
              const country = getCountryByCode(iso);
              const countryName = country ? country.names[locale] : iso;
              const isUserPick =
                userCell?.status === "filled" && userCell.countryCode === iso;
              return (
                <div
                  key={iso}
                  className={cn(
                    "rounded-lg px-1.5 py-0.5 min-w-0 border",
                    isUserPick
                      ? "border-on-surface/40 bg-surface-low/60"
                      : "border-transparent",
                  )}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-base leading-none shrink-0">
                      {country?.flagEmoji ?? "🏳️"}
                    </span>
                    <span className="text-[9px] font-medium text-on-surface leading-tight line-clamp-1 min-w-0">
                      {countryName}
                    </span>
                  </div>
                </div>
              );
            }

            if (codes.length === 0) {
              return (
                <div
                  key={key}
                  className="min-h-[52px] rounded-xl bg-surface-low flex items-center justify-center p-1 text-[10px] text-on-surface-variant"
                >
                  —
                </div>
              );
            }

            return (
              <div
                key={key}
                className="min-h-[52px] max-h-[220px] rounded-xl bg-surface-lowest p-1 shadow-editorial flex flex-col gap-1.5 overflow-y-auto min-w-0"
              >
                {TIER_ORDER.map((tier) => {
                  const list = byTier[tier];
                  if (list.length === 0) return null;
                  return (
                    <div key={tier} className="flex flex-col gap-0.5">
                      <RarityBadge tier={tier} className="self-start" />
                      {list.map((code) => countryRow(code))}
                    </div>
                  );
                })}
                {untiered.map((code) => countryRow(code))}
              </div>
            );
          }),
        ];
      })}
    </div>
  );
}
