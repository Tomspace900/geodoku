import { getCountryByCode } from "@/features/countries/lib/search";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useReducer } from "react";
import { api } from "../../../../convex/_generated/api";
import { getOrCreateClientId } from "../logic/clientId";
import type { ConstraintId } from "../logic/constraints";
import {
  type PersistedGame,
  clearPersistedGame,
  isPersistedForToday,
  loadPersistedGame,
  savePersistedGame,
} from "../logic/persistence";
import { createInitialState, gameReducer } from "../logic/reducer";
import { sanitizePersistedForGrid } from "../logic/sanitizePersisted";
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
    if (!todayGrid || todayGrid.date === state.date) return;

    const persisted = loadPersistedGame();
    let rehydratePayload: PersistedGame | null = null;

    if (persisted && isPersistedForToday(persisted, todayGrid.date)) {
      rehydratePayload = sanitizePersistedForGrid(
        persisted,
        todayGrid.validAnswers,
      );
      if (!rehydratePayload) clearPersistedGame();
    } else if (persisted) {
      clearPersistedGame();
    }

    if (rehydratePayload) {
      dispatch({
        type: "rehydrate",
        persisted: rehydratePayload,
        rows: todayGrid.rows as ConstraintId[],
        cols: todayGrid.cols as ConstraintId[],
      });
    } else {
      dispatch({
        type: "init",
        date: todayGrid.date,
        rows: todayGrid.rows as ConstraintId[],
        cols: todayGrid.cols as ConstraintId[],
      });
    }
  }, [todayGrid, state.date]);

  useEffect(() => {
    if (!state.date) return;
    savePersistedGame(state);
  }, [state]);

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
          clientId: getOrCreateClientId(),
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
    validAnswers: todayGrid?.validAnswers ?? {},
  };
}
