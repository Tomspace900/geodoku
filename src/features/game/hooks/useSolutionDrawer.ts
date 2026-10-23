import { usePostHog } from "@posthog/react";
import { useEffect, useRef, useState } from "react";
import {
  type ConstraintId,
  constraintAnswers,
} from "@/features/game/logic/constraints";
import type { CellPosition, GameModeId } from "@/features/game/types";

export type SolutionDrawerTarget =
  | { kind: "cell"; cell: CellPosition }
  | { kind: "constraint"; constraintId: ConstraintId };

type SolutionVisit = {
  startedAt: number;
  cellsOpened: number;
  constraintsOpened: number;
};

function startVisit(): SolutionVisit {
  return { startedAt: performance.now(), cellsOpened: 0, constraintsOpened: 0 };
}

/**
 * État du Drawer de la grille solution — réponses d'une case **ou** pays
 * d'une contrainte entière (tap sur un en-tête), au plus une cible ouverte à
 * la fois. Porte les events `solution_cell_opened` et
 * `solution_constraint_opened`.
 *
 * Mesure aussi chaque visite de la grille solution (`visible`), émise en
 * `solution_screen_left` quand le joueur la quitte : retour au résultat,
 * navigation, ou onglet masqué. Un onglet masqué clôt la visite, et le retour
 * en ouvre une nouvelle : sur mobile, on ferme rarement l'onglet, on passe à
 * une autre app, et l'event n'aurait sinon jamais l'occasion de partir.
 */
export function useSolutionDrawer({
  gridDate,
  mode,
  visible,
}: {
  gridDate: string;
  mode: GameModeId;
  visible: boolean;
}) {
  const posthog = usePostHog();
  const [target, setTarget] = useState<SolutionDrawerTarget | null>(null);
  const visitRef = useRef<SolutionVisit | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: posthog is a stable ref
  useEffect(() => {
    if (!visible) return;
    visitRef.current = startVisit();

    function leave(reason: "hidden" | "left") {
      const visit = visitRef.current;
      if (!visit) return;
      visitRef.current = null;
      posthog?.capture(
        "solution_screen_left",
        {
          grid_date: gridDate,
          mode,
          leave_reason: reason,
          duration_ms: Math.round(performance.now() - visit.startedAt),
          cells_opened: visit.cellsOpened,
          constraints_opened: visit.constraintsOpened,
        },
        // La page peut se fermer juste après : la balise survit au déchargement.
        { transport: "sendBeacon" },
      );
    }

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") leave("hidden");
      else if (!visitRef.current) visitRef.current = startVisit();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      leave("left");
    };
  }, [visible, gridDate, mode]);

  function openCell(cell: CellPosition, answerCount: number): void {
    posthog?.capture("solution_cell_opened", {
      grid_date: gridDate,
      mode,
      cell: `${cell.row},${cell.col}`,
      answer_count: answerCount,
    });
    if (visitRef.current) visitRef.current.cellsOpened += 1;
    setTarget({ kind: "cell", cell });
  }

  function openConstraint(constraintId: ConstraintId): void {
    posthog?.capture("solution_constraint_opened", {
      grid_date: gridDate,
      mode,
      constraint_id: constraintId,
      answer_count: constraintAnswers(constraintId).size,
    });
    if (visitRef.current) visitRef.current.constraintsOpened += 1;
    setTarget({ kind: "constraint", constraintId });
  }

  function close(): void {
    setTarget(null);
  }

  return { target, openCell, openConstraint, close };
}
