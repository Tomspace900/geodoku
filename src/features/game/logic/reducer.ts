import type {
  Cell,
  CellKey,
  CellPosition,
  GameModeId,
  GameState,
} from "../types";
import {
  markBlockedCells,
  resolveStatusAfterPlacement,
} from "./blockedDetection";
import type { ConstraintId } from "./constraints";
import { CELL_KEYS, toCellKey } from "./gridTopology";
import { afterFailedAttempt, initialLives, isOutOfLives } from "./lives";
import type { SanitizedPersistedGame } from "./sanitizePersisted";
import { getUsedCountryCodes } from "./usedCountries";

export type GameAction =
  | { type: "init"; date: string; rows: ConstraintId[]; cols: ConstraintId[] }
  | { type: "selectCell"; cell: CellPosition | null }
  | {
      type: "guessSuccess";
      cell: CellPosition;
      countryCode: string;
      validAnswers: Record<string, string[]>;
    }
  | { type: "guessFailure" }
  | { type: "setEndRecorded"; date: string }
  | { type: "setRated"; date: string }
  | {
      type: "rehydrate";
      persisted: SanitizedPersistedGame;
      rows: ConstraintId[];
      cols: ConstraintId[];
      validAnswers: Record<string, string[]>;
    };

export function createInitialState(
  mode: GameModeId,
  date: string,
  rows: ConstraintId[],
  cols: ConstraintId[],
): GameState {
  const cells = Object.fromEntries(
    CELL_KEYS.map((cellKey) => [cellKey, { status: "empty" as const }]),
  ) as Record<CellKey, Cell>;
  return {
    mode,
    date,
    rows,
    cols,
    cells,
    lives: initialLives(mode),
    selectedCell: null,
    status: "playing",
    endRecorded: false,
    rated: false,
  };
}

function cellsAfterSuccessfulGuess(
  cells: Record<CellKey, Cell>,
  key: CellKey,
  countryCode: string,
  validAnswers: Record<string, string[]>,
  usedCountries: Set<string>,
): Record<CellKey, Cell> {
  const withFill = {
    ...cells,
    [key]: {
      status: "filled" as const,
      countryCode,
    },
  };
  return markBlockedCells(withFill, validAnswers, usedCountries);
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "init":
      return createInitialState(
        state.mode,
        action.date,
        action.rows,
        action.cols,
      );

    case "selectCell":
      return state.status === "playing"
        ? { ...state, selectedCell: action.cell }
        : state;

    case "guessSuccess": {
      if (state.status !== "playing") return state;
      const key = toCellKey(action.cell);
      const used = getUsedCountryCodes(state.cells);
      used.add(action.countryCode);
      const newCells = cellsAfterSuccessfulGuess(
        state.cells,
        key,
        action.countryCode,
        action.validAnswers,
        used,
      );
      const status = resolveStatusAfterPlacement(newCells);
      return {
        ...state,
        cells: newCells,
        selectedCell: null,
        status,
      };
    }

    // Mode-agnostique : `afterFailedAttempt` décrémente une vie ou incrémente un
    // compteur d'essais, et seul le régime limité peut atteindre `isOutOfLives`.
    case "guessFailure": {
      if (state.status !== "playing") return state;
      const lives = afterFailedAttempt(state.lives);
      return {
        ...state,
        lives,
        status: isOutOfLives(lives) ? "lost" : "playing",
      };
    }

    // Garde par date : le dispatch peut résulter d'une promesse (recordGameEnd /
    // submitGridFeedback) résolue après un basculement de grille à minuit UTC ;
    // on ne marque que si l'état concerne toujours la même partie.
    case "setEndRecorded":
      return state.date !== action.date || state.endRecorded
        ? state
        : { ...state, endRecorded: true };

    case "setRated":
      return state.date !== action.date || state.rated
        ? state
        : { ...state, rated: true };

    case "rehydrate": {
      const usedCountries = getUsedCountryCodes(action.persisted.cells);
      let cells = { ...action.persisted.cells };
      cells = markBlockedCells(cells, action.validAnswers, usedCountries);

      let status = action.persisted.status;
      if (status === "playing") {
        status = resolveStatusAfterPlacement(cells);
      }

      return {
        mode: state.mode,
        date: action.persisted.date,
        rows: action.rows,
        cols: action.cols,
        cells,
        lives: action.persisted.lives,
        selectedCell: null,
        status,
        endRecorded: action.persisted.endRecorded,
        rated: action.persisted.rated,
      };
    }
  }
}
