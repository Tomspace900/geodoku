import { describe, expect, it } from "vitest";
import {
  applyMove,
  emptyGameRecord,
  type GameRecord,
  recordCells,
  recordMoveCount,
  recordStatus,
} from "../gameRecord";

const ANSWERS: Record<string, string[]> = {
  "0,0": ["FRA", "DEU"],
  "0,1": ["ITA"],
  "0,2": ["ESP"],
  "1,0": ["PRT"],
  "1,1": ["BEL"],
  "1,2": ["NLD"],
  "2,0": ["AUT"],
  "2,1": ["CHE"],
  "2,2": ["FRA"],
};

function withCells(codes: (string | null)[], failed?: number[]): GameRecord {
  return { cells: codes, failed: failed ?? emptyGameRecord().failed };
}

describe("applyMove", () => {
  it("remplit la case pour un pays des réponses publiées", () => {
    const outcome = applyMove(emptyGameRecord(), "0,0", "FRA", ANSWERS);
    expect(outcome.kind === "success" && outcome.record.cells[0]).toBe("FRA");
  });

  it("compte une erreur sur la case pour un pays hors réponses", () => {
    const outcome = applyMove(emptyGameRecord(), "0,1", "FRA", ANSWERS);
    expect(outcome.kind === "failure" && outcome.record.failed[1]).toBe(1);
  });

  it("compte une erreur pour un pays déjà posé ailleurs", () => {
    const record = withCells([
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      "FRA",
    ]);
    expect(applyMove(record, "0,0", "FRA", ANSWERS).kind).toBe("failure");
  });

  it("refuse une case déjà remplie", () => {
    const record = withCells([
      "DEU",
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
    expect(applyMove(record, "0,0", "FRA", ANSWERS)).toEqual({
      kind: "refused",
      reason: "cell_unavailable",
    });
  });

  it("refuse tout coup une fois les vies épuisées", () => {
    const record = withCells(
      emptyGameRecord().cells,
      [5, 0, 0, 0, 0, 0, 0, 0, 0],
    );
    expect(applyMove(record, "0,0", "FRA", ANSWERS)).toEqual({
      kind: "refused",
      reason: "game_over",
    });
  });
});

describe("recordStatus", () => {
  it("gagne une grille pleine", () => {
    const record = withCells([
      "DEU",
      "ITA",
      "ESP",
      "PRT",
      "BEL",
      "NLD",
      "AUT",
      "CHE",
      "FRA",
    ]);
    expect(recordStatus(record, ANSWERS)).toBe("won");
  });

  it("perd une grille dont la dernière case vide est bloquée", () => {
    // FRA, seule réponse de 0,0, est déjà posé en 2,2.
    const answers = { ...ANSWERS, "0,0": ["FRA"] };
    const record = withCells([
      null,
      "ITA",
      "ESP",
      "PRT",
      "BEL",
      "NLD",
      "AUT",
      "CHE",
      "FRA",
    ]);
    expect(recordCells(record, answers)["0,0"].status).toBe("blocked");
    expect(recordStatus(record, answers)).toBe("lost");
  });
});

describe("recordMoveCount", () => {
  it("additionne cases remplies et erreurs", () => {
    const record = withCells(
      ["DEU", null, null, null, null, null, null, null, null],
      [0, 2, 0, 0, 0, 0, 0, 0, 1],
    );
    expect(recordMoveCount(record)).toBe(4);
  });
});
