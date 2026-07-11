import { Eyebrow } from "@/components/editorial/Eyebrow";
import {
  type ScoreBreakdown,
  averageRarityTier,
  computeScore,
} from "@/features/game/logic/scoreVariant";
import type { RarityTier } from "@/features/game/types";
import { useT } from "@/i18n/LocaleContext";
import { cn } from "@/lib/utils";
import { Heart } from "lucide-react";
import { ScoreInfoDialog } from "./ScoreInfoDialog";

// Score de fin : anneau central = grille (cases) ; couronne en 2 arcs — rareté
// (couleur du tier moyen) puis vies (gris neutre, pour ne pas heurter le tier ultra).

const RARITY_TEXT: Record<RarityTier, string> = {
  common: "text-rarity-common",
  uncommon: "text-rarity-uncommon",
  rare: "text-rarity-rare",
  ultra: "text-rarity-ultra",
};
const RARITY_BG: Record<RarityTier, string> = {
  common: "bg-rarity-common",
  uncommon: "bg-rarity-uncommon",
  rare: "bg-rarity-rare",
  ultra: "bg-rarity-ultra",
};
const RARITY_STROKE: Record<RarityTier, string> = {
  common: "stroke-rarity-common",
  uncommon: "stroke-rarity-uncommon",
  rare: "stroke-rarity-rare",
  ultra: "stroke-rarity-ultra",
};

type Props = {
  breakdown: ScoreBreakdown;
};

const R_GRID = 46;
const R_BONUS = 58;
/** Écart entre l'arc rareté et l'arc vies, en unités de tracé. */
const ARC_GAP = 6;

export function ScoreDisplay({ breakdown }: Props) {
  const t = useT();
  const r = computeScore(breakdown);
  const ready = breakdown.shares !== null;
  const tier = ready ? averageRarityTier(breakdown.shares ?? []) : null;
  // Rareté provisoire (données du jour encore minces) : on l'indique.
  const estimated = ready && breakdown.estimated;

  const gridFrac = Math.min(1, r.gridValue / r.gridMax);
  // Rareté et vies se partagent la couronne : chacune occupe sa part de l'échelle bonus.
  const bonusScale = r.rarityMax + r.livesMax;
  const rarityShare = (r.rarityValue ?? 0) / bonusScale;
  const livesShare = r.livesValue / bonusScale;

  // Total net : grille + vies sont exacts. Seule la rareté est provisoire, donc
  // le marqueur « ≈ » ne porte que sur son chiffre, pas sur le total.
  const heroNum = r.total === null ? "…" : `${r.total}`;
  const tierStroke = tier
    ? RARITY_STROKE[tier]
    : "stroke-on-surface-variant/20";
  const tierText = tier ? RARITY_TEXT[tier] : "text-on-surface-variant/40";
  const tierDot = tier ? RARITY_BG[tier] : "bg-on-surface-variant/30";
  const rarityNum =
    r.rarityValue === null ? "…" : `${estimated ? "≈" : ""}+${r.rarityValue}`;

  const cGrid = 2 * Math.PI * R_GRID;
  const cBonus = 2 * Math.PI * R_BONUS;
  const rarityLen = rarityShare * cBonus;
  const livesLen = livesShare * cBonus;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-40 w-40">
        <svg
          className="h-40 w-40 -rotate-90"
          viewBox="0 0 128 128"
          role="img"
          aria-label={`${heroNum} ${t("scoring.points")}`}
        >
          {/* Couronne : piste + arc rareté + arc vies. */}
          <circle
            cx="64"
            cy="64"
            r={R_BONUS}
            fill="none"
            strokeWidth="5"
            className="stroke-surface-low"
          />
          <circle
            cx="64"
            cy="64"
            r={R_BONUS}
            fill="none"
            strokeWidth="5"
            strokeLinecap="round"
            className={tierStroke}
            strokeDasharray={`${rarityLen} ${cBonus}`}
          />
          <circle
            cx="64"
            cy="64"
            r={R_BONUS}
            fill="none"
            strokeWidth="5"
            strokeLinecap="round"
            className="stroke-on-surface-variant"
            strokeDasharray={`${livesLen} ${cBonus}`}
            strokeDashoffset={-(rarityLen + ARC_GAP)}
          />
          {/* Anneau grille : plein à 9 cases. */}
          <circle
            cx="64"
            cy="64"
            r={R_GRID}
            fill="none"
            strokeWidth="11"
            className="stroke-surface-low"
          />
          <circle
            cx="64"
            cy="64"
            r={R_GRID}
            fill="none"
            strokeWidth="11"
            strokeLinecap="round"
            className="stroke-brand"
            strokeDasharray={cGrid}
            strokeDashoffset={cGrid * (1 - gridFrac)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span className="font-serif text-4xl font-medium tracking-tight text-brand">
            {heroNum}
          </span>
          <span className="mt-1 font-sans text-xs font-medium text-on-surface-variant">
            {t("scoring.points")}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Eyebrow as="div" className="flex items-center gap-2.5 normal-case">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-brand" aria-hidden />
            {`${t("scoring.grid")} ${r.gridValue}`}
          </span>
          <span className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", tierDot)} aria-hidden />
            <span className={cn(tierText, "font-semibold")}>
              {`${rarityNum} ${t("scoring.rarity")}`}
            </span>
          </span>
          <span className="flex items-center gap-1">
            <Heart
              size={12}
              className="text-rarity-ultra fill-rarity-ultra"
              aria-hidden
            />
            {`+${r.livesValue}`}
          </span>
        </Eyebrow>
        <ScoreInfoDialog />
      </div>

      {estimated && (
        <p className="text-center text-xs italic text-on-surface-variant">
          {t("scoring.estimated")}
        </p>
      )}
    </div>
  );
}
