import { beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "@/lib/storage";
import {
  clearPersistedGame,
  isPersistedForToday,
  loadPersistedGame,
  PERSISTENCE_STORAGE_KEY,
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
  it("writes the minimal version 3 payload", () => {
    const state = createInitialState(
      "daily",
      "2026-04-15",
      [...TEST_ROWS],
      [...TEST_COLS],
    );
    savePersistedGame(state);
    const loaded = loadPersistedGame();
    expect(loaded).not.toBeNull();
    expect(loaded?.date).toBe("2026-04-15");
    expect(loaded?.remainingLives).toBe(5);
    expect(loaded?.cells["0,0"].status).toBe("empty");
    expect(loaded?.endRecorded).toBe(false);
    expect(loaded?.rated).toBe(false);
    const raw = JSON.parse(localStorage.getItem(PERSISTENCE_STORAGE_KEY)!);
    expect(raw.version).toBe(3);
    expect(raw).not.toHaveProperty("usedCountries");
    expect(raw).not.toHaveProperty("status");
    expect(raw).not.toHaveProperty("startedAt");
    expect(raw).not.toHaveProperty("finishedAt");
  });

  it("round-trips the endRecorded / rated flags", () => {
    let state = createInitialState(
      "daily",
      "2026-04-15",
      [...TEST_ROWS],
      [...TEST_COLS],
    );
    state = gameReducer(state, { type: "setEndRecorded", date: state.date });
    state = gameReducer(state, { type: "setRated", date: state.date });
    savePersistedGame(state);
    const loaded = loadPersistedGame();
    expect(loaded?.endRecorded).toBe(true);
    expect(loaded?.rated).toBe(true);
  });

  it("persists filled cells without a duplicate used-countries cache", () => {
    let state = createInitialState(
      "daily",
      "2026-04-15",
      [...TEST_ROWS],
      [...TEST_COLS],
    );
    state = gameReducer(state, {
      type: "guessSuccess",
      cell: { row: 0, col: 0 },
      countryCode: "FRA",
      validAnswers: {
        "0,0": ["FRA"],
        "0,1": ["DEU"],
        "0,2": ["ESP"],
        "1,0": ["ITA"],
        "1,1": ["PRT"],
        "1,2": ["NLD"],
        "2,0": ["BEL"],
        "2,1": ["AUT"],
        "2,2": ["CHE"],
      },
    });
    savePersistedGame(state);

    const raw = JSON.parse(localStorage.getItem(PERSISTENCE_STORAGE_KEY)!);
    expect(raw.usedCountries).toBeUndefined();
    expect(raw.cells["0,0"]).toEqual({
      status: "filled",
      countryCode: "FRA",
    });

    const loaded = loadPersistedGame();
    expect(loaded?.cells["0,0"]).toEqual({
      status: "filled",
      countryCode: "FRA",
    });
  });

  it("serialises blocked cells and deserialises them", () => {
    const state = createInitialState(
      "daily",
      "2026-04-15",
      [...TEST_ROWS],
      [...TEST_COLS],
    );
    state.cells["0,0"] = { status: "blocked" };
    savePersistedGame(state);

    const loaded = loadPersistedGame();
    expect(loaded?.cells["0,0"].status).toBe("blocked");
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

  it("returns null for an unsupported version", () => {
    const state = createInitialState(
      "daily",
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

  // La v2 n'est plus lue depuis la sortie du rollout : une partie encore au
  // format v2 date d'avant le 15 juillet 2026, donc bien au-delà de la journée
  // en cours, et aurait de toute façon été écartée par la garde de date.
  it("ignores a leftover version 2 payload", () => {
    localStorage.setItem(
      STORAGE_KEYS.game,
      JSON.stringify({
        version: 2,
        date: "2026-04-15",
        cells: Object.fromEntries(
          ["0,0", "0,1", "0,2", "1,0", "1,1", "1,2", "2,0", "2,1", "2,2"].map(
            (key) => [key, { status: "empty" }],
          ),
        ),
        remainingLives: 5,
        usedCountries: [],
        status: "playing",
        startedAt: 1_700_000_000_000,
        finishedAt: null,
      }),
    );

    expect(loadPersistedGame()).toBeNull();
  });
});

describe("clearPersistedGame", () => {
  it("removes the entry from storage", () => {
    const state = createInitialState(
      "daily",
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
      "daily",
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
      "daily",
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
      "daily",
      "2026-04-15",
      [...TEST_ROWS],
      [...TEST_COLS],
    );
    expect(() => savePersistedGame(state)).not.toThrow();
    spy.mockRestore();
  });
});
