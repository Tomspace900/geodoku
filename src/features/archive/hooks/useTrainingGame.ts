import type { ConstraintId } from "@/features/game/logic/constraints";
import { evaluateGuess } from "@/features/game/logic/guessEvaluation";
import { failedAttemptCount } from "@/features/game/logic/lives";
import { createInitialState, gameReducer } from "@/features/game/logic/reducer";
import {
  type SanitizedPersistedGame,
  sanitizeTrainingGame,
} from "@/features/game/logic/sanitizePersisted";
import type { CellPosition, GameState } from "@/features/game/types";
import { todayUTC } from "@/lib/dates";
import { usePostHog } from "@posthog/react";
import { useQuery } from "convex/react";
import { useCallback, useEffect, useReducer, useRef } from "react";
import { api } from "../../../../convex/_generated/api";
import {
  clearTrainingGame,
  loadTrainingGame,
  saveTrainingGame,
} from "../logic/trainingPersistence";

type TrainingGuessFailure = {
  kind: "domain_rejected";
  reason: string;
  /** Toujours faux : une partie d'entraînement ne se perd pas sur un essai raté. */
  gameOver: false;
};

/**
 * Jumeau d'entraînement de `useGameState`, volontairement plus simple : même
 * reducer, même validation locale, mais **aucune écriture Convex**. Les cohortes
 * de rareté des grilles passées restent donc figées, et il n'y a ni idempotence
 * ni rate-limit à gérer — un coup joué ici n'existe que dans le navigateur.
 *
 * N'est monté que sur une date déjà classée rejouable par l'appelant : la requête
 * ne part donc jamais pour une date future.
 */
export function useTrainingGame(date: string) {
  const posthog = usePostHog();
  const today = todayUTC();
  const grid = useQuery(api.grids.getReplayGrid, { date });

  const [state, dispatch] = useReducer(
    gameReducer,
    null as unknown as GameState,
    () => createInitialState("training", "", [], []),
  );

  // Une reprise ne doit pas être comptée comme un démarrage : on distingue les
  // deux au moment où la grille arrive, une seule fois par date.
  const startedDateRef = useRef<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: posthog is a stable ref
  useEffect(() => {
    if (!grid || grid.date === state.date) return;

    const persisted = loadTrainingGame(grid.date, today);
    let rehydratePayload: SanitizedPersistedGame | null = null;
    if (persisted) {
      rehydratePayload = sanitizeTrainingGame(persisted, grid.validAnswers);
      if (!rehydratePayload) clearTrainingGame(grid.date, today);
    }

    if (rehydratePayload) {
      dispatch({
        type: "rehydrate",
        persisted: rehydratePayload,
        rows: grid.rows as ConstraintId[],
        cols: grid.cols as ConstraintId[],
        validAnswers: grid.validAnswers,
      });
    } else {
      dispatch({
        type: "init",
        date: grid.date,
        rows: grid.rows as ConstraintId[],
        cols: grid.cols as ConstraintId[],
      });
    }

    if (startedDateRef.current !== grid.date) {
      startedDateRef.current = grid.date;
      posthog?.capture("training_started", {
        grid_date: grid.date,
        resumed: rehydratePayload !== null,
        restart: false,
      });
    }
  }, [grid, state.date, today]);

  useEffect(() => {
    if (!state.date) return;
    saveTrainingGame(state, today);
  }, [state, today]);

  const completedDateRef = useRef<string | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: posthog is a stable ref
  useEffect(() => {
    if (!state.date || state.status === "playing") return;
    if (completedDateRef.current === state.date) return;
    completedDateRef.current = state.date;

    const filledCells = Object.values(state.cells).filter(
      (cell) => cell.status === "filled",
    ).length;
    posthog?.capture("training_completed", {
      grid_date: state.date,
      outcome: state.status,
      filled_cells: filledCells,
      failed_attempts: failedAttemptCount(state.lives),
    });
  }, [state.date, state.status, state.cells, state.lives]);

  const selectCell = useCallback((cell: CellPosition | null) => {
    dispatch({ type: "selectCell", cell });
  }, []);

  const restart = useCallback(() => {
    if (!grid) return;
    clearTrainingGame(grid.date, today);
    completedDateRef.current = null;
    dispatch({
      type: "init",
      date: grid.date,
      rows: grid.rows as ConstraintId[],
      cols: grid.cols as ConstraintId[],
    });
    posthog?.capture("training_started", {
      grid_date: grid.date,
      resumed: false,
      restart: true,
    });
  }, [grid, today, posthog]);

  // Purement local : le verdict vient de `validAnswers`, déjà livré au client.
  const submitGuess = useCallback(
    async (cell: CellPosition, countryCode: string) => {
      if (state.status !== "playing" || !grid) return;

      const local = evaluateGuess(state, cell, countryCode, grid.validAnswers);
      if (local.kind === "rejected") {
        dispatch({ type: "guessFailure" });
        return {
          kind: "domain_rejected",
          reason: local.reason,
          gameOver: false,
        } satisfies TrainingGuessFailure;
      }

      dispatch({
        type: "guessSuccess",
        cell,
        countryCode,
        validAnswers: grid.validAnswers,
      });
      return { kind: "accepted" } as const;
    },
    [state, grid],
  );

  return {
    state,
    selectCell,
    submitGuess,
    restart,
    isLoading: grid === undefined,
    hasGrid: !!grid,
    validAnswers: grid?.validAnswers ?? {},
  };
}
