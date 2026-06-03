import { getCountryByCode } from "@/features/countries/lib/search";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useReducer } from "react";
import { api } from "../../../../convex/_generated/api";
import { getOrCreateClientId } from "../logic/clientId";
import { STARTING_LIVES } from "../logic/constants";
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
import { isConstraintFailureReason, validateGuess } from "../logic/validation";
import type { CellPosition, GameState } from "../types";

const GAME_ENDED_STORAGE_PREFIX = "geodoku:ended:";

export function useGameState() {
  const todayGrid = useQuery(api.grids.getTodayGrid);
  const submit = useMutation(api.guesses.submitGuess);
  const recordFailedGuess = useMutation(api.guesses.recordFailedGuess);
  const recordGameEnd = useMutation(api.grids.recordGameEnd);

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
        validAnswers: todayGrid.validAnswers,
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

  // Notifie Convex de la fin de partie une seule fois (gagnée ou perdue) :
  // c'est ce qui alimente les compteurs de joueurs (wins/losses + agrégats),
  // indépendamment du rating qui reste facultatif.
  useEffect(() => {
    if (!state.date) return;
    if (state.status !== "won" && state.status !== "lost") return;

    const storageKey = `${GAME_ENDED_STORAGE_PREFIX}${state.date}`;
    if (localStorage.getItem(storageKey) === "1") return;

    const filledCells = Object.values(state.cells).filter(
      (cell) => cell.status === "filled",
    ).length;
    const failedGuesses = STARTING_LIVES - state.remainingLives;

    localStorage.setItem(storageKey, "1");

    // Cause de fin : gagné, sinon vies épuisées (remainingLives ≤ 0) ou bloqué
    // (perdu alors qu'il restait des vies → plus aucune case remplissable).
    const endReason =
      state.status === "won"
        ? "win"
        : state.remainingLives <= 0
          ? "lives"
          : "blocked";

    recordGameEnd({
      date: state.date,
      endReason,
      livesLeft: state.remainingLives,
      filledCells,
      guessesSubmitted: filledCells + failedGuesses,
      clientId: getOrCreateClientId(),
    }).catch(() => {
      // Retire le flag pour permettre une nouvelle tentative au prochain
      // changement d'état si le serveur a rejeté l'enregistrement.
      localStorage.removeItem(storageKey);
    });
  }, [
    state.date,
    state.status,
    state.cells,
    state.remainingLives,
    recordGameEnd,
  ]);

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
        // Log la tentative infructueuse côté serveur (fire-and-forget) : un
        // vrai pays qui rate le croisement est un signal de difficulté. On
        // ignore `already_used` (pas un échec de croisement) et les non-pays.
        if (isConstraintFailureReason(local.reason)) {
          recordFailedGuess({
            date: state.date,
            cellKey: `${cell.row},${cell.col}`,
            clientId: getOrCreateClientId(),
          }).catch(() => {});
        }
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
          validAnswers: todayGrid.validAnswers,
        });
        return { ok: true as const, rarity: result.rarity };
      } catch {
        dispatch({ type: "guessFailure" });
        return { ok: false as const, reason: "wrong_constraints" as const };
      }
    },
    [state, todayGrid, submit, recordFailedGuess],
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
