import { describe, expect, it } from "vitest";
import type { CellKey, GameState } from "../../types";
import { createInitialState } from "../reducer";
import { formatShareString } from "../share";

function makeState(overrides: Partial<GameState> = {}): GameState {
  return { ...createInitialState("2024-01-01", [], []), ...overrides };
}

function fillCell(
  state: GameState,
  key: CellKey,
  tier: "common" | "uncommon" | "rare" | "ultra",
): GameState {
  const rarity =
    tier === "common"
      ? 0.8
      : tier === "uncommon"
        ? 0.3
        : tier === "rare"
          ? 0.15
          : 0.05;
  return {
    ...state,
    cells: {
      ...state.cells,
      [key]: { status: "filled", countryCode: key, rarity, rarityTier: tier },
    },
  };
}

describe("formatShareString", () => {
  it("shows percent + grade but no hearts/skull for a partial (playing) state", () => {
    // 3 vies, 0 cellules → (0 + 3) / 12 = 25 %, originalité = 0 → grade D.
    const state = makeState();
    const result = formatShareString(state, 1);
    expect(result).toContain("Geodoku #1\n25% · D");
    expect(result).not.toContain("❤️");
    expect(result).not.toContain("💀");
  });

  it("shows hearts matching remainingLives for a won state", () => {
    const state = makeState({ status: "won", remainingLives: 2 });
    const result = formatShareString(state, 42);
    expect(result).toContain("Geodoku #42");
    expect(result).toContain("❤️❤️🤍"); // 2 hearts + 1 white
  });

  it("shows skull for a lost state", () => {
    const state = makeState({ status: "lost", remainingLives: 0 });
    const result = formatShareString(state, 7);
    expect(result).toContain("💀");
    expect(result).not.toContain("❤️");
  });

  it("uses correct emoji per rarity tier", () => {
    let state = makeState({ status: "won", remainingLives: 3 });
    state = fillCell(state, "0,0", "common");
    state = fillCell(state, "0,1", "uncommon");
    state = fillCell(state, "0,2", "rare");
    state = fillCell(state, "1,0", "ultra");

    const result = formatShareString(state, 1);
    // Header occupe deux lignes (titre + cœurs, score · grade), puis ligne vide,
    // puis les 3 rows d'emojis. Donc rows à lines[3..5].
    // Row 0: common uncommon rare → 🟪🟦🟨
    // Row 1: ultra empty empty  → 🟥⬜⬜
    // Row 2: empty empty empty  → ⬜⬜⬜
    const lines = result.split("\n");
    expect(lines[3]).toBe("🟪🟦🟨");
    expect(lines[4]).toBe("🟥⬜⬜");
    expect(lines[5]).toBe("⬜⬜⬜");
  });

  it("includes site URL at the end", () => {
    const state = makeState();
    const result = formatShareString(state, 1, "geodoku.app");
    expect(result.endsWith("geodoku.app")).toBe(true);
  });

  it("omits issue number in title when gridNumber is null", () => {
    const state = makeState();
    const result = formatShareString(state, null);
    expect(result.startsWith("Geodoku\n")).toBe(true);
    expect(result).not.toContain("Geodoku #");
  });
});
