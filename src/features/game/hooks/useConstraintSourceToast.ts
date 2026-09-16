import { useEffect, useRef, useState } from "react";
import { CONSTRAINT_SOURCE_TOAST_MS } from "@/features/game/logic/constants";
import type { ConstraintId } from "@/features/game/logic/constraints";

export type ConstraintSourceSurface = "playing" | "solution";

export type ConstraintSourceToastTarget = Readonly<{
  constraintId: ConstraintId;
  surface: ConstraintSourceSurface;
}>;

/**
 * État du toast de source d'une contrainte : au plus un affiché à la fois.
 * Taper l'en-tête déjà affiché ferme le toast ; taper un autre en-tête le
 * remplace et relance le minuteur. Le minuteur se suspend au survol et au
 * focus interne (`pause`/`resume`).
 */
export function useConstraintSourceToast() {
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

  function open(
    constraintId: ConstraintId,
    surface: ConstraintSourceSurface,
  ): void {
    if (active?.constraintId === constraintId && active.surface === surface) {
      setActive(null);
      return;
    }
    setActive({ constraintId, surface });
  }

  function close(): void {
    setActive(null);
  }

  function pause(): void {
    pausedRef.current = true;
    clearTimer();
  }

  function resume(): void {
    pausedRef.current = false;
    if (active) scheduleClose();
  }

  return { active, open, close, pause, resume };
}
