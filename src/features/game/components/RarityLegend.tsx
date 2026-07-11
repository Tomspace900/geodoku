import { SHARE_EMOJIS } from "@/features/game/logic/constants";
import type { RarityTier } from "@/features/game/types";
import { useT } from "@/i18n/LocaleContext";
import type { TKey } from "@/i18n/types";
import { cn } from "@/lib/utils";

// Ordonné du plus commun au plus rare (comme la progression des carrés de partage).
const LEGEND_TIERS: { tier: RarityTier; thresholdKey: TKey }[] = [
  { tier: "common", thresholdKey: "scoring.legendCommon" },
  { tier: "uncommon", thresholdKey: "scoring.legendUncommon" },
  { tier: "rare", thresholdKey: "scoring.legendRare" },
  { tier: "ultra", thresholdKey: "scoring.legendUltra" },
];

/**
 * Légende des tiers de rareté : carré emoji (celui du partage) → libellé → seuil.
 * Partagée par le popup d'explication du score et le « Comment jouer ».
 */
export function RarityLegend({ className }: { className?: string }) {
  const t = useT();
  return (
    <div className={cn("space-y-2", className)}>
      <p className="font-sans text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
        {t("scoring.legendTitle")}
      </p>
      <ul className="space-y-1.5">
        {LEGEND_TIERS.map(({ tier, thresholdKey }) => (
          <li key={tier} className="flex items-center gap-2.5">
            <span aria-hidden className="text-base leading-none">
              {SHARE_EMOJIS[tier]}
            </span>
            <span className="text-sm font-semibold text-on-surface">
              {t(`rarity.${tier}`)}
            </span>
            <span className="text-xs text-on-surface-variant">
              {t(thresholdKey)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
