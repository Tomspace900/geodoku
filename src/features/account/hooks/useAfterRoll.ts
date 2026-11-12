import { useEffect, useRef } from "react";
import { UI_ANIMATION_MS } from "@/features/game/logic/constants";
import { prefersReducedMotion } from "@/lib/motion";

/**
 * Laisse le dé finir son tour (`animate-dice-roll`) avant d'agir quand l'écran
 * change aussitôt (tiroir qui se ferme, retour à « Mon compte ») : sinon on ne
 * le verrait pas tourner. Immédiat sous reduced motion ; rien ne survit au
 * démontage.
 */
export function useAfterRoll() {
  const timer = useRef<number | null>(null);

  function cancel() {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  }

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  function after(action: () => void) {
    cancel();
    timer.current = window.setTimeout(
      action,
      prefersReducedMotion() ? 0 : UI_ANIMATION_MS.diceRoll,
    );
  }

  return { after, cancel };
}
