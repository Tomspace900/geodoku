export const GRID_SIZE = 3;
export const GRID_CELL_COUNT = GRID_SIZE * GRID_SIZE;
export const STARTING_LIVES = 5;

export type GridIndex = 0 | 1 | 2;
export type CellPosition = { row: GridIndex; col: GridIndex };
export type CellKey = `${GridIndex},${GridIndex}`;

/** Topologie row-major commune au jeu, à Convex et aux scripts. */
export const CELL_KEYS = [
  "0,0",
  "0,1",
  "0,2",
  "1,0",
  "1,1",
  "1,2",
  "2,0",
  "2,1",
  "2,2",
] as const satisfies readonly CellKey[];

export function toCellKey(position: CellPosition): CellKey {
  return `${position.row},${position.col}`;
}

export function cellPosition(cellKey: CellKey): CellPosition {
  const [row, col] = cellKey.split(",").map(Number) as [GridIndex, GridIndex];
  return { row, col };
}
