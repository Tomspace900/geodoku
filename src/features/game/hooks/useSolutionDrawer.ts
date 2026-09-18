import { usePostHog } from "@posthog/react";
import { useState } from "react";
import type { ConstraintId } from "@/features/game/logic/constraints";
import type { CellPosition, GameModeId } from "@/features/game/types";

export type SolutionDrawerTarget =
  | { kind: "cell"; cell: CellPosition }
  | { kind: "constraint"; constraintId: ConstraintId };

export type SolutionDrawerView =
  | { kind: "list" }
  | { kind: "sheet"; iso3: string };

/**
 * État du Drawer de la grille solution — réponses d'une case **ou** pays
 * d'une contrainte entière (tap sur un en-tête), au plus une cible ouverte à
 * la fois, avec une pile liste → fiche partagée à l'intérieur. Un Drawer
 * rouvert repart toujours sur la liste. Porte les events
 * `solution_cell_opened`, `solution_constraint_opened` et
 * `country_sheet_opened` (`origin: "cell" | "constraint"`).
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
  const [view, setView] = useState<SolutionDrawerView>({ kind: "list" });

  function openCell(cell: CellPosition, answerCount: number): void {
    posthog?.capture("solution_cell_opened", {
      grid_date: gridDate,
      mode,
      cell: `${cell.row},${cell.col}`,
      answer_count: answerCount,
    });
    setView({ kind: "list" });
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
    setView({ kind: "list" });
    setTarget({ kind: "constraint", constraintId });
  }

  function close(): void {
    setTarget(null);
  }

  function openCountry(iso3: string): void {
    if (target) {
      posthog?.capture("country_sheet_opened", {
        grid_date: gridDate,
        mode,
        country_code: iso3,
        origin: target.kind,
        ...(target.kind === "cell"
          ? { cell: `${target.cell.row},${target.cell.col}` }
          : { constraint_id: target.constraintId }),
      });
    }
    setView({ kind: "sheet", iso3 });
  }

  function backToList(): void {
    setView({ kind: "list" });
  }

  return {
    target,
    view,
    openCell,
    openConstraint,
    close,
    openCountry,
    backToList,
  };
}
