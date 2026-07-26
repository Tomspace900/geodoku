import { CONSTRAINT_BY_ID } from "@/features/game/logic/constraints";
import { filledCellTier } from "@/features/game/logic/rarity";
import type {
  CellGuessDistribution,
  CellKey,
  CellPosition,
  GameState,
} from "@/features/game/types";
import { useT } from "@/i18n/LocaleContext";
import { cn } from "@/lib/utils";
import { CellComponent } from "./Cell";
import { GridMatrix } from "./GridMatrix";

type Props = {
  state: GameState;
  distribution: Record<string, CellGuessDistribution> | undefined;
  onCellClick: (cell: CellPosition) => void;
};

const headerClass =
  "flex items-center justify-center text-center text-[10px] font-medium text-on-surface-variant bg-surface-low rounded-xl p-2 leading-tight min-h-[52px]";

export function GameGrid({ state, distribution, onCellClick }: Props) {
  const t = useT();
  const isPlaying = state.status === "playing";
  const rowLabels = state.rows.map((constraintId) => {
    const constraint = CONSTRAINT_BY_ID.get(constraintId);
    return constraint ? t(constraint.labelKey) : constraintId;
  });
  const colLabels = state.cols.map((constraintId) => {
    const constraint = CONSTRAINT_BY_ID.get(constraintId);
    return constraint ? t(constraint.labelKey) : constraintId;
  });

  return (
    <GridMatrix
      ariaLabel={t(
        state.mode === "training"
          ? "training.gridAriaLabel"
          : "ui.gameGridAriaLabel",
      )}
      rowLabels={rowLabels}
      colLabels={colLabels}
      renderColumnHeader={(label) => (
        <div className={cn(headerClass, "p-1.5")}>{label}</div>
      )}
      renderRowHeader={(label) => (
        <div className={cn(headerClass, "p-1.5")}>{label}</div>
      )}
      renderCell={({ row, col, rowLabel, colLabel }) => {
        const key = `${row},${col}` as CellKey;
        const cell = state.cells[key];
        const isPlayable = isPlaying && cell.status === "empty";
        const tier =
          cell.status === "filled"
            ? filledCellTier(cell.countryCode, distribution?.[key])
            : null;
        return (
          <CellComponent
            cell={cell}
            position={{ row, col }}
            rowLabel={rowLabel}
            colLabel={colLabel}
            isDisabled={!isPlayable}
            tier={tier}
            onClick={() => {
              if (isPlayable) onCellClick({ row, col });
            }}
          />
        );
      }}
    />
  );
}
