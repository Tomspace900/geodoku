import { useEffect, useRef, useState } from "react";
import { UI_ANIMATION_MS } from "@/features/game/logic/constants";

export type Bounce = {
  bouncing: boolean;
  /** Clé de l'élément animé : elle change à chaque rebond et le relance. */
  key: number;
};

/**
 * Un rebond (`animate-flag-bounce`, `animate-name-bounce`) chaque fois que
 * `trigger` change, jamais au montage : un drapeau ou un nom qui réapparaît
 * ne rebondit pas. Deux changements de suite relancent l'animation (`key`).
 * Coupé sous reduced motion par le CSS.
 */
export function useBounce(trigger: unknown): Bounce {
  const [bounce, setBounce] = useState<Bounce>({ bouncing: false, key: 0 });
  const previous = useRef(trigger);

  useEffect(() => {
    if (Object.is(previous.current, trigger)) return;
    previous.current = trigger;
    setBounce((current) => ({ bouncing: true, key: current.key + 1 }));
    const timer = window.setTimeout(
      () => setBounce((current) => ({ ...current, bouncing: false })),
      UI_ANIMATION_MS.flagBounce,
    );
    return () => window.clearTimeout(timer);
  }, [trigger]);

  return bounce;
}
