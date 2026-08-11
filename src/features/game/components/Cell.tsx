import { Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getCountryByIso3 } from "@/features/countries/logic/search";
import { UI_ANIMATION_MS } from "@/features/game/logic/constants";
import { toCellKey } from "@/features/game/logic/gridTopology";
import type { Cell, CellPosition, RarityTier } from "@/features/game/types";
import { useLocale } from "@/i18n/LocaleContext";
import { cn } from "@/lib/utils";
import { RarityBadge } from "./RarityBadge";

type Props = {
  cell: Cell;
  position: CellPosition;
  rowLabel: string;
  colLabel: string;
  isDisabled: boolean;
  onClick: () => void;
  /** Tier dérivé de la distribution dynamique ; `null` tant qu'elle charge. */
  tier: RarityTier | null;
};

export function CellComponent({
  cell,
  position,
  rowLabel,
  colLabel,
  isDisabled,
  onClick,
  tier,
}: Props) {
  const { locale, t } = useLocale();
  const prevStatusRef = useRef(cell.status);
  const [flagBounce, setFlagBounce] = useState(false);

  useEffect(() => {
    if (cell.status === "filled" && prevStatusRef.current !== "filled") {
      setFlagBounce(true);
      const timer = setTimeout(
        () => setFlagBounce(false),
        UI_ANIMATION_MS.flagBounce,
      );
      prevStatusRef.current = cell.status;
      return () => clearTimeout(timer);
    }
    prevStatusRef.current = cell.status;
  }, [cell.status]);

  if (cell.status === "filled") {
    const country = getCountryByIso3(cell.countryCode);
    const countryName = country ? country.names[locale] : cell.countryCode;
    return (
      <div className="aspect-square w-full rounded-xl bg-surface-lowest flex flex-col items-center justify-center gap-0.5 p-1 shadow-editorial">
        <span className="sr-only">
          {t("ui.cellFilledAriaLabel", {
            row: position.row + 1,
            col: position.col + 1,
            rowConstraint: rowLabel,
            colConstraint: colLabel,
            country: countryName ?? cell.countryCode,
          })}
        </span>
        <div aria-hidden="true" className="contents">
          <span
            className={cn(
              "inline-block origin-center text-2xl leading-none",
              flagBounce && "animate-flag-bounce",
            )}
          >
            {country?.flagEmoji ?? "🏳️"}
          </span>
          <span className="text-[9px] font-medium text-on-surface text-center leading-tight line-clamp-2 px-0.5">
            {countryName}
          </span>
          <RarityBadge tier={tier} className="mt-0.5" />
        </div>
      </div>
    );
  }

  if (cell.status === "blocked") {
    return (
      <div className="aspect-square w-full rounded-xl bg-surface-low flex items-center justify-center">
        <span className="sr-only">
          {t("ui.cellBlockedAriaLabel", {
            row: position.row + 1,
            col: position.col + 1,
            rowConstraint: rowLabel,
            colConstraint: colLabel,
          })}
        </span>
        <X
          size={18}
          className="text-on-surface-variant/40"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      data-cell-key={toCellKey(position)}
      aria-label={t("ui.cellAriaLabel", {
        row: position.row + 1,
        col: position.col + 1,
        rowConstraint: rowLabel,
        colConstraint: colLabel,
      })}
      className={cn(
        "aspect-square w-full rounded-xl flex items-center justify-center transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-surface/20 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        isDisabled
          ? "bg-surface-low opacity-50 cursor-not-allowed"
          : "bg-surface-lowest hover:bg-surface-highest cursor-pointer",
      )}
    >
      <Plus size={20} className="text-on-surface-variant" aria-hidden="true" />
    </button>
  );
}
