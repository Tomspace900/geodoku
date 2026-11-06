import { SHARE_EMOJIS } from "@/features/game/logic/constants";
import type { RarityTier } from "@/features/game/types";
import { useLocale } from "@/i18n/LocaleContext";
import { cn } from "@/lib/utils";
import { type MyStats, TIER_ORDER } from "../logic/myStats";

const TIER_BG: Record<RarityTier, string> = {
  common: "bg-rarity-common",
  uncommon: "bg-rarity-uncommon",
  rare: "bg-rarity-rare",
  ultra: "bg-rarity-ultra",
};

const TIER_TEXT: Record<RarityTier, string> = {
  common: "text-rarity-common",
  uncommon: "text-rarity-uncommon",
  rare: "text-rarity-rare",
  ultra: "text-rarity-ultra",
};

/** « Ma palette » : la part de chaque tier parmi tous les pays placés. */
export function PaletteBar({ stats }: { stats: MyStats }) {
  const { t } = useLocale();
  return (
    <div className="flex flex-col gap-2.5">
      <div
        aria-hidden
        className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-surface-low"
      >
        {TIER_ORDER.filter((tier) => stats.tierCounts[tier] > 0).map((tier) => (
          <span
            key={tier}
            className={cn("h-full", TIER_BG[tier])}
            style={{ flexGrow: stats.tierCounts[tier] }}
          />
        ))}
      </div>
      <ul className="grid grid-cols-4 gap-1">
        {TIER_ORDER.map((tier) => (
          <li key={tier} className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1">
              <span aria-hidden className="text-sm leading-none">
                {SHARE_EMOJIS[tier]}
              </span>
              <span
                className={cn(
                  "font-serif text-lg font-medium leading-none tabular-nums",
                  TIER_TEXT[tier],
                )}
              >
                {`${stats.tierPercents[tier]}%`}
              </span>
            </span>
            <span className="text-[11px] text-on-surface-variant">
              {t(`rarity.${tier}`)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
