import type { Cell, CellKey, CellPosition, GameState } from "../types";
import { STARTING_LIVES } from "./constants";
import { rarityToTier } from "./rarity";

export type GameAction =
  | { type: "init"; date: string; rows: string[]; cols: string[] }
  | { type: "selectCell"; cell: CellPosition | null }
  | {
      type: "guessSuccess";
      cell: CellPosition;
      countryCode: string;
      rarity: number;
    }
  | { type: "guessFailure" };

export function createInitialState(
  date: string,
  rows: string[],
  cols: string[],
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
      const newCells = {
        ...state.cells,
        [key]: {
          status: "filled" as const,
          countryCode: action.countryCode,
          rarity: action.rarity,
          rarityTier: rarityToTier(action.rarity),
        },
      };
      const used = new Set(state.usedCountries);
      used.add(action.countryCode);
      const allFilled = Object.values(newCells).every(
        (c) => c.status === "filled",
      );
      return {
        ...state,
        cells: newCells,
        usedCountries: used,
        selectedCell: null,
        status: allFilled ? "won" : "playing",
        finishedAt: allFilled ? Date.now() : null,
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
  }
}
