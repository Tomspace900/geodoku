import { describe, expect, it } from "vitest";
import type { LivesState } from "../../types";
import { STARTING_LIVES } from "../constants";
import {
  afterFailedAttempt,
  failedAttemptCount,
  initialLives,
  isOutOfLives,
  livesCapacity,
  livesRemaining,
  scoreLives,
} from "../lives";

const limited = (remaining: number): LivesState => ({
  kind: "limited",
  remaining,
});
const unlimited = (failedAttempts: number): LivesState => ({
  kind: "unlimited",
  failedAttempts,
});

describe("initialLives", () => {
  it("donne 5 vies à la grille du jour", () => {
    expect(initialLives("daily")).toEqual(limited(STARTING_LIVES));
  });

  it("démarre l'entraînement à zéro essai raté", () => {
    expect(initialLives("training")).toEqual(unlimited(0));
  });
});

describe("afterFailedAttempt", () => {
  it("retire une vie en régime limité", () => {
    expect(afterFailedAttempt(limited(3))).toEqual(limited(2));
  });

  it("compte un essai de plus en entraînement, sans plafond", () => {
    expect(afterFailedAttempt(unlimited(42))).toEqual(unlimited(43));
  });
});

describe("isOutOfLives", () => {
  it("est vrai quand les vies sont épuisées", () => {
    expect(isOutOfLives(limited(0))).toBe(true);
  });

  it("reste faux tant qu'il reste une vie", () => {
    expect(isOutOfLives(limited(1))).toBe(false);
  });

  it("est toujours faux en entraînement, même après de nombreux essais", () => {
    expect(isOutOfLives(unlimited(99))).toBe(false);
  });
});

describe("failedAttemptCount", () => {
  it("déduit les échecs des vies consommées en régime limité", () => {
    expect(failedAttemptCount(limited(2))).toBe(STARTING_LIVES - 2);
  });

  it("lit directement le compteur en entraînement", () => {
    expect(failedAttemptCount(unlimited(7))).toBe(7);
  });
});

describe("livesRemaining", () => {
  it("renvoie les vies restantes en régime limité", () => {
    expect(livesRemaining(limited(4))).toBe(4);
  });

  it("renvoie null en entraînement : la notion n'existe pas", () => {
    expect(livesRemaining(unlimited(3))).toBeNull();
  });
});

describe("scoreLives / livesCapacity — échelle du score", () => {
  it("le daily marque ses vies sur une capacité de 5", () => {
    expect(scoreLives(limited(3))).toBe(3);
    expect(livesCapacity(limited(3))).toBe(STARTING_LIVES);
  });

  it("l'entraînement neutralise la part vies (0 sur une capacité de 0)", () => {
    expect(scoreLives(unlimited(3))).toBe(0);
    expect(livesCapacity(unlimited(3))).toBe(0);
  });
});
