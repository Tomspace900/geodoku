import { describe, expect, it, vi } from "vitest";
import type { CellKey, GameState } from "../../types";
import { createInitialState } from "../reducer";
import {
  buildSharePayload,
  canUseNativeShare,
  formatShareString,
  shareGameResult,
} from "../share";

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
    // 5 vies, 0 cellules → (0 + 5) / 14 = 36 %, originalité = 0 → grade D.
    const state = makeState();
    const result = formatShareString(state, 1);
    expect(result).toContain("Geodoku #1\n36% · D");
    expect(result).not.toContain("❤️");
    expect(result).not.toContain("💀");
  });

  it("shows hearts matching remainingLives for a won state", () => {
    const state = makeState({ status: "won", remainingLives: 2 });
    const result = formatShareString(state, 42);
    expect(result).toContain("Geodoku #42");
    expect(result).toContain("❤️❤️🤍🤍🤍"); // 2 hearts + 3 white
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
    const result = formatShareString(state, 1, "https://geodoku.app");
    expect(result.endsWith("https://geodoku.app")).toBe(true);
  });

  it("omits issue number in title when gridNumber is null", () => {
    const state = makeState();
    const result = formatShareString(state, null);
    expect(result.startsWith("Geodoku\n")).toBe(true);
    expect(result).not.toContain("Geodoku #");
  });
});

describe("buildSharePayload", () => {
  it("splits title, text and url for native share", () => {
    const state = makeState({ status: "won", remainingLives: 3 });
    const payload = buildSharePayload(state, 5);
    expect(payload.title).toBe("Geodoku #5 ❤️❤️❤️🤍🤍");
    expect(payload.text).toContain("% · ");
    expect(payload.text).not.toContain("https://geodoku.app");
    expect(payload.url).toBe("https://geodoku.app");
  });

  it("reconstructs clipboard text from payload", () => {
    const state = makeState({ status: "won", remainingLives: 3 });
    const payload = buildSharePayload(state, 5);
    expect(`${payload.text}\n\n${payload.url}`).toBe(
      formatShareString(state, 5),
    );
  });
});

describe("canUseNativeShare", () => {
  it("returns false when navigator.share is missing", () => {
    vi.stubGlobal("navigator", {
      maxTouchPoints: 1,
      clipboard: { writeText: vi.fn() },
    });
    expect(canUseNativeShare()).toBe(false);
    vi.unstubAllGlobals();
  });

  it("returns true on a touch device that exposes navigator.share", () => {
    vi.stubGlobal("navigator", { share: vi.fn(), maxTouchPoints: 5 });
    expect(canUseNativeShare()).toBe(true);
    vi.unstubAllGlobals();
  });

  it("returns false on desktop even when navigator.share exists", () => {
    // Desktop = pas de pointeur tactile : Safari/Chrome exposent navigator.share
    // mais on garde le presse-papiers (maxTouchPoints 0, pointer fine en happy-dom).
    vi.stubGlobal("navigator", { share: vi.fn(), maxTouchPoints: 0 });
    expect(canUseNativeShare()).toBe(false);
    vi.unstubAllGlobals();
  });
});

describe("shareGameResult", () => {
  it("uses native share on a touch device", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      share,
      canShare: () => true,
      maxTouchPoints: 5,
      clipboard: { writeText: vi.fn() },
    });

    const outcome = await shareGameResult(makeState(), 1);
    expect(outcome).toBe("shared");
    expect(share).toHaveBeenCalledOnce();

    vi.unstubAllGlobals();
  });

  it("falls back to clipboard when native share is unavailable", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      maxTouchPoints: 1,
      clipboard: { writeText },
    });

    const outcome = await shareGameResult(makeState(), 1);
    expect(outcome).toBe("copied");
    expect(writeText).toHaveBeenCalledOnce();

    vi.unstubAllGlobals();
  });

  it("copies to clipboard on desktop instead of opening the share sheet", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      share,
      canShare: () => true,
      maxTouchPoints: 0,
      clipboard: { writeText },
    });

    const outcome = await shareGameResult(makeState(), 1);
    expect(outcome).toBe("copied");
    expect(share).not.toHaveBeenCalled();
    expect(writeText).toHaveBeenCalledOnce();

    vi.unstubAllGlobals();
  });

  it("returns cancelled when user dismisses native share sheet", async () => {
    const share = vi
      .fn()
      .mockRejectedValue(new DOMException("Abort", "AbortError"));
    vi.stubGlobal("navigator", {
      share,
      canShare: () => true,
      maxTouchPoints: 5,
      clipboard: { writeText: vi.fn() },
    });

    const outcome = await shareGameResult(makeState(), 1);
    expect(outcome).toBe("cancelled");

    vi.unstubAllGlobals();
  });
});
