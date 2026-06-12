import { describe, expect, it } from "vitest";
import type { CellKey, GameState } from "../../types";
import type { PersistedGame } from "../persistence";
import { createInitialState, gameReducer } from "../reducer";

function freshState(): GameState {
  return createInitialState(
    "2024-01-01",
    ["continent_europe", "continent_asia", "continent_africa"],
    ["water_landlocked", "water_island", "borders_min_5"],
  );
}

const emptyValidAnswers: Record<string, string[]> = {
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

describe("createInitialState", () => {
  it("creates 9 empty cells", () => {
    const state = freshState();
    const keys = Object.keys(state.cells) as CellKey[];
    expect(keys).toHaveLength(9);
    for (const key of keys) {
      expect(state.cells[key].status).toBe("empty");
    }
  });

  it("starts with 5 lives", () => {
    expect(freshState().remainingLives).toBe(5);
  });

  it("starts with status playing", () => {
    expect(freshState().status).toBe("playing");
  });

  it("starts with no selected cell and no used countries", () => {
    const state = freshState();
    expect(state.selectedCell).toBeNull();
    expect(state.usedCountries.size).toBe(0);
  });
});

describe("gameReducer — selectCell", () => {
  it("sets the selected cell when playing", () => {
    const state = gameReducer(freshState(), {
      type: "selectCell",
      cell: { row: 1, col: 2 },
    });
    expect(state.selectedCell).toEqual({ row: 1, col: 2 });
  });

  it("clears the selected cell with null", () => {
    const s1 = gameReducer(freshState(), {
      type: "selectCell",
      cell: { row: 0, col: 0 },
    });
    const s2 = gameReducer(s1, { type: "selectCell", cell: null });
    expect(s2.selectedCell).toBeNull();
  });
});

describe("gameReducer — guessSuccess", () => {
  it("fills the cell and adds to usedCountries", () => {
    const state = gameReducer(freshState(), {
      type: "guessSuccess",
      cell: { row: 0, col: 0 },
      countryCode: "FRA",
      rarity: 0.6,
      validAnswers: emptyValidAnswers,
    });
    expect(state.cells["0,0"].status).toBe("filled");
    expect(state.usedCountries.has("FRA")).toBe(true);
  });

  it("resets selectedCell to null after success", () => {
    const s1 = gameReducer(freshState(), {
      type: "selectCell",
      cell: { row: 0, col: 0 },
    });
    const s2 = gameReducer(s1, {
      type: "guessSuccess",
      cell: { row: 0, col: 0 },
      countryCode: "FRA",
      rarity: 0.6,
      validAnswers: emptyValidAnswers,
    });
    expect(s2.selectedCell).toBeNull();
  });

  it("does NOT decrement lives on success", () => {
    const state = gameReducer(freshState(), {
      type: "guessSuccess",
      cell: { row: 0, col: 0 },
      countryCode: "FRA",
      rarity: 0.6,
      validAnswers: emptyValidAnswers,
    });
    expect(state.remainingLives).toBe(5);
  });

  it("transitions to won when all 9 cells are filled", () => {
    let state = freshState();
    const positions: Array<[0 | 1 | 2, 0 | 1 | 2]> = [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2],
    ];
    const codes = [
      "FRA",
      "DEU",
      "ESP",
      "ITA",
      "PRT",
      "NLD",
      "BEL",
      "AUT",
      "CHE",
    ];
    for (let i = 0; i < 9; i++) {
      const [row, col] = positions[i];
      state = gameReducer(state, {
        type: "guessSuccess",
        cell: { row, col },
        countryCode: codes[i],
        rarity: 0.5,
        validAnswers: emptyValidAnswers,
      });
    }
    expect(state.status).toBe("won");
    expect(state.finishedAt).not.toBeNull();
  });

  it("is ignored when state is won", () => {
    let state = freshState();
    const positions: Array<[0 | 1 | 2, 0 | 1 | 2]> = [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2],
    ];
    const codes = [
      "FRA",
      "DEU",
      "ESP",
      "ITA",
      "PRT",
      "NLD",
      "BEL",
      "AUT",
      "CHE",
    ];
    for (let i = 0; i < 9; i++) {
      const [row, col] = positions[i];
      state = gameReducer(state, {
        type: "guessSuccess",
        cell: { row, col },
        countryCode: codes[i],
        rarity: 0.5,
        validAnswers: emptyValidAnswers,
      });
    }
    expect(state.status).toBe("won");

    const stateAfter = gameReducer(state, {
      type: "guessSuccess",
      cell: { row: 0, col: 0 },
      countryCode: "USA",
      rarity: 0.5,
      validAnswers: emptyValidAnswers,
    });
    expect(stateAfter).toBe(state); // same reference
  });

  it("marks an empty cell as blocked when its valid answers are exhausted, status stays playing", () => {
    const validAnswers = {
      "0,0": ["FRA"],
      "0,1": ["DEU"],
      "0,2": ["FRA", "DEU"],
      "1,0": ["ITA"],
      "1,1": ["PRT"],
      "1,2": ["NLD"],
      "2,0": ["BEL"],
      "2,1": ["AUT"],
      "2,2": ["CHE"],
    };
    let state = gameReducer(freshState(), {
      type: "guessSuccess",
      cell: { row: 0, col: 0 },
      countryCode: "FRA",
      rarity: 0.5,
      validAnswers,
    });
    state = gameReducer(state, {
      type: "guessSuccess",
      cell: { row: 0, col: 1 },
      countryCode: "DEU",
      rarity: 0.5,
      validAnswers,
    });
    expect(state.status).toBe("playing");
    expect(state.cells["0,2"].status).toBe("blocked");
    expect(state.remainingLives).toBe(5);
    expect(state.finishedAt).toBeNull();
  });

  it("transitions to lost when all remaining empty cells become blocked", () => {
    const validAnswers = {
      "0,0": ["FRA"],
      "0,1": ["DEU"],
      "0,2": ["FRA", "DEU"],
      "1,0": ["FRA"],
      "1,1": ["DEU"],
      "1,2": ["FRA", "DEU"],
      "2,0": ["FRA"],
      "2,1": ["DEU"],
      "2,2": ["FRA", "DEU"],
    };
    let state = gameReducer(freshState(), {
      type: "guessSuccess",
      cell: { row: 0, col: 0 },
      countryCode: "FRA",
      rarity: 0.5,
      validAnswers,
    });
    state = gameReducer(state, {
      type: "guessSuccess",
      cell: { row: 0, col: 1 },
      countryCode: "DEU",
      rarity: 0.5,
      validAnswers,
    });
    expect(state.status).toBe("lost");
    expect(state.remainingLives).toBe(5);
    expect(state.finishedAt).not.toBeNull();
    expect(
      Object.values(state.cells).filter((c) => c.status === "blocked"),
    ).toHaveLength(7);
  });

  it("stays playing when empty cells still have unused valid answers", () => {
    const validAnswers = {
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
    const state = gameReducer(freshState(), {
      type: "guessSuccess",
      cell: { row: 0, col: 0 },
      countryCode: "FRA",
      rarity: 0.5,
      validAnswers,
    });
    expect(state.status).toBe("playing");
    expect(state.finishedAt).toBeNull();
  });

  it("is ignored when state is lost", () => {
    let state = freshState();
    state = gameReducer(state, { type: "guessFailure" });
    state = gameReducer(state, { type: "guessFailure" });
    state = gameReducer(state, { type: "guessFailure" });
    state = gameReducer(state, { type: "guessFailure" });
    state = gameReducer(state, { type: "guessFailure" });
    expect(state.status).toBe("lost");

    const stateAfter = gameReducer(state, {
      type: "guessSuccess",
      cell: { row: 0, col: 0 },
      countryCode: "FRA",
      rarity: 0.5,
      validAnswers: emptyValidAnswers,
    });
    expect(stateAfter).toBe(state);
  });
});

describe("gameReducer — guessFailure", () => {
  it("decrements remainingLives", () => {
    const state = gameReducer(freshState(), { type: "guessFailure" });
    expect(state.remainingLives).toBe(4);
  });

  it("transitions to lost after 5 consecutive failures", () => {
    let state = freshState();
    state = gameReducer(state, { type: "guessFailure" });
    state = gameReducer(state, { type: "guessFailure" });
    state = gameReducer(state, { type: "guessFailure" });
    state = gameReducer(state, { type: "guessFailure" });
    state = gameReducer(state, { type: "guessFailure" });
    expect(state.status).toBe("lost");
    expect(state.finishedAt).not.toBeNull();
  });
});

describe("gameReducer — rehydrate", () => {
  function makePersistedGame(): PersistedGame {
    return {
      version: 1,
      date: "2026-04-15",
      cells: {
        "0,0": {
          status: "filled",
          countryCode: "FRA",
          rarity: 0.4,
          rarityTier: "uncommon",
        },
        "0,1": { status: "empty" },
        "0,2": { status: "empty" },
        "1,0": { status: "empty" },
        "1,1": { status: "empty" },
        "1,2": { status: "empty" },
        "2,0": { status: "empty" },
        "2,1": { status: "empty" },
        "2,2": { status: "empty" },
      },
      remainingLives: 2,
      usedCountries: ["FRA"],
      status: "playing",
      startedAt: 1713139200000,
      finishedAt: null,
    };
  }

  it("restores all fields from persisted data, using rows/cols from action", () => {
    const persisted = makePersistedGame();
    const state = gameReducer(freshState(), {
      type: "rehydrate",
      persisted,
      rows: ["borders_china", "borders_brazil", "borders_russia"],
      cols: ["population_more_canada", "area_larger_france", "flag_has_star"],
      validAnswers: emptyValidAnswers,
    });
    expect(state.date).toBe("2026-04-15");
    expect(state.rows).toEqual([
      "borders_china",
      "borders_brazil",
      "borders_russia",
    ]);
    expect(state.cols).toEqual([
      "population_more_canada",
      "area_larger_france",
      "flag_has_star",
    ]);
    expect(state.remainingLives).toBe(2);
    expect(state.status).toBe("playing");
    expect(state.cells["0,0"].status).toBe("filled");
    expect(state.selectedCell).toBeNull();
    expect(state.startedAt).toBe(1713139200000);
    expect(state.finishedAt).toBeNull();
  });

  it("deserialises usedCountries as a Set", () => {
    const persisted = makePersistedGame();
    const state = gameReducer(freshState(), {
      type: "rehydrate",
      persisted,
      rows: ["borders_china", "borders_brazil", "borders_russia"],
      cols: ["population_more_canada", "area_larger_france", "flag_has_star"],
      validAnswers: emptyValidAnswers,
    });
    expect(state.usedCountries).toBeInstanceOf(Set);
    expect(state.usedCountries.has("FRA")).toBe(true);
    expect(state.usedCountries.size).toBe(1);
  });

  it("rehydrates blocked cells and stays playing when empty cells remain", () => {
    const persisted = makePersistedGame();
    persisted.cells["0,1"] = {
      status: "filled",
      countryCode: "DEU",
      rarity: 0.4,
      rarityTier: "uncommon",
    };
    persisted.usedCountries = ["FRA", "DEU"];
    const validAnswers = {
      ...emptyValidAnswers,
      "0,2": ["FRA", "DEU"],
    };
    const state = gameReducer(freshState(), {
      type: "rehydrate",
      persisted,
      rows: ["borders_china", "borders_brazil", "borders_russia"],
      cols: ["population_more_canada", "area_larger_france", "flag_has_star"],
      validAnswers,
    });
    expect(state.status).toBe("playing");
    expect(state.cells["0,2"].status).toBe("blocked");
    expect(state.remainingLives).toBe(2);
    expect(state.finishedAt).toBeNull();
  });

  it("rehydrates to lost when no empty cells remain after marking blocked", () => {
    const persisted = makePersistedGame();
    persisted.cells["0,1"] = {
      status: "filled",
      countryCode: "DEU",
      rarity: 0.4,
      rarityTier: "uncommon",
    };
    persisted.usedCountries = ["FRA", "DEU"];
    const validAnswers = {
      "0,0": ["FRA"],
      "0,1": ["DEU"],
      "0,2": ["FRA", "DEU"],
      "1,0": ["FRA"],
      "1,1": ["DEU"],
      "1,2": ["FRA", "DEU"],
      "2,0": ["FRA"],
      "2,1": ["DEU"],
      "2,2": ["FRA", "DEU"],
    };
    const state = gameReducer(freshState(), {
      type: "rehydrate",
      persisted,
      rows: ["borders_china", "borders_brazil", "borders_russia"],
      cols: ["population_more_canada", "area_larger_france", "flag_has_star"],
      validAnswers,
    });
    expect(state.status).toBe("lost");
    expect(state.remainingLives).toBe(2);
    expect(state.finishedAt).toBe(persisted.startedAt);
  });
});
