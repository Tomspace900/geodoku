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

/**
 * Mode de jeu. `daily` = la grille du jour (5 vies, résultats comptés côté
 * serveur) ; `training` = une grille passée rejouée depuis `/archive` (essais
 * illimités, aucune écriture Convex).
 */
export type GameModeId = "daily" | "training";

/**
 * Vies — union discriminée plutôt qu'un compteur unique : le mode entraînement
 * n'a pas de vies « à zéro », il compte des essais ratés. Modéliser les deux
 * régimes par la même valeur numérique rendrait représentables des états qui
 * n'existent pas (un training à 0 vie, un daily sans plafond). Toute lecture
 * passe par `logic/lives.ts`.
 */
export type LivesState =
  | { kind: "limited"; remaining: number }
  | { kind: "unlimited"; failedAttempts: number };

export type GameState = {
  mode: GameModeId;
  date: string;
  rows: ConstraintId[];
  cols: ConstraintId[];
  cells: Record<CellKey, Cell>;
  lives: LivesState;
  selectedCell: CellPosition | null;
  status: GameStatus;
  /** Fin de partie déjà notifiée au serveur (dédup `recordTodayGameEnd`). Daily uniquement. */
  endRecorded: boolean;
  /** Difficulté déjà notée par le joueur pour cette grille. Daily uniquement. */
  rated: boolean;
};
