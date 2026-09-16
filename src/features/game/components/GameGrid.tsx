import {
  CONSTRAINT_BY_ID,
  type ConstraintId,
} from "@/features/game/logic/constraints";
import { filledCellTier, isCohortComplete } from "@/features/game/logic/rarity";
import type {
  CellGuessDistribution,
  CellKey,
  CellPosition,
  GameState,
} from "@/features/game/types";
import { useT } from "@/i18n/LocaleContext";
import { CellComponent } from "./Cell";
import { ConstraintHeaderButton } from "./ConstraintHeaderButton";
import { GridMatrix } from "./GridMatrix";

type Props = {
  state: GameState;
  distribution: Record<string, CellGuessDistribution> | undefined;
  onCellClick: (cell: CellPosition) => void;
  onHeaderClick: (constraintId: ConstraintId) => void;
};

export function GameGrid({
  state,
  distribution,
  onCellClick,
  onHeaderClick,
}: Props) {
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
      renderColumnHeader={(label, col) => (
        <ConstraintHeaderButton
          label={label}
          onClick={() => onHeaderClick(state.cols[col])}
        />
      )}
      renderRowHeader={(label, row) => (
        <ConstraintHeaderButton
          label={label}
          onClick={() => onHeaderClick(state.rows[row])}
        />
      )}
      renderCell={({ row, col, rowLabel, colLabel }) => {
        const key = `${row},${col}` as CellKey;
        const cell = state.cells[key];
        const isPlayable = isPlaying && cell.status === "empty";
        const tier =
          cell.status === "filled"
            ? filledCellTier(
                cell.countryCode,
                distribution?.[key],
                isCohortComplete(state.mode),
              )
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
