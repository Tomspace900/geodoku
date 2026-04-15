import type { ConstraintId } from "./logic/constraints";

export type CellPosition = { row: 0 | 1 | 2; col: 0 | 1 | 2 };
export type CellKey = `${0 | 1 | 2},${0 | 1 | 2}`;

export type RarityTier = "common" | "uncommon" | "rare" | "ultra";

export type FilledCell = {
  status: "filled";
  countryCode: string;
  rarity: number; // 0..1
  rarityTier: RarityTier;
};

export type EmptyCell = { status: "empty" };
export type Cell = FilledCell | EmptyCell;

export type GameStatus = "playing" | "won" | "lost";

export type GameState = {
  date: string;
  rows: ConstraintId[];
  cols: ConstraintId[];
  cells: Record<CellKey, Cell>;
  remainingLives: number;
  selectedCell: CellPosition | null;
  usedCountries: Set<string>;
  status: GameStatus;
  startedAt: number;
  finishedAt: number | null;
};
