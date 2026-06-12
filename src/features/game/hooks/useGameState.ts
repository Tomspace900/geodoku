import { getCountryByCode } from "@/features/countries/lib/search";
import { usePostHog } from "@posthog/react";
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
import {
  computeGridScore,
  computeOriginalityScore,
  rarityToTier,
} from "../logic/rarity";
import { createInitialState, gameReducer } from "../logic/reducer";
import { sanitizePersistedForGrid } from "../logic/sanitizePersisted";
import {
  type GuessFailureReason,
  isConstraintFailureReason,
  validateGuess,
} from "../logic/validation";
import type { CellPosition, GameState } from "../types";

type GuessSubmitFailure = {
  ok: false;
  reason: GuessFailureReason | "invalid_country" | "wrong_constraints";
  gameOver: boolean;
};

const GAME_ENDED_STORAGE_PREFIX = "geodoku:ended:";

export function useGameState() {
  const posthog = usePostHog();
  const todayGrid = useQuery(api.grids.getTodayGrid);
  const submit = useMutation(api.guesses.submitGuess);
  const recordFailedGuess = useMutation(api.guesses.recordFailedGuess);
  const recordGameEnd = useMutation(api.grids.recordGameEnd);

  const [state, dispatch] = useReducer(
    gameReducer,
    null as unknown as GameState,
    () => createInitialState("", [], []),
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: posthog is a stable ref
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
      const filledCells = Object.values(rehydratePayload.cells).filter(
        (cell) => cell.status === "filled",
      ).length;
      posthog?.capture("session_resumed", {
        grid_date: todayGrid.date,
        filled_cells: filledCells,
        lives_left: rehydratePayload.remainingLives,
      });
    } else {
      dispatch({
        type: "init",
        date: todayGrid.date,
        rows: todayGrid.rows as ConstraintId[],
        cols: todayGrid.cols as ConstraintId[],
      });
      posthog?.capture("game_started", { grid_date: todayGrid.date });
    }
  }, [todayGrid, state.date]);

  useEffect(() => {
    if (!state.date) return;
    savePersistedGame(state);
  }, [state]);

  // Notifie Convex de la fin de partie une seule fois (gagnée ou perdue) :
  // c'est ce qui alimente les compteurs de joueurs (wins/losses + agrégats),
  // indépendamment du rating qui reste facultatif.
  // biome-ignore lint/correctness/useExhaustiveDependencies: posthog is stable; computeGridScore/computeOriginalityScore derive from state fields already in deps
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

    const { percent: gridScorePercent } = computeGridScore(state);
    const { grade: originalityGrade, score: originalityScore } =
      computeOriginalityScore(state);

    posthog?.capture("game_completed", {
      outcome: state.status,
      end_reason: endReason,
      grid_date: state.date,
      filled_cells: filledCells,
      lives_left: state.remainingLives,
      grid_score_percent: gridScorePercent,
      originality_grade: originalityGrade,
      originality_score: originalityScore,
    });

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: posthog is a stable ref
  const submitGuess = useCallback(
    async (cell: CellPosition, countryCode: string) => {
      if (state.status !== "playing" || !todayGrid) return;

      function failGuess(
        reason: GuessSubmitFailure["reason"],
        countryCode?: string,
      ): GuessSubmitFailure {
        const gameOver = state.remainingLives === 1;
        dispatch({ type: "guessFailure" });
        posthog?.capture("guess_failed", {
          reason,
          grid_date: state.date,
          cell: `${cell.row},${cell.col}`,
          lives_remaining: state.remainingLives - 1,
          ...(countryCode ? { country_code: countryCode } : {}),
        });
        return { ok: false, reason, gameOver };
      }

      const country = getCountryByCode(countryCode);
      if (!country) {
        return failGuess("invalid_country", countryCode);
      }
      const local = validateGuess({
        rowConstraintId: state.rows[cell.row],
        colConstraintId: state.cols[cell.col],
        country,
        usedCountries: state.usedCountries,
      });
      if (!local.valid) {
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
        return failGuess(local.reason, countryCode);
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
        posthog?.capture("guess_submitted", {
          grid_date: state.date,
          cell: `${cell.row},${cell.col}`,
          country_code: countryCode,
          rarity_tier: rarityToTier(result.rarity),
        });
        return { ok: true as const, rarity: result.rarity };
      } catch {
        return failGuess("wrong_constraints", countryCode);
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
