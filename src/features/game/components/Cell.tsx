import { getCountryByCode } from "@/features/countries/lib/search";
import type { Cell, CellPosition } from "@/features/game/types";
import { useLocale } from "@/i18n/LocaleContext";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { RarityBadge } from "./RarityBadge";

type Props = {
  cell: Cell;
  position: CellPosition;
  isDisabled: boolean;
  onClick: () => void;
};

export function CellComponent({ cell, position, isDisabled, onClick }: Props) {
  const { locale, t } = useLocale();

  if (cell.status === "filled") {
    const country = getCountryByCode(cell.countryCode);
    const countryName = country ? country.names[locale] : cell.countryCode;
    return (
      <div
        className="aspect-square w-full rounded-xl bg-surface-lowest flex flex-col items-center justify-center gap-0.5 p-1 shadow-editorial"
        aria-label={countryName ?? cell.countryCode}
      >
        <span className="text-2xl leading-none">
          {country?.flagEmoji ?? "🏳️"}
        </span>
        <span className="text-[9px] font-medium text-on-surface text-center leading-tight line-clamp-2 px-0.5">
          {countryName}
        </span>
        <RarityBadge tier={cell.rarityTier} className="mt-0.5" />
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
