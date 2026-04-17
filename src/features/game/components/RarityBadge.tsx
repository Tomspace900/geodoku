import { RARITY_STYLES } from "@/features/game/logic/constants";
import type { RarityTier } from "@/features/game/types";
import { useT } from "@/i18n/LocaleContext";
import { cn } from "@/lib/utils";

type Props = {
  tier: RarityTier;
  className?: string;
};

export function RarityBadge({ tier, className }: Props) {
  const t = useT();
  return (
    <span
      className={cn(
        "text-[8px] font-semibold rounded-full px-1.5 py-0.5 leading-none",
        RARITY_STYLES[tier],
        className,
      )}
    >
      {t(`rarity.${tier}`)}
    </span>
  );
}
