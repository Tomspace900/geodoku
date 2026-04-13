import { getCountryByCode } from "@/features/countries/lib/search";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useReducer } from "react";
import { api } from "../../../../convex/_generated/api";
import { createInitialState, gameReducer } from "../logic/reducer";
import { validateGuess } from "../logic/validation";
import type { CellPosition, GameState } from "../types";

export function useGameState() {
  const todayGrid = useQuery(api.grids.getTodayGrid);
  const submit = useMutation(api.guesses.submitGuess);

  const [state, dispatch] = useReducer(
    gameReducer,
    null as unknown as GameState,
    () => createInitialState("", [], []),
  );

  useEffect(() => {
    if (todayGrid && todayGrid.date !== state.date) {
      dispatch({
        type: "init",
        date: todayGrid.date,
        rows: todayGrid.rows,
        cols: todayGrid.cols,
      });
    }
  }, [todayGrid, state.date]);

  const selectCell = useCallback((cell: CellPosition | null) => {
    dispatch({ type: "selectCell", cell });
  }, []);

  const submitGuess = useCallback(
    async (cell: CellPosition, countryCode: string) => {
      if (state.status !== "playing" || !todayGrid) return;
      const country = getCountryByCode(countryCode);
      if (!country) {
        dispatch({ type: "guessFailure" });
        return { ok: false as const, reason: "invalid_country" as const };
      }
      const local = validateGuess({
        rowConstraintId: state.rows[cell.row],
        colConstraintId: state.cols[cell.col],
        country,
        usedCountries: state.usedCountries,
      });
      if (!local.valid) {
        dispatch({ type: "guessFailure" });
        return { ok: false as const, reason: local.reason };
      }
      try {
        const result = await submit({
          date: state.date,
          cellKey: `${cell.row},${cell.col}`,
          countryCode,
        });
        dispatch({
          type: "guessSuccess",
          cell,
          countryCode,
          rarity: result.rarity,
        });
        return { ok: true as const, rarity: result.rarity };
      } catch {
        dispatch({ type: "guessFailure" });
        return { ok: false as const, reason: "wrong_constraints" as const };
      }
    },
    [state, todayGrid, submit],
  );

  return {
    state,
    selectCell,
    submitGuess,
    isLoading: todayGrid === undefined,
    hasGrid: !!todayGrid,
  };
}
