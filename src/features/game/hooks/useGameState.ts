import { usePostHog } from "@posthog/react";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useReducer, useRef } from "react";
import { api } from "../../../../convex/_generated/api";
import { getOrCreateClientId } from "../logic/clientId";
import type { ConstraintId } from "../logic/constraints";
import { toCellKey } from "../logic/gridTopology";
import {
  deliverGuess,
  guessOperationSlot,
  type PendingGuess,
  parseGuessOperationSlot,
} from "../logic/guessCommand";
import { evaluateGuess } from "../logic/guessEvaluation";
import { recordDailyGame } from "../logic/history";
import { failedAttemptCount, livesRemaining } from "../logic/lives";
import {
  clearPendingOperationId,
  createOperationId,
  getOrCreatePendingOperationId,
  listPendingOperations,
} from "../logic/operationIds";
import {
  clearPersistedGame,
  isPersistedForToday,
  loadPersistedGame,
  savePersistedGame,
} from "../logic/persistence";
import { rarityToTier } from "../logic/rarity";
import { createInitialState, gameReducer } from "../logic/reducer";
import {
  type SanitizedPersistedGame,
  sanitizePersistedForGrid,
} from "../logic/sanitizePersisted";
import {
  type GuessFailureReason,
  isConstraintFailureReason,
} from "../logic/validation";
import type { CellPosition, DifficultyRating, GameState } from "../types";

type GuessSubmitFailure = {
  kind: "domain_rejected";
  reason: GuessFailureReason | "invalid_country" | "wrong_constraints";
  gameOver: boolean;
};

export function useGameState() {
  const posthog = usePostHog();
  const todayGrid = useQuery(api.grids.getTodayGrid);
  const submit = useMutation(api.guesses.submitTodayGuess);
  const recordFailedGuess = useMutation(api.guesses.recordTodayFailedGuess);
  const recordGameEnd = useMutation(api.grids.recordTodayGameEnd);

  const [state, dispatch] = useReducer(
    gameReducer,
    null as unknown as GameState,
    () => createInitialState("daily", "", [], []),
  );

  // Garde-fou anti-doublon intra-session : la date dont la fin est en cours
  // d'envoi (ou déjà claimée). `state.endRecorded` gère l'idempotence
  // cross-reload ; ce ref évite un second envoi le temps que le dispatch se
  // propage. Scopé par date car le hook survit au changement de jour.
  const endClaimedDateRef = useRef<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: posthog is a stable ref
  useEffect(() => {
    if (!todayGrid || todayGrid.date === state.date) return;

    const persisted = loadPersistedGame();
    let rehydratePayload: SanitizedPersistedGame | null = null;

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
        lives_left: livesRemaining(rehydratePayload.lives),
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

  // Journal local (#154) : seuls les coups et la note le font évoluer, pas la
  // sélection d'une case. L'entrée naît au premier coup.
  // biome-ignore lint/correctness/useExhaustiveDependencies: state is read only for the fields listed in deps
  useEffect(() => {
    recordDailyGame(state);
  }, [state.date, state.cells, state.failed, state.rating]);

  // Notifie Convex de la fin de partie une seule fois (gagnée ou perdue) :
  // c'est ce qui alimente les compteurs de joueurs (wins/losses + agrégats),
  // indépendamment du rating qui reste facultatif.
  // biome-ignore lint/correctness/useExhaustiveDependencies: posthog is stable; the payload derives from state fields already in deps
  useEffect(() => {
    if (!state.date) return;
    if (state.status !== "won" && state.status !== "lost") return;
    // Idempotence : déjà notifié (persisté) ou envoi en cours pour cette date.
    if (state.endRecorded || endClaimedDateRef.current === state.date) return;
    endClaimedDateRef.current = state.date;

    const filledCells = Object.values(state.cells).filter(
      (cell) => cell.status === "filled",
    ).length;
    const failedGuesses = failedAttemptCount(state.lives);
    // Le hook ne sert que la grille du jour : le régime est toujours limité.
    const remainingLives = livesRemaining(state.lives) ?? 0;

    // Cause de fin : gagné, sinon vies épuisées ou bloqué (perdu alors qu'il
    // restait des vies → plus aucune case remplissable).
    const endReason =
      state.status === "won"
        ? "win"
        : remainingLives <= 0
          ? "lives"
          : "blocked";

    // Rareté et score de fin non inclus ici (dynamiques, dépendent de la
    // distribution) : captés par `result_screen_viewed`. `filled_cells` +
    // `lives_left` suffisent à reconstituer la performance de grille.
    const operationSlot = `game-end:${state.date}`;
    const operationId = getOrCreatePendingOperationId(operationSlot);

    posthog?.capture("game_completed", {
      $insert_id: operationId,
      outcome: state.status,
      end_reason: endReason,
      grid_date: state.date,
      filled_cells: filledCells,
      lives_left: remainingLives,
    });

    recordGameEnd({
      operationId,
      endReason,
      livesLeft: remainingLives,
      filledCells,
      guessesSubmitted: filledCells + failedGuesses,
      clientId: getOrCreateClientId(),
    })
      .then(() => {
        clearPendingOperationId(operationSlot, operationId);
        // Persiste l'idempotence : plus jamais ré-émis, même après reload.
        dispatch({ type: "setEndRecorded", date: state.date });
      })
      .catch(() => {
        // Libère le ref pour permettre une nouvelle tentative au prochain
        // changement d'état / reload si le serveur a rejeté l'enregistrement.
        if (endClaimedDateRef.current === state.date) {
          endClaimedDateRef.current = null;
        }
      });
  }, [
    state.date,
    state.status,
    state.endRecorded,
    state.cells,
    state.lives,
    recordGameEnd,
  ]);

  // Envoie un coup déjà affiché. Le client Convex met lui-même les mutations
  // en file pendant une coupure ; seul un rechargement perd l'envoi, d'où le
  // rejeu au démarrage avec le même `operationId` (idempotent côté serveur).
  // biome-ignore lint/correctness/useExhaustiveDependencies: posthog is a stable ref
  const sendGuess = useCallback(
    async (guess: PendingGuess, operationId: string, replayed: boolean) => {
      const startedAt = performance.now();
      const delivery = await deliverGuess(() =>
        submit({
          operationId,
          cellKey: guess.cellKey,
          countryCode: guess.countryCode,
          clientId: getOrCreateClientId(),
          date: guess.date,
        }),
      );
      if (delivery.kind === "retry_later") return;
      clearPendingOperationId(guessOperationSlot(guess), operationId);
      if (delivery.kind === "dropped") return;
      posthog?.capture("guess_submitted", {
        $insert_id: operationId,
        grid_date: guess.date,
        cell: guess.cellKey,
        country_code: guess.countryCode,
        rarity_tier: rarityToTier(delivery.rarity),
        replayed,
        // Un rejeu ne mesure que l'aller-retour, pas l'attente du joueur.
        ...(replayed
          ? {}
          : { submit_latency_ms: Math.round(performance.now() - startedAt) }),
      });
    },
    [submit],
  );

  // Rejoue une fois par chargement les coups restés sans accusé (onglet fermé
  // pendant l'envoi). Un coup d'un autre jour est refusé par le serveur, sauf
  // s'il avait déjà été compté : dans les deux cas l'attente est soldée.
  const replayedPendingRef = useRef(false);
  useEffect(() => {
    if (!todayGrid || replayedPendingRef.current) return;
    replayedPendingRef.current = true;
    listPendingOperations().forEach(({ slot, operationId }) => {
      const guess = parseGuessOperationSlot(slot);
      if (guess) void sendGuess(guess, operationId, true);
    });
  }, [todayGrid, sendGuess]);

  const markRated = useCallback((date: string, rating: DifficultyRating) => {
    dispatch({ type: "setRated", date, rating });
  }, []);

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
        const remaining = livesRemaining(state.lives) ?? 0;
        const gameOver = remaining === 1;
        const operationId = createOperationId();
        dispatch({ type: "guessFailure", cell });
        posthog?.capture("guess_failed", {
          $insert_id: operationId,
          reason,
          grid_date: state.date,
          cell: `${cell.row},${cell.col}`,
          lives_remaining: remaining - 1,
          ...(countryCode ? { country_code: countryCode } : {}),
        });
        return { kind: "domain_rejected", reason, gameOver };
      }

      const cellKey = toCellKey(cell);
      const local = evaluateGuess(
        state,
        cell,
        countryCode,
        todayGrid.validAnswers,
      );
      if (local.kind === "rejected") {
        // Log la tentative infructueuse côté serveur (fire-and-forget) : un
        // vrai pays qui rate le croisement est un signal de difficulté. On
        // ignore `already_used` (pas un échec de croisement) et les non-pays.
        if (isConstraintFailureReason(local.reason)) {
          recordFailedGuess({
            operationId: createOperationId(),
            cellKey,
            countryCode,
            clientId: getOrCreateClientId(),
          }).catch(() => {});
        }
        return failGuess(local.reason, countryCode);
      }
      // Local-first : `validAnswers` est l'autorité publiée, le serveur ne peut
      // plus changer le verdict. La case se remplit tout de suite et l'envoi
      // part en arrière-plan ; sa rareté arrive avec la distribution réactive.
      const guess = { date: state.date, cellKey, countryCode };
      const operationId = getOrCreatePendingOperationId(
        guessOperationSlot(guess),
      );
      dispatch({
        type: "guessSuccess",
        cell,
        countryCode,
        validAnswers: todayGrid.validAnswers,
      });
      void sendGuess(guess, operationId, false);
      return { kind: "accepted" } as const;
    },
    [state, todayGrid, sendGuess, recordFailedGuess],
  );

  return {
    state,
    selectCell,
    submitGuess,
    markRated,
    isLoading: todayGrid === undefined,
    hasGrid: !!todayGrid,
    validAnswers: todayGrid?.validAnswers ?? {},
  };
}
