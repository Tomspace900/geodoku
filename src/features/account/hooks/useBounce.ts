import { useEffect, useRef, useState } from "react";
import { UI_ANIMATION_MS } from "@/features/game/logic/constants";

/**
 * Le rebond des drapeaux de la grille (`animate-flag-bounce`), joué quand
 * `trigger` change, jamais au montage. Coupé sous reduced motion par le CSS.
 */
export function useBounce(trigger: unknown): boolean {
  const [bouncing, setBouncing] = useState(false);
  const previous = useRef(trigger);

  useEffect(() => {
    if (Object.is(previous.current, trigger)) return;
    previous.current = trigger;
    setBouncing(true);
    const timer = window.setTimeout(
      () => setBouncing(false),
      UI_ANIMATION_MS.flagBounce,
    );
    return () => window.clearTimeout(timer);
  }, [trigger]);

  return bouncing;
}
