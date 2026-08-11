import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPersistedGame,
  isPersistedForToday,
  loadPersistedGame,
  PERSISTENCE_STORAGE_KEY,
  PERSISTENCE_V2_STORAGE_KEY,
  savePersistedGame,
} from "../persistence";
import { createInitialState, gameReducer } from "../reducer";
import { sanitizePersistedForGrid } from "../sanitizePersisted";

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
const TEST_VALID_ANSWERS = {
  "0,0": ["FRA"],
  "0,1": ["DEU"],
  "0,2": ["ESP"],
  "1,0": ["ITA"],
  "1,1": ["PRT"],
  "1,2": ["NLD"],
  "2,0": ["BEL"],
  "2,1": ["AUT"],
  "2,2": ["CHE"],
};

beforeEach(() => {
  localStorage.clear();
});

type PreviousBundleGame = {
  version: 2;
  date: string;
  cells: Record<string, { status: string; countryCode?: string }>;
  remainingLives: number;
  usedCountries: string[];
  status: "playing" | "won" | "lost";
  startedAt: number;
  finishedAt: number | null;
  endRecorded?: boolean;
  rated?: boolean;
};

/** Contrat public exact du lecteur déployé avant la persistence v3. */
function loadLikePreviousBundle(): PreviousBundleGame | null {
  const raw = localStorage.getItem(PERSISTENCE_V2_STORAGE_KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw) as PreviousBundleGame;
  return parsed.version === 2 ? parsed : null;
}

function saveLikePreviousBundle(game: PreviousBundleGame): void {
  localStorage.setItem(
    PERSISTENCE_V2_STORAGE_KEY,
    JSON.stringify({
      version: 2,
      date: game.date,
      cells: game.cells,
      remainingLives: game.remainingLives,
      usedCountries: game.usedCountries,
      status: game.status,
      startedAt: game.startedAt,
      finishedAt: game.finishedAt,
      endRecorded: game.endRecorded,
      rated: game.rated,
    }),
  );
}

describe("savePersistedGame / loadPersistedGame", () => {
  it("keeps today's progress readable after rolling back to the previous bundle", () => {
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

    expect(loadLikePreviousBundle()).toMatchObject({
      version: 2,
      date: "2026-04-15",
      remainingLives: 5,
      usedCountries: ["FRA"],
      status: "playing",
      cells: { "0,0": { status: "filled", countryCode: "FRA" } },
    });
  });

  it("recovers progress made by the previous bundle when rolling forward again", () => {
    const state = createInitialState(
      "daily",
      "2026-04-15",
      [...TEST_ROWS],
      [...TEST_COLS],
    );
    savePersistedGame(state);

    const rolledBack = loadLikePreviousBundle()!;
    rolledBack.cells["0,0"] = { status: "filled", countryCode: "FRA" };
    rolledBack.usedCountries = ["FRA"];
    saveLikePreviousBundle(rolledBack);

    expect(loadPersistedGame()?.cells["0,0"]).toEqual({
      status: "filled",
      countryCode: "FRA",
    });
  });

  it("loads the newer rollback shadow when the v3 write fails", () => {
    let state = createInitialState(
      "daily",
      "2026-04-15",
      [...TEST_ROWS],
      [...TEST_COLS],
    );
    savePersistedGame(state);
    state = gameReducer(state, {
      type: "guessSuccess",
      cell: { row: 0, col: 0 },
      countryCode: "FRA",
      validAnswers: TEST_VALID_ANSWERS,
    });

    const originalSetItem = localStorage.setItem.bind(localStorage);
    const setItem = vi
      .spyOn(localStorage, "setItem")
      .mockImplementation((key, value) => {
        if (key === PERSISTENCE_STORAGE_KEY) {
          throw new Error("v3 write failed");
        }
        originalSetItem(key, value);
      });
    savePersistedGame(state);
    setItem.mockRestore();

    expect(loadPersistedGame()?.cells["0,0"]).toEqual({
      status: "filled",
      countryCode: "FRA",
    });
  });

  it("does not commit v3 when the rollback shadow cannot be written", () => {
    const state = createInitialState(
      "daily",
      "2026-04-15",
      [...TEST_ROWS],
      [...TEST_COLS],
    );
    const originalSetItem = localStorage.setItem.bind(localStorage);
    const setItem = vi
      .spyOn(localStorage, "setItem")
      .mockImplementation((key, value) => {
        if (key === PERSISTENCE_V2_STORAGE_KEY) {
          throw new Error("v2 shadow write failed");
        }
        originalSetItem(key, value);
      });

    savePersistedGame(state);
    setItem.mockRestore();

    expect(localStorage.getItem(PERSISTENCE_STORAGE_KEY)).toBeNull();
  });

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

  it("returns null when neither persisted representation has a supported version", () => {
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
    localStorage.setItem(PERSISTENCE_V2_STORAGE_KEY, JSON.stringify(raw));
    expect(loadPersistedGame()).toBeNull();
  });

  it("keeps accepting a version 2 payload for in-place migration", () => {
    localStorage.setItem(
      PERSISTENCE_V2_STORAGE_KEY,
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

    expect(loadPersistedGame()?.version).toBe(2);
  });

  it("promotes a version 2 game to minimal v3 without losing progress", () => {
    const legacyState = createInitialState(
      "daily",
      "2026-04-15",
      [...TEST_ROWS],
      [...TEST_COLS],
    );
    legacyState.cells["0,0"] = { status: "filled", countryCode: "FRA" };
    localStorage.setItem(
      PERSISTENCE_V2_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        date: legacyState.date,
        cells: legacyState.cells,
        remainingLives: 4,
        usedCountries: ["FRA"],
        status: "playing",
        startedAt: 1_700_000_000_000,
        finishedAt: null,
        endRecorded: false,
        rated: false,
      }),
    );

    const sanitized = sanitizePersistedForGrid(
      loadPersistedGame()!,
      TEST_VALID_ANSWERS,
    )!;
    const restored = gameReducer(legacyState, {
      type: "rehydrate",
      persisted: sanitized,
      rows: [...TEST_ROWS],
      cols: [...TEST_COLS],
      validAnswers: TEST_VALID_ANSWERS,
    });
    savePersistedGame(restored);

    expect(JSON.parse(localStorage.getItem(PERSISTENCE_STORAGE_KEY)!)).toEqual({
      version: 3,
      date: "2026-04-15",
      cells: restored.cells,
      remainingLives: 4,
      persistenceRevision: 1,
      endRecorded: false,
      rated: false,
    });
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
