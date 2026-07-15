import { describe, expect, it } from "vitest";
import { CELL_KEYS } from "../cellKeys";
import { getGridContentIssue } from "./gridContentCompatibility";

const ACTIVE_ROWS = ["continent_europe", "continent_asia", "continent_africa"];
const ACTIVE_COLS = ["language_english", "water_landlocked", "flag_has_star"];
const DISTINCT_COUNTRIES = [
  "FRA",
  "DEU",
  "ITA",
  "ESP",
  "PRT",
  "BEL",
  "NLD",
  "AUT",
  "POL",
];

function compatibleGrid() {
  return {
    rows: ACTIVE_ROWS,
    cols: ACTIVE_COLS,
    validAnswers: Object.fromEntries(
      CELL_KEYS.map((key, index) => [key, [DISTINCT_COUNTRIES[index]]]),
    ),
  };
}

describe("getGridContentIssue", () => {
  it("accepts current constraints and rejects an archived constraint", () => {
    const current = compatibleGrid();
    const archived = {
      ...current,
      rows: ["flag_two_colors", ...current.rows.slice(1)],
    };

    expect([
      getGridContentIssue(current),
      getGridContentIssue(archived),
    ]).toEqual([null, "constraint"]);
  });

  it("rejects a country absent from the compact catalog", () => {
    const grid = compatibleGrid();
    grid.validAnswers["0,0"] = ["ZZZ"];

    expect(getGridContentIssue(grid)).toBe("country");
  });

  it("rejects nine cells without a perfect nine-country matching", () => {
    const grid = compatibleGrid();
    grid.validAnswers = Object.fromEntries(
      CELL_KEYS.map((key) => [key, ["FRA"]]),
    );

    expect(getGridContentIssue(grid)).toBe("matching");
  });
});
