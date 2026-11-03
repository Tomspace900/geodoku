import { describe, expect, it } from "vitest";
import { parseJsonl, toJsonl, transformExport } from "../eu-migration";

const guess = (
  date: string,
  cellKey: string,
  countryCode: string,
  count: number,
  isReplay = false,
) => ({
  _id: `g-${date}-${cellKey}-${countryCode}`,
  date,
  cellKey,
  countryCode,
  count,
  isReplay,
});

describe("transformExport", () => {
  it("regroupe les guesses en un cellStats par case et par jour", () => {
    const { tables } = transformExport({
      guesses: [
        guess("2026-10-01", "0,0", "FRA", 3),
        guess("2026-10-01", "0,0", "DEU", 1),
        guess("2026-10-01", "1,1", "FRA", 2),
      ],
    });
    expect(tables.cellStats).toEqual([
      { date: "2026-10-01", cellKey: "0,0", counts: { FRA: 3, DEU: 1 } },
      { date: "2026-10-01", cellKey: "1,1", counts: { FRA: 2 } },
    ]);
  });

  it("écarte les rejeux et les cases hors grille sans perdre de compte valide", () => {
    const { report } = transformExport({
      guesses: [
        guess("2026-10-01", "0,0", "FRA", 3),
        guess("2026-10-01", "0,0", "ESP", 99, true),
        guess("2026-10-01", "9,9", "FRA", 5),
      ],
    });
    expect([
      report.skippedGuesses,
      report.guessCountBefore,
      report.guessCountAfter,
    ]).toEqual([2, 3, 3]);
  });

  it("retire les champs legacy du pool et des grilles en gardant les identifiants", () => {
    const { tables } = transformExport({
      grids: [
        { _id: "g1", _creationTime: 1, date: "2026-10-01", difficulty: 3 },
      ],
      gridCandidates: [
        {
          _id: "c1",
          metadata: {
            seedConstraint: "x",
            difficultyEstimate: 2,
            cellDifficulties: [1],
          },
        },
      ],
    });
    expect([tables.grids[0], tables.gridCandidates[0]]).toEqual([
      { _id: "g1", _creationTime: 1, date: "2026-10-01" },
      { _id: "c1", metadata: { seedConstraint: "x" } },
    ]);
  });

  it("archive dailyStats et gridFeedback hors de l'import", () => {
    const output = transformExport({
      dailyStats: [{ _id: "d1", date: "2026-10-01", totalGuesses: 4 }],
      gridFeedback: [{ _id: "f1", date: "2026-10-01", wins: 2 }],
      operationReceipts: [{ _id: "r1" }],
    });
    expect({
      imported: Object.keys(output.tables).sort(),
      archived: output.adminStats.tables,
    }).toEqual({
      imported: [
        "cellStats",
        "gridAnswers",
        "gridCandidates",
        "grids",
        "poolState",
      ],
      archived: {
        dailyStats: [{ date: "2026-10-01", totalGuesses: 4 }],
        gridFeedback: [{ date: "2026-10-01", wins: 2 }],
      },
    });
  });

  it("refuse un export qui contient une table inconnue", () => {
    expect(() => transformExport({ players: [] })).toThrow("players");
  });
});

describe("jsonl", () => {
  it("relit ce qu'il écrit", () => {
    const docs = [{ a: 1 }, { b: "x" }];
    expect(parseJsonl(toJsonl(docs))).toEqual(docs);
  });
});
