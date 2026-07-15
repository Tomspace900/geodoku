import type { ConstraintId } from "./logic/constraints";
import type { CellKey, CellPosition } from "./logic/gridTopology";

export type { CellKey, CellPosition } from "./logic/gridTopology";

export type RarityTier = "common" | "uncommon" | "rare" | "ultra";

export type FilledCell = {
  status: "filled";
  countryCode: string;
};

/** Distribution d'une case (Convex `getTodayGuessDistribution`) : total des tentatives + part (0..1) par pays. */
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
  status: GameStatus;
  /** Fin de partie déjà notifiée au serveur (dédup `recordTodayGameEnd`). */
  endRecorded: boolean;
  /** Difficulté déjà notée par le joueur pour cette grille. */
  rated: boolean;
};
