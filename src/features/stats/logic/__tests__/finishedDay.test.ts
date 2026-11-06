import { describe, expect, it } from "vitest";
import { blockableAnswers, sanitizeFinishedDay } from "../finishedDay";

const NINE = ["A", "B", "C", "D", "E", "F", "G", "H", "I"].map(
  (letter) => `${letter}AA`,
);

describe("blockableAnswers", () => {
  it("garde une case de 8 réponses", () => {
    const answers = blockableAnswers({ "0,0": NINE.slice(0, 8) });
    expect(answers["0,0"]).toHaveLength(8);
  });

  it("écarte une case de 9 réponses, qui ne se bloque jamais", () => {
    expect(blockableAnswers({ "0,0": NINE })).toEqual({});
  });
});

describe("sanitizeFinishedDay", () => {
  const valid = {
    date: "2026-11-01",
    rows: ["a", "b", "c"],
    cols: ["d", "e", "f"],
    counts: { "0,0": { FRA: 3 } },
    blockableAnswers: { "0,0": ["FRA"] },
  };

  it("relit un jour valide", () => {
    expect(sanitizeFinishedDay(valid)).toEqual(valid);
  });

  it("écarte un compte qui n'est pas entier", () => {
    expect(
      sanitizeFinishedDay({ ...valid, counts: { "0,0": { FRA: 1.5 } } }),
    ).toBeNull();
  });

  it("écarte une réponse qui n'est pas un ISO3", () => {
    expect(
      sanitizeFinishedDay({ ...valid, blockableAnswers: { "0,0": ["fr"] } }),
    ).toBeNull();
  });
});
