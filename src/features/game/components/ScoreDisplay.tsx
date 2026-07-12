import { Eyebrow } from "@/components/editorial/Eyebrow";
import { useScoreAnimation } from "@/features/game/hooks/useScoreAnimation";
import { UI_ANIMATION_MS } from "@/features/game/logic/constants";
import { countAt } from "@/features/game/logic/scoreAnimation";
import {
  type ScoreBreakdown,
  averageRarityTier,
  computeScore,
} from "@/features/game/logic/scoreVariant";
import type { RarityTier } from "@/features/game/types";
import { useT } from "@/i18n/LocaleContext";
import { cn } from "@/lib/utils";
import { Heart } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ScoreInfoDialog } from "./ScoreInfoDialog";

// Score de fin : anneau central = grille (cases) ; couronne en 2 arcs, rareté
// (couleur du tier moyen) puis vies (rouge, comme les cœurs de vie). La
// révélation est animée par `useScoreAnimation` : le total central grimpe en
// 3 tranches (grille → rareté → vies), chaque arc se dessinant avec la sienne,
// avec un sursaut final. Un arc n'est tracé que si sa longueur dessinée dépasse
// le seuil `> 0.5` (une longueur ~nulle rendrait un point, strokeLinecap="round").
// Vies à 0 : ni arc, ni « +0 » dans la légende.

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
  const { gridMax, gridValue, rarityMax, rarityValue, livesMax, livesValue } =
    computeScore(breakdown);
  const ready = breakdown.shares !== null;
  const tier = ready ? averageRarityTier(breakdown.shares ?? []) : null;
  // Rareté provisoire (données du jour encore minces) : on l'indique.
  const estimated = ready && breakdown.estimated;

  // Révélation animée : le total central grimpe en 3 tranches (grille → rareté
  // → vies), chaque arc se dessinant avec sa tranche. `finalTotal` (figé) sert
  // l'aria-label ; le nombre visible qui tique reste hors lecteur d'écran.
  const {
    displayTotal,
    gridProgress,
    rarityProgress,
    livesProgress,
    finalTotal,
    done,
  } = useScoreAnimation({ gridValue, rarityValue, livesValue, ready });

  // Sursaut final du score, calqué sur le rebond du drapeau à la pose (Cell.tsx).
  const [scoreBounce, setScoreBounce] = useState(false);
  const bouncedRef = useRef(false);
  useEffect(() => {
    if (!done || bouncedRef.current) return;
    bouncedRef.current = true;
    setScoreBounce(true);
    const timer = setTimeout(
      () => setScoreBounce(false),
      UI_ANIMATION_MS.flagBounce,
    );
    return () => clearTimeout(timer);
  }, [done]);

  const gridFrac = Math.min(1, gridValue / gridMax);
  // Rareté et vies se partagent la couronne : chacune occupe sa part de l'échelle bonus.
  const bonusScale = rarityMax + livesMax;
  const rarityShare = (rarityValue ?? 0) / bonusScale;
  const livesShare = livesValue / bonusScale;

  const tierStroke = tier
    ? RARITY_STROKE[tier]
    : "stroke-on-surface-variant/20";
  const tierText = tier ? RARITY_TEXT[tier] : "text-on-surface-variant/40";
  const tierDot = tier ? RARITY_BG[tier] : "bg-on-surface-variant/30";

  // Chiffres de la légende, comptés en synchro avec leur tranche.
  const shownGrid = countAt(0, gridValue, gridProgress);
  const shownLives = countAt(0, livesValue, livesProgress);
  const shownRarity =
    rarityValue === null ? null : countAt(0, rarityValue, rarityProgress);
  // Total net : grille + vies sont exacts. Seule la rareté est provisoire, donc
  // le marqueur « ≈ » ne porte que sur son chiffre, pas sur le total.
  const rarityNum =
    shownRarity === null ? "…" : `${estimated ? "≈" : ""}+${shownRarity}`;
  const ariaTotal = finalTotal === null ? "…" : `${finalTotal}`;

  const gridPerimeter = 2 * Math.PI * R_GRID; // Périmètre du cercle de la grille
  const bonusPerimeter = 2 * Math.PI * R_BONUS; // Périmètre du cercle de la couronne
  const rarityLength = rarityShare * bonusPerimeter; // Longueur totale de l'arc rareté
  const livesLength = livesShare * bonusPerimeter; // Longueur totale de l'arc vies

  // Longueurs réellement dessinées à cette frame (pilotées par la progression).
  // Garde `> 0.5` : un arc de longueur ~nulle rendrait un point (strokeLinecap="round").
  const gridDrawn = gridPerimeter * gridFrac * gridProgress;
  const rarityDrawn = rarityLength * rarityProgress;
  const livesDrawn = livesLength * livesProgress;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-40 w-40">
        <svg
          className="h-40 w-40 -rotate-90"
          viewBox="0 0 128 128"
          role="img"
          aria-label={`${ariaTotal} ${t("scoring.points")}`}
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
          {rarityDrawn > 0.5 && (
            <circle
              cx="64"
              cy="64"
              r={R_BONUS}
              fill="none"
              strokeWidth="5"
              strokeLinecap="round"
              className={tierStroke}
              strokeDasharray={`${rarityDrawn} ${bonusPerimeter}`}
            />
          )}
          {livesDrawn > 0.5 && (
            <circle
              cx="64"
              cy="64"
              r={R_BONUS}
              fill="none"
              strokeWidth="5"
              strokeLinecap="round"
              className="stroke-rarity-ultra"
              strokeDasharray={`${livesDrawn} ${bonusPerimeter}`}
              strokeDashoffset={-(rarityLength + ARC_GAP)}
            />
          )}
          {/* Anneau grille : plein à 9 cases. */}
          <circle
            cx="64"
            cy="64"
            r={R_GRID}
            fill="none"
            strokeWidth="11"
            className="stroke-surface-low"
          />
          {gridDrawn > 0.5 && (
            <circle
              cx="64"
              cy="64"
              r={R_GRID}
              fill="none"
              strokeWidth="11"
              strokeLinecap="round"
              className="stroke-brand"
              strokeDasharray={gridPerimeter}
              strokeDashoffset={gridPerimeter - gridDrawn}
            />
          )}
        </svg>
        <div
          className="absolute inset-0 flex flex-col items-center justify-center leading-none"
          aria-hidden
        >
          <span
            className={cn(
              "inline-block origin-center font-serif text-4xl font-medium tracking-tight text-brand tabular-nums",
              scoreBounce && "animate-flag-bounce",
            )}
          >
            {displayTotal}
          </span>
          <span className="font-sans text-xs font-medium text-on-surface-variant">
            {t("scoring.points")}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Eyebrow as="div" className="flex items-center gap-2.5 normal-case">
          <span
            className={cn(
              "flex items-center gap-1.5 transition-opacity duration-300",
              gridProgress > 0 ? "opacity-100" : "opacity-40",
            )}
          >
            <span className="h-2 w-2 rounded-full bg-brand" aria-hidden />
            {`${t("scoring.grid")} ${shownGrid}`}
          </span>
          <span
            className={cn(
              "flex items-center gap-1.5 transition-opacity duration-300",
              rarityProgress > 0 ? "opacity-100" : "opacity-40",
            )}
          >
            <span className={cn("h-2 w-2 rounded-full", tierDot)} aria-hidden />
            <span className={cn(tierText, "font-semibold")}>
              {`${rarityNum} ${t("scoring.rarity")}`}
            </span>
          </span>
          {livesValue > 0 && (
            <span
              className={cn(
                "flex items-center gap-1 transition-opacity duration-300",
                livesProgress > 0 ? "opacity-100" : "opacity-40",
              )}
            >
              <Heart
                size={12}
                className="text-rarity-ultra fill-rarity-ultra"
                aria-hidden
              />
              {`+${shownLives}`}
            </span>
          )}
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
