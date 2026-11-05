import { usePostHog } from "@posthog/react";
import { useState } from "react";
import type { GameModeId } from "@/features/game/types";

/** Calques de la grille solution (#70), dans l'ordre du cycle. */
export const SOLUTION_LAYERS = [
  "answers",
  "errors",
  "best",
  "choices",
] as const;
export type SolutionLayer = (typeof SOLUTION_LAYERS)[number];

/**
 * Calque affiché par la grille solution. Le coin haut-gauche passe au suivant,
 * en boucle, sans menu : `next` est son seul geste.
 */
export function useSolutionLayer({
  gridDate,
  mode,
}: {
  gridDate: string;
  mode: GameModeId;
}) {
  const posthog = usePostHog();
  const [layer, setLayer] = useState<SolutionLayer>("answers");

  function next(): void {
    const following =
      SOLUTION_LAYERS[
        (SOLUTION_LAYERS.indexOf(layer) + 1) % SOLUTION_LAYERS.length
      ];
    posthog?.capture("solution_layer_changed", {
      grid_date: gridDate,
      mode,
      layer: following,
    });
    setLayer(following);
  }

  return { layer, next };
}
