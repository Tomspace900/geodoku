import type { ConstraintId } from "./logic/constraints";

export type CellPosition = { row: 0 | 1 | 2; col: 0 | 1 | 2 };
export type CellKey = `${0 | 1 | 2},${0 | 1 | 2}`;

export type RarityTier = "common" | "uncommon" | "rare" | "ultra";

export type FilledCell = {
  status: "filled";
  countryCode: string;
};

/** Distribution d'une case (Convex `getGuessDistributionForDate`) : total des tentatives + part (0..1) par pays. */
export type CellGuessDistribution = {
  totalGuesses: number;
  rarityByCountry: Record<string, number>;
};

export type EmptyCell = { status: "empty" };
export type BlockedCell = { status: "blocked" };
export type Cell = FilledCell | EmptyCell | BlockedCell;

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
  /** Fin de partie déjà notifiée au serveur (dédup `recordGameEnd`). */
  endRecorded: boolean;
  /** Difficulté déjà notée par le joueur pour cette grille. */
  rated: boolean;
};
