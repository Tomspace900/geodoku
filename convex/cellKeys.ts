/** Clés des 9 cases de la grille 3×3, en row-major. */
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
] as const;

export type CellKey = (typeof CELL_KEYS)[number];
