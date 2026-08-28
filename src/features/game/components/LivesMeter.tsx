import { Heart, X } from "lucide-react";
import type { LivesState } from "@/features/game/types";
import { useT } from "@/i18n/LocaleContext";
import { STARTING_LIVES } from "../logic/constants";

type Props = {
  lives: LivesState;
};

/**
 * Compteur d'en-tête. Deux régimes, un seul emplacement : la grille du jour
 * montre ses cœurs, l'entraînement montre le nombre d'essais ratés (essais
 * illimités → aucune vie à décompter).
 */
export function LivesMeter({ lives }: Props) {
  const t = useT();

  if (lives.kind === "unlimited") {
    return (
      <div>
        <output aria-live="polite" aria-atomic="true" className="sr-only">
          {`${t("training.attempts", {
            count: lives.failedAttempts,
          })} · ${t("training.unlimitedLives")}`}
        </output>
        {/* Essais ratés à gauche, vies à droite — les vies gardent la place
            qu'elles occupent sur la grille du jour. Le cœur ∞ dit d'emblée
            qu'aucune ne se perd ici : le compteur de croix n'est qu'une mesure,
            pas un décompte. */}
        <span className="flex items-center gap-2.5" aria-hidden="true">
          <span className="flex items-center gap-1">
            <span className="text-sm font-semibold tabular-nums text-on-surface">
              {lives.failedAttempts}
            </span>
            <X size={18} className="text-error" />
          </span>
          <span className="flex items-center gap-1">
            <span className="text-base font-semibold leading-none text-on-surface">
              ∞
            </span>
            <Heart size={18} className="text-error fill-error" />
          </span>
        </span>
      </div>
    );
  }

  return (
    <div>
      <output aria-live="polite" aria-atomic="true" className="sr-only">
        {t("ui.remainingLives", { count: lives.remaining })}
      </output>
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: STARTING_LIVES }, (_, i) => {
          const index = STARTING_LIVES - 1 - i;
          return (
            <Heart
              key={`heart-${index + 1}`}
              size={18}
              className={
                index < lives.remaining
                  ? "text-error fill-error"
                  : "text-on-surface-variant"
              }
            />
          );
        })}
      </span>
    </div>
  );
}
