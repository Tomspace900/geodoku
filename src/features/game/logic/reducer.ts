import type { Cell, CellKey, CellPosition, GameState } from "../types";
import {
  markBlockedCells,
  resolveStatusAfterPlacement,
} from "./blockedDetection";
import { STARTING_LIVES } from "./constants";
import type { ConstraintId } from "./constraints";
import type { PersistedGame } from "./persistence";
import { rarityToTier } from "./rarity";

export type GameAction =
  | { type: "init"; date: string; rows: ConstraintId[]; cols: ConstraintId[] }
  | { type: "selectCell"; cell: CellPosition | null }
  | {
      type: "guessSuccess";
      cell: CellPosition;
      countryCode: string;
      rarity: number;
      validAnswers: Record<string, string[]>;
    }
  | { type: "guessFailure" }
  | {
      type: "rehydrate";
      persisted: PersistedGame;
      rows: ConstraintId[];
      cols: ConstraintId[];
      validAnswers: Record<string, string[]>;
    };

export function createInitialState(
  date: string,
  rows: ConstraintId[],
  cols: ConstraintId[],
): GameState {
  const cells = {} as Record<CellKey, Cell>;
  for (let i = 0 as 0 | 1 | 2; i <= 2; i++)
    for (let j = 0 as 0 | 1 | 2; j <= 2; j++)
      cells[`${i},${j}` as CellKey] = { status: "empty" };
  return {
    date,
    rows,
    cols,
    cells,
    remainingLives: STARTING_LIVES,
    selectedCell: null,
    usedCountries: new Set(),
    status: "playing",
    startedAt: Date.now(),
    finishedAt: null,
  };
}

function cellsAfterSuccessfulGuess(
  cells: Record<CellKey, Cell>,
  key: CellKey,
  countryCode: string,
  rarity: number,
  validAnswers: Record<string, string[]>,
  usedCountries: Set<string>,
): Record<CellKey, Cell> {
  const withFill = {
    ...cells,
    [key]: {
      status: "filled" as const,
      countryCode,
      rarity,
      rarityTier: rarityToTier(rarity),
    },
  };
  return markBlockedCells(withFill, validAnswers, usedCountries);
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "init":
      return createInitialState(action.date, action.rows, action.cols);

    case "selectCell":
      return state.status === "playing"
        ? { ...state, selectedCell: action.cell }
        : state;

    case "guessSuccess": {
      if (state.status !== "playing") return state;
      const key = `${action.cell.row},${action.cell.col}` as CellKey;
      const used = new Set(state.usedCountries);
      used.add(action.countryCode);
      const newCells = cellsAfterSuccessfulGuess(
        state.cells,
        key,
        action.countryCode,
        action.rarity,
        action.validAnswers,
        used,
      );
      const status = resolveStatusAfterPlacement(newCells);
      const finished = status !== "playing";
      return {
        ...state,
        cells: newCells,
        usedCountries: used,
        selectedCell: null,
        status,
        finishedAt: finished ? Date.now() : null,
      };
    }

    case "guessFailure": {
      if (state.status !== "playing") return state;
      const lives = state.remainingLives - 1;
      const lost = lives <= 0;
      return {
        ...state,
        remainingLives: lives,
        status: lost ? "lost" : "playing",
        finishedAt: lost ? Date.now() : state.finishedAt,
      };
    }

    case "rehydrate": {
      const usedCountries = new Set(action.persisted.usedCountries);
      let cells = { ...action.persisted.cells };
      cells = markBlockedCells(cells, action.validAnswers, usedCountries);

      let status = action.persisted.status;
      if (status === "playing") {
        status = resolveStatusAfterPlacement(cells);
      }

      const finishedAt =
        status === "playing"
          ? null
          : (action.persisted.finishedAt ?? action.persisted.startedAt);

      return {
        date: action.persisted.date,
        rows: action.rows,
        cols: action.cols,
        cells,
        remainingLives: action.persisted.remainingLives,
        selectedCell: null,
        usedCountries,
        status,
        startedAt: action.persisted.startedAt,
        finishedAt,
      };
    }
  }
}
