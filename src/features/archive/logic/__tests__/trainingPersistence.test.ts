import { beforeEach, describe, expect, it } from "vitest";
import { CELL_KEYS } from "@/features/game/logic/gridTopology";
import { createInitialState } from "@/features/game/logic/reducer";
import type { GameState } from "@/features/game/types";
import { STORAGE_KEYS } from "@/lib/storage";
import {
  clearTrainingGame,
  loadTrainingGame,
  loadTrainingGames,
  saveTrainingGame,
} from "../trainingPersistence";

const TODAY = "2026-07-25";
const ROWS = [
  "continent_europe",
  "continent_asia",
  "continent_africa",
] as const;
const COLS = ["water_landlocked", "water_island", "borders_min_5"] as const;

function trainingState(date: string): GameState {
  return createInitialState("training", date, [...ROWS], [...COLS]);
}

beforeEach(() => {
  localStorage.clear();
});

describe("saveTrainingGame / loadTrainingGame", () => {
  it("relit une partie d'entraînement avec ses cases et ses essais", () => {
    const state = trainingState("2026-07-24");
    state.cells["0,0"] = { status: "filled", countryCode: "FRA" };
    state.lives = { kind: "unlimited", failedAttempts: 4 };
    saveTrainingGame(state, TODAY);

    const loaded = loadTrainingGame("2026-07-24", TODAY);
    expect(loaded?.failedAttempts).toBe(4);
    expect(loaded?.cells["0,0"]).toEqual({
      status: "filled",
      countryCode: "FRA",
    });
  });

  it("garde les parties de plusieurs dates côte à côte", () => {
    saveTrainingGame(trainingState("2026-07-24"), TODAY);
    saveTrainingGame(trainingState("2026-07-20"), TODAY);
    expect(
      loadTrainingGames(TODAY)
        .map((g) => g.date)
        .sort(),
    ).toEqual(["2026-07-20", "2026-07-24"]);
  });

  it("remplace la partie de la même date au lieu de l'empiler", () => {
    const first = trainingState("2026-07-24");
    first.lives = { kind: "unlimited", failedAttempts: 1 };
    saveTrainingGame(first, TODAY);

    const second = trainingState("2026-07-24");
    second.lives = { kind: "unlimited", failedAttempts: 6 };
    saveTrainingGame(second, TODAY);

    const games = loadTrainingGames(TODAY);
    expect(games).toHaveLength(1);
    expect(games[0].failedAttempts).toBe(6);
  });

  it("ne persiste rien tant que la grille n'est pas chargée (date vide)", () => {
    saveTrainingGame(trainingState(""), TODAY);
    expect(loadTrainingGames(TODAY)).toHaveLength(0);
  });
});

describe("loadTrainingGames — purge de la fenêtre", () => {
  it("écarte et purge les dates sorties de l'archive", () => {
    saveTrainingGame(trainingState("2026-07-24"), TODAY);
    saveTrainingGame(trainingState("2026-07-10"), TODAY);

    expect(loadTrainingGames(TODAY).map((g) => g.date)).toEqual(["2026-07-24"]);
    // La purge est réécrite : la date périmée a bien disparu du stockage.
    expect(localStorage.getItem(STORAGE_KEYS.training)).not.toContain(
      "2026-07-10",
    );
  });

  it("écarte une date future glissée dans le stockage", () => {
    saveTrainingGame(trainingState("2026-07-26"), TODAY);
    expect(loadTrainingGames(TODAY)).toHaveLength(0);
  });
});

describe("loadTrainingGames — stockage douteux", () => {
  it("renvoie une liste vide sur un JSON corrompu", () => {
    localStorage.setItem(STORAGE_KEYS.training, "{nope");
    expect(loadTrainingGames(TODAY)).toEqual([]);
  });

  it("ignore un stockage d'une autre version", () => {
    localStorage.setItem(
      STORAGE_KEYS.training,
      JSON.stringify({ version: 99, games: [{ date: "2026-07-24" }] }),
    );
    expect(loadTrainingGames(TODAY)).toEqual([]);
  });

  it("écarte les entrées mal formées sans jeter les bonnes", () => {
    localStorage.setItem(
      STORAGE_KEYS.training,
      JSON.stringify({
        version: 1,
        games: [
          { date: "2026-07-24", cells: {}, failedAttempts: -3 },
          { date: "2026-07-23", cells: {}, failedAttempts: 2 },
          { date: "2026-07-22", failedAttempts: 1 },
        ],
      }),
    );
    expect(loadTrainingGames(TODAY).map((g) => g.date)).toEqual(["2026-07-23"]);
  });
});

describe("clearTrainingGame", () => {
  it("oublie la partie visée en laissant les autres intactes", () => {
    saveTrainingGame(trainingState("2026-07-24"), TODAY);
    saveTrainingGame(trainingState("2026-07-23"), TODAY);

    clearTrainingGame("2026-07-24", TODAY);

    expect(loadTrainingGame("2026-07-24", TODAY)).toBeNull();
    expect(loadTrainingGame("2026-07-23", TODAY)).not.toBeNull();
  });

  it("laisse le stockage borné au nombre de cases de la grille", () => {
    // Garde-fou de non-régression : la forme persistée reste une grille 3×3.
    const state = trainingState("2026-07-24");
    saveTrainingGame(state, TODAY);
    expect(
      Object.keys(loadTrainingGame("2026-07-24", TODAY)?.cells ?? {}),
    ).toHaveLength(CELL_KEYS.length);
  });
});
