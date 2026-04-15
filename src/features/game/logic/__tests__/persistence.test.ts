import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  PERSISTENCE_STORAGE_KEY,
  clearPersistedGame,
  isPersistedForToday,
  loadPersistedGame,
  savePersistedGame,
} from "../persistence";
import { createInitialState, gameReducer } from "../reducer";

const TEST_ROWS = [
  "continent_europe",
  "continent_asia",
  "continent_africa",
] as const;
const TEST_COLS = [
  "water_landlocked",
  "water_island",
  "borders_min_5",
] as const;

beforeEach(() => {
  localStorage.clear();
});

describe("savePersistedGame / loadPersistedGame", () => {
  it("round-trip preserves all persisted fields", () => {
    const state = createInitialState(
      "2026-04-15",
      [...TEST_ROWS],
      [...TEST_COLS],
    );
    savePersistedGame(state);
    const loaded = loadPersistedGame();
    expect(loaded).not.toBeNull();
    expect(loaded?.date).toBe("2026-04-15");
    expect(loaded?.remainingLives).toBe(3);
    expect(loaded?.status).toBe("playing");
    expect(loaded?.finishedAt).toBeNull();
    expect(loaded?.cells["0,0"].status).toBe("empty");
  });

  it("serialises usedCountries Set as array and deserialises it", () => {
    let state = createInitialState(
      "2026-04-15",
      [...TEST_ROWS],
      [...TEST_COLS],
    );
    state = gameReducer(state, {
      type: "guessSuccess",
      cell: { row: 0, col: 0 },
      countryCode: "FRA",
      rarity: 0.4,
    });
    savePersistedGame(state);

    const raw = JSON.parse(localStorage.getItem(PERSISTENCE_STORAGE_KEY)!);
    expect(Array.isArray(raw.usedCountries)).toBe(true);
    expect(raw.usedCountries).toContain("FRA");

    const loaded = loadPersistedGame();
    expect(Array.isArray(loaded?.usedCountries)).toBe(true);
    expect(loaded?.usedCountries).toContain("FRA");
  });
});

describe("loadPersistedGame", () => {
  it("returns null when storage is empty", () => {
    expect(loadPersistedGame()).toBeNull();
  });

  it("returns null when JSON is corrupted", () => {
    localStorage.setItem(PERSISTENCE_STORAGE_KEY, "{invalid json}");
    expect(loadPersistedGame()).toBeNull();
  });

  it("returns null when version does not match", () => {
    const state = createInitialState(
      "2026-04-15",
      [...TEST_ROWS],
      [...TEST_COLS],
    );
    savePersistedGame(state);
    const raw = JSON.parse(localStorage.getItem(PERSISTENCE_STORAGE_KEY)!);
    raw.version = 99;
    localStorage.setItem(PERSISTENCE_STORAGE_KEY, JSON.stringify(raw));
    expect(loadPersistedGame()).toBeNull();
  });
});

describe("clearPersistedGame", () => {
  it("removes the entry from storage", () => {
    const state = createInitialState(
      "2026-04-15",
      [...TEST_ROWS],
      [...TEST_COLS],
    );
    savePersistedGame(state);
    expect(loadPersistedGame()).not.toBeNull();
    clearPersistedGame();
    expect(loadPersistedGame()).toBeNull();
  });
});

describe("isPersistedForToday", () => {
  it("returns true when dates match", () => {
    const state = createInitialState(
      "2026-04-15",
      [...TEST_ROWS],
      [...TEST_COLS],
    );
    savePersistedGame(state);
    const persisted = loadPersistedGame()!;
    expect(isPersistedForToday(persisted, "2026-04-15")).toBe(true);
  });

  it("returns false when dates differ", () => {
    const state = createInitialState(
      "2026-04-14",
      [...TEST_ROWS],
      [...TEST_COLS],
    );
    savePersistedGame(state);
    const persisted = loadPersistedGame()!;
    expect(isPersistedForToday(persisted, "2026-04-15")).toBe(false);
  });
});

describe("savePersistedGame — resilience", () => {
  it("does not throw when localStorage throws", () => {
    const spy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });
    const state = createInitialState(
      "2026-04-15",
      [...TEST_ROWS],
      [...TEST_COLS],
    );
    expect(() => savePersistedGame(state)).not.toThrow();
    spy.mockRestore();
  });
});
