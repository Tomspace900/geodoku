import { usePostHog } from "@posthog/react";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useAccount } from "@/features/account/AccountContext";
import { api } from "../../../../convex/_generated/api";
import {
  persistedFromRecord,
  recordOfState,
  sameRecord,
} from "../logic/accountGame";
import { getOrCreateClientId } from "../logic/clientId";
import type { ConstraintId } from "../logic/constraints";
import { toCellKey } from "../logic/gridTopology";
import { evaluateGuess } from "../logic/guessEvaluation";
import { recordDailyGame } from "../logic/history";
import { livesRemaining } from "../logic/lives";
import {
  ackMove,
  appendMove,
  clearMoveSync,
  isMoveSyncSettled,
  loadMoveSync,
  type MoveSync,
  movesPlayed,
  nextPendingMove,
  resumeAccountSync,
  type SyncedMove,
  saveMoveSync,
  startMoveSync,
  stopMoveSync,
  syncedMoveCount,
  toAccountSync,
} from "../logic/moveSync";
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
import type { GuessFailureReason } from "../logic/validation";
import type { CellPosition, GameState } from "../types";

type GuessSubmitFailure = {
  kind: "domain_rejected";
  reason: GuessFailureReason | "invalid_country" | "wrong_constraints";
  gameOver: boolean;
};

export function useGameState() {
  const posthog = usePostHog();
  const todayGrid = useQuery(api.grids.getTodayGrid);
  const playMove = useMutation(api.games.playMove);
  const playAccountMove = useMutation(api.games.playAccountMove);
  const account = useAccount();
  // Lu par l'envoi, qui vit dans un callback stable.
  const accountRef = useRef(account);
  accountRef.current = account;

  const [state, dispatch] = useReducer(
    gameReducer,
    null as unknown as GameState,
    () => createInitialState("daily", "", [], []),
  );

  // Coups à envoyer et jeton de la partie, hors du reducer : ils ne changent
  // rien à l'écran. `sendingRef` garde un seul envoi à la fois, dans l'ordre.
  const syncRef = useRef<MoveSync | null>(null);
  const sendingRef = useRef(false);
  // Coups déjà joués au chargement : leur envoi est un rejeu (`replayed`).
  const movesAtLoadRef = useRef(0);
  // Partie reprise du serveur : le journal de l'appareil ne la garde pas.
  const adoptedRef = useRef(false);
  // Tous les coups sont arrivés au serveur : la cohorte relue à partir de là
  // compte la partie (le coup qui la finit part après l'écran de fin).
  const [movesSettled, setMovesSettled] = useState(true);

  function updateSync(next: MoveSync): void {
    syncRef.current = next;
    saveMoveSync(next);
    setMovesSettled(isMoveSyncSettled(next));
  }

  // Envoie les coups en attente, un par un. Le client Convex garde lui-même
  // les mutations pendant une coupure ; une erreur serveur laisse le coup en
  // attente jusqu'au prochain coup ou au prochain chargement. Un refus
  // définitif arrête l'envoi : la partie continue en local seulement.
  // biome-ignore lint/correctness/useExhaustiveDependencies: posthog is a stable ref
  const flushMoves = useCallback(async () => {
    if (sendingRef.current) return;
    sendingRef.current = true;
    try {
      for (;;) {
        let sync = syncRef.current;
        const pending = sync ? nextPendingMove(sync) : null;
        if (!sync || !pending) return;

        // Compte (#155) : rien ne part tant que la session se vérifie. Une
        // partie anonyme attend le rattachement, puis continue par le compte ;
        // une partie du compte s'arrête à la déconnexion.
        const { status, synced } = accountRef.current;
        if (status === "loading") return;
        if (sync.owner === "anon" && status === "signedIn") {
          if (!synced) return;
          sync = toAccountSync(sync);
          updateSync(sync);
        }
        if (sync.owner === "account" && status !== "signedIn") {
          updateSync(stopMoveSync(sync));
          return;
        }

        const startedAt = performance.now();
        let result: Awaited<ReturnType<typeof playMove>>;
        try {
          result =
            sync.owner === "account"
              ? await playAccountMove({
                  date: sync.date,
                  moveIndex: pending.moveIndex,
                  ...pending.move,
                })
              : await playMove({
                  date: sync.date,
                  token: sync.token,
                  clientId: getOrCreateClientId(),
                  moveIndex: pending.moveIndex,
                  ...pending.move,
                });
        } catch {
          return;
        }
        // Grille changée pendant l'envoi (minuit UTC) : l'accusé ne vaut plus.
        const current = syncRef.current;
        if (!current || current.token !== sync.token) return;
        // Session expirée entre-temps : le coup repartira une fois reconnecté.
        if (result.kind === "rejected" && result.reason === "signed_out")
          return;
        if (result.kind === "rejected") {
          updateSync(stopMoveSync(current));
          return;
        }
        updateSync(ackMove(current, pending.moveIndex));
        if (result.kind === "applied" && result.outcome === "success") {
          const replayed = pending.moveIndex < movesAtLoadRef.current;
          posthog?.capture("guess_submitted", {
            grid_date: sync.date,
            cell: pending.move.cellKey,
            country_code: pending.move.countryCode,
            rarity_tier: rarityToTier(result.count / result.total),
            replayed,
            // Un rejeu ne mesure que l'aller-retour, pas l'attente du joueur.
            ...(replayed
              ? {}
              : {
                  submit_latency_ms: Math.round(performance.now() - startedAt),
                }),
          });
        }
      }
    } finally {
      sendingRef.current = false;
    }
  }, [playMove, playAccountMove]);

  // La session tranchée, le rattachement fait ou la déconnexion : l'envoi
  // reprend (ou s'arrête) selon le nouvel état du compte.
  // biome-ignore lint/correctness/useExhaustiveDependencies: flushMoves lit l'état du compte par ref
  useEffect(() => {
    void flushMoves();
  }, [account.status, account.synced, flushMoves]);

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

    // L'envoi ne reprend que s'il décrit exactement la partie rechargée. Une
    // partie commencée sans lui (avant #70, ou stockage plein) reste locale.
    const stored = loadMoveSync();
    const played = rehydratePayload
      ? movesPlayed(rehydratePayload.cells, rehydratePayload.lives)
      : 0;
    let sync: MoveSync | null = null;
    if (stored && stored.date === todayGrid.date && rehydratePayload) {
      sync = syncedMoveCount(stored) === played ? stored : stopMoveSync(stored);
    } else {
      clearMoveSync();
    }
    syncRef.current = sync;
    if (sync) saveMoveSync(sync);
    setMovesSettled(isMoveSyncSettled(sync));
    movesAtLoadRef.current = sync?.moves.length ?? 0;

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
    void flushMoves();
  }, [todayGrid, state.date]);

  useEffect(() => {
    if (!state.date) return;
    savePersistedGame(state);
  }, [state]);

  // Journal local (#154) : seuls les coups le font évoluer, pas la sélection
  // d'une case. L'entrée naît au premier coup, avec le jeton de la
  // partie, qui servira à la rattacher à un compte (#155).
  // biome-ignore lint/correctness/useExhaustiveDependencies: state is read only for the fields listed in deps
  useEffect(() => {
    // Une partie reprise du serveur a été jouée sur un autre appareil : elle
    // n'entre pas dans le journal de celui-ci.
    if (adoptedRef.current) {
      adoptedRef.current = false;
      return;
    }
    // Le jeton ne sert qu'à rattacher une partie anonyme à un compte.
    const sync = syncRef.current;
    const token =
      sync?.date === state.date && sync.owner === "anon"
        ? sync.token
        : undefined;
    recordDailyGame(state, token);
  }, [state.date, state.cells, state.failed]);

  // Joueur connecté : la partie du compte au serveur fait foi. Tant qu'aucun
  // coup de cet appareil n'attend, une ligne différente de la partie affichée
  // la remplace, sans message (jouée ailleurs, ou partie locale écartée).
  const serverGame = useQuery(
    api.account.myGameForDate,
    account.status === "signedIn" && account.synced && state.date
      ? { date: state.date }
      : "skip",
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: state est lu pour la comparaison, la ligne du serveur déclenche
  useEffect(() => {
    if (!serverGame || !todayGrid || serverGame.date !== state.date) return;
    const sync = syncRef.current;
    if (sync && !isMoveSyncSettled(sync)) return;
    if (sameRecord(serverGame, recordOfState(state))) return;
    const persisted = persistedFromRecord(
      serverGame.date,
      serverGame,
      todayGrid.validAnswers,
    );
    updateSync(
      resumeAccountSync(
        serverGame.date,
        movesPlayed(persisted.cells, persisted.lives),
      ),
    );
    adoptedRef.current = true;
    dispatch({
      type: "rehydrate",
      persisted,
      rows: todayGrid.rows as ConstraintId[],
      cols: todayGrid.cols as ConstraintId[],
      validAnswers: todayGrid.validAnswers,
    });
  }, [serverGame, todayGrid]);

  // `game_completed` une seule fois par partie, même après rechargement : le
  // drapeau `endRecorded` est persisté avec la partie.
  // biome-ignore lint/correctness/useExhaustiveDependencies: posthog is stable; the payload derives from state fields already in deps
  useEffect(() => {
    if (!state.date || state.endRecorded) return;
    if (state.status !== "won" && state.status !== "lost") return;

    const filledCells = Object.values(state.cells).filter(
      (cell) => cell.status === "filled",
    ).length;
    // Le hook ne sert que la grille du jour : le régime est toujours limité.
    const remainingLives = livesRemaining(state.lives) ?? 0;
    const endReason =
      state.status === "won"
        ? "win"
        : remainingLives <= 0
          ? "lives"
          : "blocked";

    // Rareté et score de fin non inclus ici (dynamiques, dépendent de la
    // distribution) : captés par `result_screen_viewed`.
    posthog?.capture("game_completed", {
      outcome: state.status,
      end_reason: endReason,
      grid_date: state.date,
      filled_cells: filledCells,
      lives_left: remainingLives,
    });
    dispatch({ type: "setEndRecorded", date: state.date });
  }, [state.date, state.status, state.endRecorded, state.cells, state.lives]);

  const selectCell = useCallback((cell: CellPosition | null) => {
    dispatch({ type: "selectCell", cell });
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: posthog is a stable ref
  const submitGuess = useCallback(
    async (cell: CellPosition, countryCode: string) => {
      if (state.status !== "playing" || !todayGrid) return;

      // Le coup rejoint la file d'envoi avant d'être affiché. Une partie déjà
      // commencée sans file reste locale : son premier coup est perdu pour le
      // serveur, la suite ne s'enchaînerait pas.
      function queueMove(move: SyncedMove): void {
        const sync =
          syncRef.current ??
          (movesPlayed(state.cells, state.lives) === 0
            ? startMoveSync(
                state.date,
                account.status === "signedIn" ? "account" : "anon",
              )
            : null);
        if (!sync || sync.stopped) return;
        updateSync(appendMove(sync, move));
      }

      function failGuess(
        reason: GuessSubmitFailure["reason"],
      ): GuessSubmitFailure {
        const remaining = livesRemaining(state.lives) ?? 0;
        dispatch({ type: "guessFailure", cell });
        posthog?.capture("guess_failed", {
          reason,
          grid_date: state.date,
          cell: `${cell.row},${cell.col}`,
          lives_remaining: remaining - 1,
          country_code: countryCode,
        });
        return { kind: "domain_rejected", reason, gameOver: remaining === 1 };
      }

      const cellKey = toCellKey(cell);
      queueMove({ cellKey, countryCode });
      const local = evaluateGuess(
        state,
        cell,
        countryCode,
        todayGrid.validAnswers,
      );
      if (local.kind === "rejected") {
        const failure = failGuess(local.reason);
        void flushMoves();
        return failure;
      }
      // Local-first : `validAnswers` est l'autorité publiée, le serveur rejoue
      // le coup avec la même règle. La case se remplit tout de suite, sa
      // rareté arrive avec la répartition réactive.
      dispatch({
        type: "guessSuccess",
        cell,
        countryCode,
        validAnswers: todayGrid.validAnswers,
      });
      void flushMoves();
      return { kind: "accepted" } as const;
    },
    [state, todayGrid, flushMoves, account.status],
  );

  return {
    state,
    selectCell,
    submitGuess,
    isLoading: todayGrid === undefined,
    hasGrid: !!todayGrid,
    movesSettled,
    validAnswers: todayGrid?.validAnswers ?? {},
  };
}
