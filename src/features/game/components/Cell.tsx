import { getCountryByCode } from "@/features/countries/lib/search";
import { formatRarityPercent } from "@/features/game/logic/rarity";
import type { Cell, CellPosition, RarityTier } from "@/features/game/types";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

const RARITY_STYLES: Record<RarityTier, string> = {
  common: "bg-[#56606e]/10 text-[#56606e]",
  uncommon: "bg-[#e5e2e1] text-[#56606e]",
  rare: "bg-[#842cd3]/10 text-[#842cd3]",
  ultra: "bg-[#9f403d]/10 text-[#9f403d]",
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
  if (cell.status === "filled") {
    const country = getCountryByCode(cell.countryCode);
    return (
      <div
        className="aspect-square w-full rounded-xl bg-surface-lowest flex flex-col items-center justify-center gap-0.5 p-1 shadow-editorial"
        aria-label={
          country
            ? `${country.nameCanonical} — ${formatRarityPercent(cell.rarity)}`
            : cell.countryCode
        }
      >
        <span className="text-2xl leading-none">
          {country?.flagEmoji ?? "🏳️"}
        </span>
        <span className="text-[9px] font-medium text-on-surface text-center leading-tight line-clamp-2 px-0.5">
          {country?.nameCanonical ?? cell.countryCode}
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
      aria-label={`Sélectionner case ligne ${position.row + 1} colonne ${position.col + 1}`}
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
