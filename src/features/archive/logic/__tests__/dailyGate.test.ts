import { CELL_KEYS } from "@/features/game/logic/gridTopology";
import type { PersistedGame } from "@/features/game/logic/persistence";
import type { Cell, CellKey } from "@/features/game/types";
import { describe, expect, it } from "vitest";
import { isDailyGameFinished } from "../dailyGate";

const TODAY = "2026-07-25";

function cells(filled: number, blocked = 0): Record<CellKey, Cell> {
  const out = {} as Record<CellKey, Cell>;
  CELL_KEYS.forEach((key, index) => {
    if (index < filled) out[key] = { status: "filled", countryCode: "FRA" };
    else if (index < filled + blocked) out[key] = { status: "blocked" };
    else out[key] = { status: "empty" };
  });
  return out;
}

function persisted(overrides: Partial<PersistedGame> = {}): PersistedGame {
  return {
    version: 3,
    date: TODAY,
    cells: cells(2),
    remainingLives: 3,
    ...overrides,
  };
}

describe("isDailyGameFinished", () => {
  it("reste fermé quand la partie du jour est en cours", () => {
    expect(isDailyGameFinished(persisted(), TODAY)).toBe(false);
  });

  it("reste fermé quand rien n'est persisté", () => {
    expect(isDailyGameFinished(null, TODAY)).toBe(false);
  });

  it("reste fermé quand la partie persistée est celle d'un autre jour", () => {
    expect(isDailyGameFinished(persisted({ date: "2026-07-24" }), TODAY)).toBe(
      false,
    );
  });

  it("ouvre après une victoire (grille pleine)", () => {
    const game = persisted({ cells: cells(9), remainingLives: 2 });
    expect(isDailyGameFinished(game, TODAY)).toBe(true);
  });

  it("ouvre après une défaite par vies épuisées", () => {
    expect(isDailyGameFinished(persisted({ remainingLives: 0 }), TODAY)).toBe(
      true,
    );
  });

  // Défaite par blocage : plus aucune case vide, mais la grille n'est pas pleine.
  it("ouvre après une défaite par blocage, vies restantes à l'appui", () => {
    const game = persisted({ cells: cells(4, 5), remainingLives: 3 });
    expect(isDailyGameFinished(game, TODAY)).toBe(true);
  });

  it("reste fermé sur des cellules corrompues plutôt que de deviner", () => {
    const game = persisted();
    // biome-ignore lint/suspicious/noExplicitAny: simulation d'un payload corrompu
    (game.cells as any)["1,1"] = "nope";
    expect(isDailyGameFinished(game, TODAY)).toBe(false);
  });
});
