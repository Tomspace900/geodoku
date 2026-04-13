import { describe, expect, it } from "vitest";
import type { CellKey, GameState } from "../../types";
import { computeScore, formatRarityPercent, rarityToTier } from "../rarity";
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

describe("computeScore", () => {
  it("returns zero for an empty state", () => {
    const state = makeState();
    expect(computeScore(state)).toEqual({ raw: 0, percent: 0, filledCount: 0 });
  });

  it("returns raw=180, percent=44 for 9 common cells", () => {
    const state = makeState();
    const cells = { ...state.cells };
    for (let i = 0 as 0 | 1 | 2; i <= 2; i++)
      for (let j = 0 as 0 | 1 | 2; j <= 2; j++)
        cells[`${i},${j}` as CellKey] = {
          status: "filled",
          countryCode: `C${i}${j}`,
          rarity: 0.8,
          rarityTier: "common",
        };
    expect(computeScore({ ...state, cells })).toEqual({
      raw: 180,
      percent: 44,
      filledCount: 9,
    });
  });

  it("returns raw=405, percent=100 for 9 ultra cells", () => {
    const state = makeState();
    const cells = { ...state.cells };
    for (let i = 0 as 0 | 1 | 2; i <= 2; i++)
      for (let j = 0 as 0 | 1 | 2; j <= 2; j++)
        cells[`${i},${j}` as CellKey] = {
          status: "filled",
          countryCode: `C${i}${j}`,
          rarity: 0.05,
          rarityTier: "ultra",
        };
    expect(computeScore({ ...state, cells })).toEqual({
      raw: 405,
      percent: 100,
      filledCount: 9,
    });
  });

  it("returns raw=135, percent=33 for 3 ultra cells + 6 empty (abandoned)", () => {
    const state = makeState({ status: "lost" });
    const cells = { ...state.cells };
    // Fill only first 3 cells as ultra
    const toFill: CellKey[] = ["0,0", "0,1", "0,2"];
    for (const key of toFill)
      cells[key] = {
        status: "filled",
        countryCode: `C${key}`,
        rarity: 0.05,
        rarityTier: "ultra",
      };
    // 3 * 20 + 3 * 25 = 60 + 75 = 135; round(135/405*100) = 33
    expect(computeScore({ ...state, cells })).toEqual({
      raw: 135,
      percent: 33,
      filledCount: 3,
    });
  });
});
