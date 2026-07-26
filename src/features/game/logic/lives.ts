import type { GameModeId, LivesState } from "../types";
import { STARTING_LIVES } from "./constants";

/**
 * Seul module qui switche sur `LivesState`. Le reducer, le score, la
 * persistance et les composants passent par ces helpers : la règle « le daily
 * perd des vies, l'entraînement compte des essais » n'est écrite qu'ici.
 */

export function initialLives(mode: GameModeId): LivesState {
  return mode === "daily"
    ? { kind: "limited", remaining: STARTING_LIVES }
    : { kind: "unlimited", failedAttempts: 0 };
}

export function afterFailedAttempt(lives: LivesState): LivesState {
  return lives.kind === "limited"
    ? { kind: "limited", remaining: lives.remaining - 1 }
    : { kind: "unlimited", failedAttempts: lives.failedAttempts + 1 };
}

/** Vrai seulement en régime limité : un entraînement ne se perd jamais par les essais. */
export function isOutOfLives(lives: LivesState): boolean {
  return lives.kind === "limited" && lives.remaining <= 0;
}

/** Nombre de coups ratés, quel que soit le régime. */
export function failedAttemptCount(lives: LivesState): number {
  return lives.kind === "limited"
    ? STARTING_LIVES - lives.remaining
    : lives.failedAttempts;
}

/** Vies restantes, ou `null` quand la notion n'a pas de sens (entraînement). */
export function livesRemaining(lives: LivesState): number | null {
  return lives.kind === "limited" ? lives.remaining : null;
}

/**
 * Part « vies » du score. En entraînement elle est neutralisée (0 point sur une
 * capacité de 0) : le total plafonne alors à grille + rareté, soit 900.
 */
export function scoreLives(lives: LivesState): number {
  return lives.kind === "limited" ? lives.remaining : 0;
}

export function livesCapacity(lives: LivesState): number {
  return lives.kind === "limited" ? STARTING_LIVES : 0;
}
