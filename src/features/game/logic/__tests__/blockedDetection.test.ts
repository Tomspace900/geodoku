import { describe, expect, it } from "vitest";
import type { Cell, CellKey } from "../../types";
import { findBlockedEmptyCells } from "../blockedDetection";

const CELL_KEYS: CellKey[] = [
  "0,0",
  "0,1",
  "0,2",
  "1,0",
  "1,1",
  "1,2",
  "2,0",
  "2,1",
  "2,2",
];

function emptyCells(): Record<CellKey, Cell> {
  return Object.fromEntries(
    CELL_KEYS.map((k) => [k, { status: "empty" as const }]),
  ) as Record<CellKey, Cell>;
}

describe("findBlockedEmptyCells", () => {
  it("returns empty when an empty cell still has an unused valid answer", () => {
    const cells = emptyCells();
    cells["0,0"] = {
      status: "filled",
      countryCode: "FRA",
      rarity: 0.5,
      rarityTier: "common",
    };
    const validAnswers = {
      "0,0": ["FRA"],
      "0,1": ["DEU", "ESP"],
      "0,2": ["ITA"],
      "1,0": ["PRT"],
      "1,1": ["NLD"],
      "1,2": ["BEL"],
      "2,0": ["AUT"],
      "2,1": ["CHE"],
      "2,2": ["POL"],
    };
    const used = new Set(["FRA"]);

    expect(findBlockedEmptyCells(cells, validAnswers, used)).toEqual([]);
  });

  it("returns the blocked empty cell when all its valid answers are used", () => {
    const cells = emptyCells();
    cells["0,0"] = {
      status: "filled",
      countryCode: "FRA",
      rarity: 0.5,
      rarityTier: "common",
    };
    cells["0,1"] = {
      status: "filled",
      countryCode: "DEU",
      rarity: 0.5,
      rarityTier: "common",
    };
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
    const used = new Set(["FRA", "DEU"]);

    expect(findBlockedEmptyCells(cells, validAnswers, used)).toEqual(["0,2"]);
  });

  it("ignores filled cells even if their valid answers are all used elsewhere", () => {
    const cells = emptyCells();
    cells["0,0"] = {
      status: "filled",
      countryCode: "FRA",
      rarity: 0.5,
      rarityTier: "common",
    };
    const validAnswers = {
      "0,0": ["FRA"],
      "0,1": ["DEU"],
      "0,2": ["ITA"],
      "1,0": ["PRT"],
      "1,1": ["NLD"],
      "1,2": ["BEL"],
      "2,0": ["AUT"],
      "2,1": ["CHE"],
      "2,2": ["POL"],
    };
    const used = new Set(["FRA"]);

    expect(findBlockedEmptyCells(cells, validAnswers, used)).toEqual([]);
  });

  it("returns empty for a fully filled grid", () => {
    const cells = emptyCells();
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
    CELL_KEYS.forEach((k, i) => {
      cells[k] = {
        status: "filled",
        countryCode: codes[i],
        rarity: 0.5,
        rarityTier: "common",
      };
    });
    const validAnswers = Object.fromEntries(
      CELL_KEYS.map((k, i) => [k, [codes[i]]]),
    );
    const used = new Set(codes);

    expect(findBlockedEmptyCells(cells, validAnswers, used)).toEqual([]);
  });

  it("ignores empty cells with no validAnswers entry", () => {
    const cells = emptyCells();
    const used = new Set<string>();

    expect(findBlockedEmptyCells(cells, {}, used)).toEqual([]);
  });
});
