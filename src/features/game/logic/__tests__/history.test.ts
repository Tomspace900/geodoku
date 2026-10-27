import { beforeEach, describe, expect, it } from "vitest";
import type { GameState } from "../../types";
import {
  HISTORY_STORAGE_KEY,
  type HistoryEntry,
  historyEntryFromGame,
  loadHistory,
  recordDailyGame,
  sanitizeHistory,
  upsertHistoryEntry,
} from "../history";
import { createInitialState, gameReducer } from "../reducer";

const ROWS = [
  "continent_europe",
  "continent_asia",
  "continent_africa",
] as const;
const COLS = ["water_landlocked", "water_island", "borders_min_5"] as const;
const VALID_ANSWERS: Record<string, string[]> = {
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

function dailyGame(date = "2026-10-27"): GameState {
  return createInitialState("daily", date, [...ROWS], [...COLS]);
}

function entry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    date: "2026-10-27",
    cells: [null, null, null, null, null, null, null, null, null],
    failed: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    ...overrides,
  };
}

function storeOf(entries: unknown[]): unknown {
  return { version: 1, entries };
}

beforeEach(() => {
  localStorage.clear();
});

describe("historyEntryFromGame", () => {
  it("ne crée rien tant qu'aucun coup n'est joué", () => {
    expect(historyEntryFromGame(dailyGame())).toBeNull();
  });

  it("naît d'un premier coup raté", () => {
    const state = gameReducer(dailyGame(), {
      type: "guessFailure",
      cell: { row: 1, col: 1 },
    });
    expect(historyEntryFromGame(state)?.failed).toEqual([
      0, 0, 0, 0, 1, 0, 0, 0, 0,
    ]);
  });

  it("range les pays dans l'ordre row-major, cases bloquées et vides à null", () => {
    let state = gameReducer(dailyGame(), {
      type: "guessSuccess",
      cell: { row: 0, col: 2 },
      countryCode: "ESP",
      validAnswers: VALID_ANSWERS,
    });
    state = {
      ...state,
      cells: { ...state.cells, "2,2": { status: "blocked" } },
    };
    expect(historyEntryFromGame(state)?.cells).toEqual([
      null,
      null,
      "ESP",
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
  });

  it("porte la note une fois donnée, jamais de score ni de vies", () => {
    let state = gameReducer(dailyGame(), {
      type: "guessFailure",
      cell: { row: 0, col: 0 },
    });
    state = gameReducer(state, {
      type: "setRated",
      date: state.date,
      rating: "too_hard",
    });
    expect(historyEntryFromGame(state)).toEqual({
      date: "2026-10-27",
      cells: [null, null, null, null, null, null, null, null, null],
      failed: [1, 0, 0, 0, 0, 0, 0, 0, 0],
      rating: "too_hard",
    });
  });
});

describe("upsertHistoryEntry", () => {
  it("remplace l'entrée du même jour et trie par date", () => {
    const entries = [
      entry({ date: "2026-10-27" }),
      entry({ date: "2026-10-25" }),
    ];
    const updated = upsertHistoryEntry(
      entries,
      entry({ date: "2026-10-27", failed: [2, 0, 0, 0, 0, 0, 0, 0, 0] }),
    );
    expect(updated.map((e) => e.date)).toEqual(["2026-10-25", "2026-10-27"]);
    expect(updated[1].failed[0]).toBe(2);
  });
});

describe("sanitizeHistory", () => {
  it("garde les entrées valides et écarte les autres une à une", () => {
    const valid = entry({
      cells: ["FRA", null, null, null, null, null, null, null, null],
    });
    const out = sanitizeHistory(
      storeOf([
        valid,
        entry({ date: "27/10/2026" }),
        entry({
          cells: ["FRA", "FRA", null, null, null, null, null, null, null],
        }),
        entry({
          cells: ["france", null, null, null, null, null, null, null, null],
        }),
        entry({ cells: [null, null] }),
        entry({ failed: [-1, 0, 0, 0, 0, 0, 0, 0, 0] }),
        entry({ failed: [0.5, 0, 0, 0, 0, 0, 0, 0, 0] }),
        null,
        "2026-10-27",
      ]),
    );
    expect(out).toEqual([valid]);
  });

  it("ne garde d'une note illisible que la partie", () => {
    const out = sanitizeHistory(
      storeOf([{ ...entry(), rating: "trop_facile" }]),
    );
    expect(out).toEqual([entry()]);
  });

  it("garde la dernière occurrence d'une date en double", () => {
    const later = entry({ failed: [3, 0, 0, 0, 0, 0, 0, 0, 0] });
    expect(sanitizeHistory(storeOf([entry(), later]))).toEqual([later]);
  });

  it("ignore une version inconnue ou une forme inattendue", () => {
    expect(sanitizeHistory({ version: 2, entries: [entry()] })).toEqual([]);
    expect(sanitizeHistory([entry()])).toEqual([]);
    expect(sanitizeHistory(null)).toEqual([]);
  });
});

describe("recordDailyGame / loadHistory", () => {
  it("crée l'entrée au premier coup puis la met à jour à chaque coup", () => {
    let state = dailyGame();
    recordDailyGame(state);
    expect(loadHistory()).toEqual([]);

    state = gameReducer(state, {
      type: "guessFailure",
      cell: { row: 0, col: 0 },
    });
    recordDailyGame(state);
    expect(loadHistory()).toHaveLength(1);

    state = gameReducer(state, {
      type: "guessSuccess",
      cell: { row: 0, col: 0 },
      countryCode: "FRA",
      validAnswers: VALID_ANSWERS,
    });
    recordDailyGame(state);
    expect(loadHistory()).toEqual([
      entry({
        cells: ["FRA", null, null, null, null, null, null, null, null],
        failed: [1, 0, 0, 0, 0, 0, 0, 0, 0],
      }),
    ]);
  });

  it("garde les jours précédents", () => {
    const yesterday = gameReducer(dailyGame("2026-10-26"), {
      type: "guessFailure",
      cell: { row: 0, col: 0 },
    });
    recordDailyGame(yesterday);
    recordDailyGame(
      gameReducer(dailyGame(), {
        type: "guessFailure",
        cell: { row: 0, col: 0 },
      }),
    );
    expect(loadHistory().map((e) => e.date)).toEqual([
      "2026-10-26",
      "2026-10-27",
    ]);
  });

  it("n'enregistre jamais une partie d'entraînement", () => {
    const training = gameReducer(
      createInitialState("training", "2026-10-20", [...ROWS], [...COLS]),
      { type: "guessFailure", cell: { row: 0, col: 0 } },
    );
    recordDailyGame(training);
    expect(localStorage.getItem(HISTORY_STORAGE_KEY)).toBeNull();
  });

  it("repart d'un journal vide quand le stockage est illisible", () => {
    localStorage.setItem(HISTORY_STORAGE_KEY, "{not json");
    expect(loadHistory()).toEqual([]);
    recordDailyGame(
      gameReducer(dailyGame(), {
        type: "guessFailure",
        cell: { row: 0, col: 0 },
      }),
    );
    expect(loadHistory()).toHaveLength(1);
  });
});
