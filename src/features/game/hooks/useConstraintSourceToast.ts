import { usePostHog } from "@posthog/react";
import { useEffect, useRef, useState } from "react";
import { CONSTRAINT_SOURCE_TOAST_MS } from "@/features/game/logic/constants";
import type { ConstraintId } from "@/features/game/logic/constraints";
import type { CellPosition, GameModeId } from "@/features/game/types";

export type ConstraintSourceToastTarget = Readonly<{
  constraintId: ConstraintId;
}>;

type Params = {
  gridDate: string;
  mode: GameModeId;
  selectedCell: CellPosition | null;
};

/**
 * État du toast de source d'une contrainte, **en jeu uniquement** : sur la
 * grille solution, l'en-tête ouvre le Drawer de contrainte à la place (lot 2)
 * — ce hook n'y est plus câblé. Au plus un toast affiché à la fois. Taper
 * l'en-tête déjà affiché ferme le toast ; taper un autre en-tête le remplace
 * et relance le minuteur. Le minuteur se suspend au survol et au focus
 * interne (`pause`/`resume`). `onHeaderClick` porte l'event PostHog
 * `constraint_source_viewed` (`surface: "playing"`, conservé pour ne pas
 * casser les groupements existants bien qu'il ne prenne plus qu'une seule
 * valeur) ; l'ouverture de la modale de saisie (`selectedCell`) ferme le
 * toast.
 */
export function useConstraintSourceToast({
  gridDate,
  mode,
  selectedCell,
}: Params) {
  const posthog = usePostHog();
  const [active, setActive] = useState<ConstraintSourceToastTarget | null>(
    null,
  );
  const timerRef = useRef<number | null>(null);
  const pausedRef = useRef(false);

  function clearTimer() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function scheduleClose() {
    clearTimer();
    if (pausedRef.current) return;
    timerRef.current = window.setTimeout(() => {
      setActive(null);
    }, CONSTRAINT_SOURCE_TOAST_MS);
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: relance le minuteur à chaque changement de cible, pas à chaque rendu
  useEffect(() => {
    if (active) scheduleClose();
    return clearTimer;
  }, [active]);

  function close(): void {
    pausedRef.current = false;
    setActive(null);
  }

  // Ouvrir la modale de saisie ferme le toast de source, pour ne jamais superposer les deux.
  // biome-ignore lint/correctness/useExhaustiveDependencies: close est stable pour la durée du montage
  useEffect(() => {
    if (selectedCell !== null) close();
  }, [selectedCell]);

  function onHeaderClick(constraintId: ConstraintId): void {
    pausedRef.current = false;
    if (active?.constraintId === constraintId) {
      setActive(null);
      return;
    }
    posthog?.capture("constraint_source_viewed", {
      grid_date: gridDate,
      mode,
      surface: "playing",
      constraint_id: constraintId,
    });
    setActive({ constraintId });
  }

  function pause(): void {
    pausedRef.current = true;
    clearTimer();
  }

  function resume(): void {
    pausedRef.current = false;
    if (active) scheduleClose();
  }

  return { active, onHeaderClick, close, pause, resume };
}
