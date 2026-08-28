import { describe, expect, it, vi } from "vitest";
import type {
  CellGuessDistribution,
  CellKey,
  GameState,
  RarityTier,
} from "../../types";
import { createInitialState } from "../reducer";
import {
  canUseNativeShare,
  formatShareString,
  shareGameResult,
} from "../share";

function makeState(overrides: Partial<GameState> = {}): GameState {
  return { ...createInitialState("daily", "2024-01-01", [], []), ...overrides };
}

// Parts brutes du jour choisies pour tomber directement dans chaque tier
// (rarityToTier : > 0,5 common · > 0,25 uncommon · > 0,1 rare · sinon ultra).
const SHARE_BY_TIER: Record<RarityTier, number> = {
  common: 0.8, // > 0,5 → common
  uncommon: 0.4, // 0,25–0,5 → uncommon
  rare: 0.15, // 0,1–0,25 → rare
  ultra: 0.05, // ≤ 0,1 → ultra
};

type Fill = { key: CellKey; tier: RarityTier };

/** Remplit des cases (countryCode = clé) et bâtit la distribution assortie. */
function applyFills(
  state: GameState,
  fills: Fill[],
): { state: GameState; distribution: Record<string, CellGuessDistribution> } {
  const cells = { ...state.cells };
  const distribution: Record<string, CellGuessDistribution> = {};
  for (const { key, tier } of fills) {
    cells[key] = { status: "filled", countryCode: key };
    distribution[key] = {
      totalGuesses: 10,
      rarityByCountry: { [key]: SHARE_BY_TIER[tier] },
    };
  }
  return { state: { ...state, cells }, distribution };
}

describe("formatShareString", () => {
  it("shows the total in points but no hearts/skull for a partial (playing) state", () => {
    // 5 vies, 0 case → grille 0 + rareté 0 + vies 5 × 20 = 100 pts.
    const state = makeState();
    const result = formatShareString(state, 1, undefined);
    expect(result).toContain("Geodoku #1\n100 pts");
    expect(result).not.toContain("❤️");
    expect(result).not.toContain("💀");
  });

  it("shows hearts matching remainingLives for a won state", () => {
    const state = makeState({
      status: "won",
      lives: { kind: "limited", remaining: 2 },
    });
    const result = formatShareString(state, 42, undefined);
    expect(result).toContain("Geodoku #42");
    expect(result).toContain("❤️❤️🤍🤍🤍"); // 2 hearts + 3 white
  });

  it("shows skull for a lost state", () => {
    const state = makeState({
      status: "lost",
      lives: { kind: "limited", remaining: 0 },
    });
    const result = formatShareString(state, 7, undefined);
    expect(result).toContain("💀");
    expect(result).not.toContain("❤️");
  });

  it("uses correct emoji per rarity tier", () => {
    const { state, distribution } = applyFills(
      makeState({ status: "won", lives: { kind: "limited", remaining: 3 } }),
      [
        { key: "0,0", tier: "common" },
        { key: "0,1", tier: "uncommon" },
        { key: "0,2", tier: "rare" },
        { key: "1,0", tier: "ultra" },
      ],
    );

    const result = formatShareString(state, 1, distribution);
    // Header occupe deux lignes (titre + cœurs, score + carré), puis ligne vide,
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
    const result = formatShareString(
      state,
      1,
      undefined,
      "https://geodoku.app",
    );
    expect(result.endsWith("https://geodoku.app")).toBe(true);
  });

  it("omits issue number in title when gridNumber is null", () => {
    const state = makeState();
    const result = formatShareString(state, null, undefined);
    expect(result.startsWith("Geodoku\n")).toBe(true);
    expect(result).not.toContain("Geodoku #");
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

    const outcome = await shareGameResult(makeState(), 1, undefined);
    expect(outcome).toBe("shared");
    expect(share).toHaveBeenCalledOnce();

    vi.unstubAllGlobals();
  });

  // Régression : un payload éclaté `{title, text, url}` laissait l'app réceptrice
  // (Messages, WhatsApp, Mail…) n'emporter que le lien — score et emojis perdus.
  // Un seul item ⇒ plus rien à jeter.
  it("shares a single text field, never a separate title or url", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      share,
      maxTouchPoints: 5,
      clipboard: { writeText: vi.fn() },
    });

    const state = makeState({
      status: "won",
      lives: { kind: "limited", remaining: 3 },
    });
    await shareGameResult(state, 5, undefined);

    const shared = share.mock.calls[0][0];
    expect(Object.keys(shared)).toEqual(["text"]);
    expect(shared.text).toBe(formatShareString(state, 5, undefined));
    expect(shared.text).toContain("https://geodoku.app");
    expect(shared.text).toContain("60 pts"); // 3 vies × 20, grille/rareté 0

    vi.unstubAllGlobals();
  });

  it("shares and copies the exact same string", async () => {
    const state = makeState({
      status: "won",
      lives: { kind: "limited", remaining: 3 },
    });
    const expected = formatShareString(state, 5, undefined);

    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share, maxTouchPoints: 5 });
    await shareGameResult(state, 5, undefined);
    vi.unstubAllGlobals();

    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { maxTouchPoints: 0, clipboard: { writeText } });
    await shareGameResult(state, 5, undefined);
    vi.unstubAllGlobals();

    expect(share.mock.calls[0][0].text).toBe(expected);
    expect(writeText).toHaveBeenCalledWith(expected);
  });

  it("reports failure when the clipboard is unavailable", async () => {
    vi.stubGlobal("navigator", {
      maxTouchPoints: 0,
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });

    expect(await shareGameResult(makeState(), 1, undefined)).toBe("failed");

    vi.unstubAllGlobals();
  });

  it("falls back to clipboard when native share is unavailable", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      maxTouchPoints: 1,
      clipboard: { writeText },
    });

    const outcome = await shareGameResult(makeState(), 1, undefined);
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

    const outcome = await shareGameResult(makeState(), 1, undefined);
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

    const outcome = await shareGameResult(makeState(), 1, undefined);
    expect(outcome).toBe("cancelled");

    vi.unstubAllGlobals();
  });
});
