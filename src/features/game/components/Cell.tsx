import { getCountryByIso3 } from "@/features/countries/lib/search";
import { UI_ANIMATION_MS } from "@/features/game/logic/constants";
import type { Cell, CellPosition } from "@/features/game/types";
import { useLocale } from "@/i18n/LocaleContext";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { RarityBadge } from "./RarityBadge";

type Props = {
  cell: Cell;
  position: CellPosition;
  isDisabled: boolean;
  onClick: () => void;
};

export function CellComponent({ cell, position, isDisabled, onClick }: Props) {
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
      <div
        className="aspect-square w-full rounded-xl bg-surface-lowest flex flex-col items-center justify-center gap-0.5 p-1 shadow-editorial"
        aria-label={countryName ?? cell.countryCode}
      >
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
        <RarityBadge tier={cell.rarityTier} className="mt-0.5" />
      </div>
    );
  }

  if (cell.status === "blocked") {
    return (
      <div
        className="aspect-square w-full rounded-xl bg-surface-low flex items-center justify-center"
        aria-label={t("ui.cellBlockedAriaLabel")}
      >
        <X size={18} className="text-on-surface-variant/40" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-label={t("ui.cellAriaLabel", {
        row: position.row + 1,
        col: position.col + 1,
      })}
      className={cn(
        "aspect-square w-full rounded-xl flex items-center justify-center transition-colors duration-150",
        isDisabled
          ? "bg-surface-low opacity-50 cursor-not-allowed"
          : "bg-surface-lowest hover:bg-surface-highest cursor-pointer",
      )}
    >
      <Plus size={20} className="text-on-surface-variant" />
    </button>
  );
}
