import type { RarityTier } from "@/features/game/types";
import { useT } from "@/i18n/LocaleContext";
import type { TKey } from "@/i18n/types";
import { cn } from "@/lib/utils";
import { RarityBadge } from "./RarityBadge";

export type RarityLegendVariant = "share" | "points";

// Ordonné du plus commun au plus rare (comme la progression des carrés de partage).
const LEGEND_TIERS: Record<
  RarityLegendVariant,
  { tier: RarityTier; thresholdKey: TKey }[]
> = {
  share: [
    { tier: "common", thresholdKey: "scoring.legendCommon" },
    { tier: "uncommon", thresholdKey: "scoring.legendUncommon" },
    { tier: "rare", thresholdKey: "scoring.legendRare" },
    { tier: "ultra", thresholdKey: "scoring.legendUltra" },
  ],
  points: [
    { tier: "common", thresholdKey: "scoring.legendPointsCommon" },
    { tier: "uncommon", thresholdKey: "scoring.legendPointsUncommon" },
    { tier: "rare", thresholdKey: "scoring.legendPointsRare" },
    { tier: "ultra", thresholdKey: "scoring.legendPointsUltra" },
  ],
};

type RarityLegendProps = {
  className?: string;
  /** `share` = part des joueurs ; `points` = bonus de rareté par case (max 50). */
  variant?: RarityLegendVariant;
};

/**
 * Légende des tiers de rareté : pastille `RarityBadge` + seuil (part des joueurs
 * ou points gagnés). Partagée par le popup « Calcul du score » et le « Comment jouer ».
 */
export function RarityLegend({
  className,
  variant = "share",
}: RarityLegendProps) {
  const t = useT();
  return (
    <div className={cn("space-y-2", className)}>
      <ul className="space-y-1.5">
        {LEGEND_TIERS[variant].map(({ tier, thresholdKey }) => (
          <li key={tier} className="flex items-center gap-3">
            <span className="flex w-24 shrink-0">
              <RarityBadge tier={tier} />
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
