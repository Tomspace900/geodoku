import { CONSTRAINTS } from "@/features/game/logic/constraints";
import type { CellKey, CellPosition, GameState } from "@/features/game/types";
import { cn } from "@/lib/utils";
import { CellComponent } from "./Cell";

const CONSTRAINT_MAP = new Map(CONSTRAINTS.map((c) => [c.id, c]));

type Props = {
  state: GameState;
  onCellClick: (cell: CellPosition) => void;
};

const ROWS = [0, 1, 2] as const;
const COLS = [0, 1, 2] as const;

const headerClass =
  "flex items-center justify-center text-center text-[10px] font-medium text-on-surface-variant bg-surface-low rounded-xl p-2 leading-tight min-h-[52px]";

export function GameGrid({ state, onCellClick }: Props) {
  const isPlaying = state.status === "playing";

  return (
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: "minmax(0,1fr) repeat(3, minmax(0,1fr))" }}
    >
      {/* Corner spacer */}
      <div />

      {/* Column headers */}
      {COLS.map((col) => {
        const label =
          CONSTRAINT_MAP.get(state.cols[col])?.label ?? state.cols[col];
        return (
          <div key={`col-${col}`} className={cn(headerClass, "p-1.5")}>
            {label}
          </div>
        );
      })}

      {/* Rows */}
      {ROWS.map((row) => {
        const rowLabel =
          CONSTRAINT_MAP.get(state.rows[row])?.label ?? state.rows[row];
        return [
          /* Row header */
          <div key={`row-${row}`} className={cn(headerClass, "p-1.5")}>
            {rowLabel}
          </div>,

          /* Cells */
          ...COLS.map((col) => {
            const key = `${row},${col}` as CellKey;
            const cell = state.cells[key];
            const isFilled = cell.status === "filled";
            return (
              <CellComponent
                key={key}
                cell={cell}
                position={{ row, col }}
                isDisabled={!isPlaying || isFilled}
                onClick={() => {
                  if (isPlaying && !isFilled) onCellClick({ row, col });
                }}
              />
            );
          }),
        ];
      })}
    </div>
  );
}
