import { describe, expect, it } from "vitest";
import type { CellKey, GameState, RarityTier } from "../../types";
import {
  computeGridScore,
  computeOriginalityScore,
  formatRarityPercent,
  originalityToGrade,
  rarityToTier,
} from "../rarity";
import { createInitialState } from "../reducer";

describe("rarityToTier", () => {
  it("returns common for rarity > 0.5", () => {
    expect(rarityToTier(0.8)).toBe("common");
  });

  it("returns common for rarity = 1", () => {
    expect(rarityToTier(1)).toBe("common");
  });

  it("returns uncommon for rarity in (0.25, 0.5]", () => {
    expect(rarityToTier(0.4)).toBe("uncommon");
  });

  it("returns rare for rarity in (0.10, 0.25]", () => {
    expect(rarityToTier(0.15)).toBe("rare");
  });

  it("returns ultra for rarity <= 0.10", () => {
    expect(rarityToTier(0.05)).toBe("ultra");
  });

  it("returns ultra for rarity = 0", () => {
    expect(rarityToTier(0)).toBe("ultra");
  });

  it("returns uncommon at the 0.25 boundary (not > uncommon threshold)", () => {
    // 0.25 is NOT > 0.25, so falls through to rare check: 0.25 > 0.10 → rare
    expect(rarityToTier(0.25)).toBe("rare");
  });
});

describe("formatRarityPercent", () => {
  it("returns <1% for 0", () => {
    expect(formatRarityPercent(0)).toBe("<1%");
  });

  it("returns <1% for very small values like 0.003", () => {
    expect(formatRarityPercent(0.003)).toBe("<1%");
  });

  it("returns 50% for 0.5", () => {
    expect(formatRarityPercent(0.5)).toBe("50%");
  });

  it("returns 100% for 1", () => {
    expect(formatRarityPercent(1)).toBe("100%");
  });
});

function makeState(overrides: Partial<GameState> = {}): GameState {
  return { ...createInitialState("2024-01-01", [], []), ...overrides };
}

const RARITY_VALUES: Record<RarityTier, number> = {
  common: 0.8,
  uncommon: 0.3,
  rare: 0.15,
  ultra: 0.05,
};

function fillAllCells(state: GameState, tier: RarityTier): GameState {
  const cells = { ...state.cells };
  for (let i = 0 as 0 | 1 | 2; i <= 2; i++) {
    for (let j = 0 as 0 | 1 | 2; j <= 2; j++) {
      cells[`${i},${j}` as CellKey] = {
        status: "filled",
        countryCode: `C${i}${j}`,
        rarity: RARITY_VALUES[tier],
        rarityTier: tier,
      };
    }
  }
  return { ...state, cells };
}

function fillCells(
  state: GameState,
  keys: CellKey[],
  tier: RarityTier,
): GameState {
  const cells = { ...state.cells };
  for (const key of keys) {
    cells[key] = {
      status: "filled",
      countryCode: key,
      rarity: RARITY_VALUES[tier],
      rarityTier: tier,
    };
  }
  return { ...state, cells };
}

describe("computeGridScore", () => {
  it("returns 0% for an empty state with 0 lives (game over, nothing found)", () => {
    const state = makeState({ remainingLives: 0 });
    expect(computeGridScore(state)).toEqual({
      percent: 0,
      filledCount: 0,
      livesLeft: 0,
    });
  });

  it("returns 100% for 9 filled cells + 5 lives (flawless win)", () => {
    const state = fillAllCells(makeState(), "ultra");
    expect(computeGridScore(state)).toEqual({
      percent: 100,
      filledCount: 9,
      livesLeft: 5,
    });
  });

  it("returns 64% for 9 filled cells + 0 lives", () => {
    const state = fillAllCells(makeState({ remainingLives: 0 }), "common");
    // (9 + 0) / 14 = 64.3 → 64 %
    expect(computeGridScore(state)).toEqual({
      percent: 64,
      filledCount: 9,
      livesLeft: 0,
    });
  });

  it("returns 21% for 3 filled + 0 lives (lost mid-game)", () => {
    const state = fillCells(
      makeState({ status: "lost", remainingLives: 0 }),
      ["0,0", "0,1", "0,2"],
      "uncommon",
    );
    // (3 + 0) / 14 = 21.4 → 21 %
    expect(computeGridScore(state)).toEqual({
      percent: 21,
      filledCount: 3,
      livesLeft: 0,
    });
  });

  it("rounds to nearest integer for non-integer percentages", () => {
    // 6 filled + 2 lives = 8 / 14 = 57.1 → 57 %
    const state = fillCells(
      makeState({ remainingLives: 2 }),
      ["0,0", "0,1", "0,2", "1,0", "1,1", "1,2"],
      "uncommon",
    );
    expect(computeGridScore(state)).toEqual({
      percent: 57,
      filledCount: 6,
      livesLeft: 2,
    });
  });
});

describe("computeOriginalityScore", () => {
  it("returns 0 / D for an empty grid", () => {
    expect(computeOriginalityScore(makeState())).toEqual({
      score: 0,
      grade: "D",
    });
  });

  it("returns 0 / D for 9 common cells", () => {
    expect(
      computeOriginalityScore(fillAllCells(makeState(), "common")),
    ).toEqual({
      score: 0,
      grade: "D",
    });
  });

  it("returns 40 / B for 9 uncommon cells", () => {
    expect(
      computeOriginalityScore(fillAllCells(makeState(), "uncommon")),
    ).toEqual({ score: 40, grade: "B" });
  });

  it("returns 70 / S for 9 rare cells", () => {
    expect(computeOriginalityScore(fillAllCells(makeState(), "rare"))).toEqual({
      score: 70,
      grade: "S",
    });
  });

  it("returns 100 / S for 9 ultra cells", () => {
    expect(computeOriginalityScore(fillAllCells(makeState(), "ultra"))).toEqual(
      {
        score: 100,
        grade: "S",
      },
    );
  });

  it("ignores empty cells — averages over filled only (3 ultras + 6 empty → 100 / S)", () => {
    const state = fillCells(makeState(), ["0,0", "0,1", "0,2"], "ultra");
    // Découplé de la complétion : 3 × 100 / 3 cases remplies = 100.
    expect(computeOriginalityScore(state)).toEqual({ score: 100, grade: "S" });
  });
});

describe("originalityToGrade", () => {
  it("returns S at 100", () => expect(originalityToGrade(100)).toBe("S"));
  it("returns S at 70 (boundary)", () =>
    expect(originalityToGrade(70)).toBe("S"));
  it("returns A at 69", () => expect(originalityToGrade(69)).toBe("A"));
  it("returns A at 50 (boundary)", () =>
    expect(originalityToGrade(50)).toBe("A"));
  it("returns B at 49", () => expect(originalityToGrade(49)).toBe("B"));
  it("returns B at 30 (boundary)", () =>
    expect(originalityToGrade(30)).toBe("B"));
  it("returns C at 29", () => expect(originalityToGrade(29)).toBe("C"));
  it("returns C at 12 (boundary)", () =>
    expect(originalityToGrade(12)).toBe("C"));
  it("returns D at 11", () => expect(originalityToGrade(11)).toBe("D"));
  it("returns D at 0", () => expect(originalityToGrade(0)).toBe("D"));
});
