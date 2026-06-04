import { RarityBadge } from "@/features/game/components/RarityBadge";
import type { RarityTier } from "@/features/game/types";
import { useT } from "@/i18n/LocaleContext";
import { cn } from "@/lib/utils";

/** Seuils de rareté = part des joueurs ayant soumis le pays (cf. RARITY_TIERS). */
const RARITY_LEGEND: { tier: RarityTier; threshold: string }[] = [
  { tier: "common", threshold: "> 50%" },
  { tier: "uncommon", threshold: "> 25%" },
  { tier: "rare", threshold: "> 10%" },
  { tier: "ultra", threshold: "≤ 10%" },
];

export function RarityLegend({ className }: { className?: string }) {
  const t = useT();
  return (
    <div className={cn("space-y-2 rounded-lg bg-surface-low p-3", className)}>
      <p className="text-xs text-on-surface-variant leading-relaxed">
        {t("ui.rarityLegendHint")}
      </p>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {RARITY_LEGEND.map(({ tier, threshold }) => (
          <li key={tier} className="flex items-center gap-1.5">
            <RarityBadge tier={tier} className="text-[10px]" />
            <span className="font-sans text-xs text-on-surface-variant tabular-nums">
              {threshold}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
