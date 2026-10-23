import { describe, expect, it } from "vitest";
import { CELL_KEYS } from "@/features/game/logic/gridTopology";
import type { Cell, CellKey } from "@/features/game/types";
import { rowOutcome } from "../rowOutcome";
import type { PersistedTrainingGame } from "../trainingPersistence";

function game(
  status: "empty" | "blocked",
  overrides: Partial<PersistedTrainingGame> = {},
): PersistedTrainingGame {
  return {
    date: "2026-07-24",
    cells: Object.fromEntries(
      CELL_KEYS.map((key) => [key, { status }]),
    ) as Record<CellKey, Cell>,
    failedAttempts: 3,
    ...overrides,
  };
}

describe("rowOutcome", () => {
  it("signale à jouer une grille jamais ouverte", () => {
    expect(rowOutcome(undefined)).toEqual({ kind: "unfinished" });
  });

  it("signale à jouer une partie qui garde une case vide", () => {
    expect(rowOutcome(game("empty"))).toEqual({ kind: "unfinished" });
  });

  it("donne les essais d'une partie terminée", () => {
    expect(rowOutcome(game("blocked"))).toEqual({
      kind: "completed",
      attempts: 3,
    });
  });

  it("affiche l'abandon plutôt qu'un nombre d'essais", () => {
    expect(rowOutcome(game("empty", { givenUp: true }))).toEqual({
      kind: "givenUp",
    });
  });
});
