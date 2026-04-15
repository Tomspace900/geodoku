import { getCountryByCode } from "@/features/countries/lib/search";
import { formatRarityPercent } from "@/features/game/logic/rarity";
import type { Cell, CellPosition, RarityTier } from "@/features/game/types";
import { useLocale } from "@/i18n/LocaleContext";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

const RARITY_STYLES: Record<RarityTier, string> = {
  common: "bg-rarity-common/10 text-rarity-common",
  uncommon: "bg-rarity-uncommon text-rarity-common",
  rare: "bg-rarity-rare/10 text-rarity-rare",
  ultra: "bg-rarity-ultra/10 text-rarity-ultra",
};

type RarityBadgeProps = {
  tier: RarityTier;
  rarity: number;
};

function RarityBadge({ tier, rarity }: RarityBadgeProps) {
  return (
    <span
      className={cn(
        "text-[8px] font-semibold rounded-full px-1.5 py-0.5 leading-none mt-0.5",
        RARITY_STYLES[tier],
      )}
    >
      {formatRarityPercent(rarity)}
    </span>
  );
}

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
        aria-label={
          country
            ? `${countryName} — ${formatRarityPercent(cell.rarity)}`
            : cell.countryCode
        }
      >
        <span className="text-2xl leading-none">
          {country?.flagEmoji ?? "🏳️"}
        </span>
        <span className="text-[9px] font-medium text-on-surface text-center leading-tight line-clamp-2 px-0.5">
          {countryName}
        </span>
        <RarityBadge tier={cell.rarityTier} rarity={cell.rarity} />
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
