import { usePostHog } from "@posthog/react";
import { useState } from "react";
import type { ConstraintId } from "@/features/game/logic/constraints";
import type { CellPosition, GameModeId } from "@/features/game/types";

export type SolutionDrawerTarget =
  | { kind: "cell"; cell: CellPosition }
  | { kind: "constraint"; constraintId: ConstraintId };

/**
 * État du Drawer de la grille solution — réponses d'une case **ou** pays
 * d'une contrainte entière (tap sur un en-tête), au plus une cible ouverte à
 * la fois. Porte les events `solution_cell_opened` et
 * `solution_constraint_opened`.
 */
export function useSolutionDrawer({
  gridDate,
  mode,
}: {
  gridDate: string;
  mode: GameModeId;
}) {
  const posthog = usePostHog();
  const [target, setTarget] = useState<SolutionDrawerTarget | null>(null);

  function openCell(cell: CellPosition, answerCount: number): void {
    posthog?.capture("solution_cell_opened", {
      grid_date: gridDate,
      mode,
      cell: `${cell.row},${cell.col}`,
      answer_count: answerCount,
    });
    setTarget({ kind: "cell", cell });
  }

  function openConstraint(
    constraintId: ConstraintId,
    answerCount: number,
  ): void {
    posthog?.capture("solution_constraint_opened", {
      grid_date: gridDate,
      mode,
      constraint_id: constraintId,
      answer_count: answerCount,
    });
    setTarget({ kind: "constraint", constraintId });
  }

  function close(): void {
    setTarget(null);
  }

  return { target, openCell, openConstraint, close };
}
