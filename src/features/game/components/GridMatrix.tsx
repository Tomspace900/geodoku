import type { GridIndex } from "@/features/game/logic/gridTopology";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const GRID_INDICES = [0, 1, 2] as const satisfies readonly GridIndex[];

type GridMatrixProps = {
  ariaLabel: string;
  rowLabels: ReadonlyArray<string>;
  colLabels: ReadonlyArray<string>;
  renderColumnHeader: (label: string, col: GridIndex) => ReactNode;
  renderRowHeader: (label: string, row: GridIndex) => ReactNode;
  renderCell: (position: {
    row: GridIndex;
    col: GridIndex;
    rowLabel: string;
    colLabel: string;
  }) => ReactNode;
  className?: string;
};

/**
 * Topologie et sémantique communes aux trois représentations de la grille.
 * Le contenu et le rendu visuel des cellules restent propres à chaque vue.
 */
export function GridMatrix({
  ariaLabel,
  rowLabels,
  colLabels,
  renderColumnHeader,
  renderRowHeader,
  renderCell,
  className,
}: GridMatrixProps) {
  return (
    <table
      aria-label={ariaLabel}
      className={cn(
        "w-full table-fixed border-separate border-spacing-1.5",
        className,
      )}
    >
      <thead>
        <tr>
          <th aria-hidden="true" className="p-0" />
          {GRID_INDICES.map((col) => (
            <th
              key={`col-${col}`}
              scope="col"
              className="rounded-xl bg-surface-low p-0 align-middle font-normal"
            >
              {renderColumnHeader(colLabels[col] ?? "", col)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {GRID_INDICES.map((row) => (
          <tr key={`row-${row}`}>
            <th
              scope="row"
              className="rounded-xl bg-surface-low p-0 align-middle font-normal"
            >
              {renderRowHeader(rowLabels[row] ?? "", row)}
            </th>
            {GRID_INDICES.map((col) => (
              <td key={`${row},${col}`} className="p-0">
                {renderCell({
                  row,
                  col,
                  rowLabel: rowLabels[row] ?? "",
                  colLabel: colLabels[col] ?? "",
                })}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
