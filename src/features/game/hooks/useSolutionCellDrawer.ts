import { usePostHog } from "@posthog/react";
import { useState } from "react";
import type { CellPosition, GameModeId } from "@/features/game/types";

export type SolutionCellDrawerView =
  | { kind: "list" }
  | { kind: "sheet"; iso3: string };

/**
 * État du Drawer des réponses d'une case solution, partagé par `GamePage` et
 * `TrainingPage` (même patron que `useConstraintSourceToast`) : au plus une
 * case ouverte, une pile liste → fiche à l'intérieur. Un Drawer rouvert
 * repart toujours sur la liste. Porte les events `solution_cell_opened` et
 * `country_sheet_opened`.
 */
export function useSolutionCellDrawer({
  gridDate,
  mode,
}: {
  gridDate: string;
  mode: GameModeId;
}) {
  const posthog = usePostHog();
  const [openCell, setOpenCell] = useState<CellPosition | null>(null);
  const [view, setView] = useState<SolutionCellDrawerView>({ kind: "list" });

  function openCellDrawer(cell: CellPosition, answerCount: number): void {
    posthog?.capture("solution_cell_opened", {
      grid_date: gridDate,
      mode,
      cell: `${cell.row},${cell.col}`,
      answer_count: answerCount,
    });
    setView({ kind: "list" });
    setOpenCell(cell);
  }

  function close(): void {
    setOpenCell(null);
  }

  function openCountry(iso3: string): void {
    if (openCell) {
      posthog?.capture("country_sheet_opened", {
        grid_date: gridDate,
        mode,
        cell: `${openCell.row},${openCell.col}`,
        country_code: iso3,
      });
    }
    setView({ kind: "sheet", iso3 });
  }

  function backToList(): void {
    setView({ kind: "list" });
  }

  return { openCell, view, openCellDrawer, close, openCountry, backToList };
}
